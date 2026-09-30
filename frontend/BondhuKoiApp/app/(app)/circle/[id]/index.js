import { useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircle, MoreHorizontal, UserPlus, MapPin, Pencil, Trash2, LogOut, Flag, Shield, UserMinus, Radar } from 'lucide-react-native';
import { Screen, Header, IconButton, Text, Card, Button, Section, RowGroup, ListRow, SwitchRow, Avatar, StatusPill, Sheet, Input, useConfirm, useToast, SkeletonList, ErrorState } from '../../../../src/ui';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useCircle, useCircleActivity, useFriends, useMe, useAction, keys } from '../../../../src/lib/queries';
import { api } from '../../../../src/lib/api';
import { timeAgo } from '../../../../src/lib/format';
import { ReportSheet } from '../../../../src/components/ReportSheet';
import { FriendPicker } from '../../../../src/components/FriendPicker';

function EditSheet({ visible, onClose, circle }) {
  const { space } = useTheme();
  const [form, setForm] = useState({ name: circle.name, description: circle.description, locationLabel: circle.locationLabel || '', messengerLink: circle.messengerLink || '' });
  const save = useAction(() => api(`/api/circles/${circle.id}`, { method: 'PATCH', body: { ...form, locationLabel: form.locationLabel || null, messengerLink: form.messengerLink || null } }), {
    invalidate: [keys.circle(circle.id), keys.circles],
    success: 'Saved.',
    onSuccess: onClose,
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Sheet visible={visible} onClose={onClose} title="Edit circle" footer={<Button title="Save" onPress={() => save.mutate()} loading={save.isPending} />}>
      <View style={{ gap: space.lg }}>
        <Input label="Name" value={form.name} onChangeText={set('name')} maxLength={60} />
        <Input label="Place (optional)" placeholder="e.g. Library, 3rd floor" value={form.locationLabel} onChangeText={set('locationLabel')} maxLength={80} />
        <Input label="Description (optional)" value={form.description} onChangeText={set('description')} maxLength={280} multiline />
        <Input label="Group chat link (optional)" placeholder="https://m.me/j/…" value={form.messengerLink} onChangeText={set('messengerLink')} autoCapitalize="none" keyboardType="url" hint="Messenger, WhatsApp, Telegram or Discord." />
      </View>
    </Sheet>
  );
}

export default function CircleScreen() {
  const { c, space, radius } = useTheme();
  const { id } = useLocalSearchParams();
  const circle = useCircle(id);
  const activity = useCircleActivity(id);
  const friends = useFriends();
  const { data: meData } = useMe();
  const [confirm, dialog] = useConfirm();
  const toast = useToast();
  const client = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [member, setMember] = useState(null);

  const invalidate = [keys.circle(id), keys.circles];
  const detection = useAction((on) => api(`/api/circles/${id}/me`, { method: 'PATCH', body: { detectionEnabled: on } }), {
    invalidate,
    success: (_, on) => (on ? 'Members can see when you’re here.' : 'This circle can’t see when you’re here.'),
  });
  const invite = useAction((userIds) => api(`/api/circles/${id}/members`, { method: 'POST', body: { userIds } }), {
    invalidate,
    success: (r) => (r.invited ? `Invited ${r.invited}.` : 'They’re already in the circle.'),
    onSuccess: () => setInviting(false),
  });
  const removeCircle = useAction(() => api(`/api/circles/${id}`, { method: 'DELETE' }), { invalidate: [keys.circles], success: 'Circle deleted.', onSuccess: () => router.back() });
  const memberAction = useAction(({ userId, method, body }) => api(`/api/circles/${id}/members/${userId}`, { method, body }), { invalidate, onSuccess: () => setMember(null) });

  if (circle.isLoading) {
    return (
      <Screen>
        <Header back title="" />
        <SkeletonList />
      </Screen>
    );
  }
  if (circle.error || !circle.data) {
    return (
      <Screen>
        <Header back title="" />
        <ErrorState error={circle.error} onRetry={circle.refetch} />
      </Screen>
    );
  }

  const { circle: info, me, members } = circle.data;
  const admin = me.role === 'admin';
  const pending = me.status === 'pending';
  const active = members.filter((m) => m.status === 'active');
  const here = active.filter((m) => m.here);
  const invited = members.filter((m) => m.status === 'pending');
  const canInvite = admin || info.membersCanInvite;
  const myId = meData?.user.id;

  const leaveNow = async () => {
    const ok = await confirm({ title: `Leave ${info.name}?`, message: admin ? 'If you’re the last admin, the longest-standing member takes over.' : 'You can be invited again later.', confirmLabel: 'Leave', danger: true });
    if (!ok) return;
    try {
      await api(`/api/circles/${id}/members/${myId}`, { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: keys.circles });
      router.back();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Screen onRefresh={() => Promise.all([circle.refetch(), activity.refetch()])} refreshing={circle.isRefetching}>
      <Header back title={info.name} right={pending ? null : <IconButton icon={MoreHorizontal} label="Circle options" onPress={() => setMenu(true)} />} />

      {info.snapshotUrl ? <Image source={{ uri: info.snapshotUrl }} style={{ height: 160, borderRadius: radius.md, backgroundColor: c.sunken, marginBottom: space.lg }} /> : null}
      {info.locationLabel || info.description ? (
        <View style={{ gap: 4, marginBottom: space.lg }}>
          {info.locationLabel ? <Text variant="bodyStrong">{info.locationLabel}</Text> : null}
          {info.description ? (
            <Text variant="secondary" tone="muted">
              {info.description}
            </Text>
          ) : null}
        </View>
      ) : null}

      {pending ? (
        <Card>
          <Text variant="body">You’re invited. Join from the Circles tab to see who’s here.</Text>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          {info.messengerLink ? <Button title="Open group chat" icon={MessageCircle} onPress={() => Linking.openURL(info.messengerLink)} /> : null}
          {!info.hasZone && admin ? <Button title="Set the circle’s zone" icon={MapPin} variant={info.messengerLink ? 'secondary' : 'primary'} onPress={() => router.push(`/circle/${id}/zone`)} /> : null}
          {!info.hasZone && !admin ? (
            <Card>
              <Text variant="secondary" tone="muted">
                No zone yet. Once an admin draws one, members see who’s here.
              </Text>
            </Card>
          ) : null}
        </View>
      )}

      {!pending ? (
        <Section title={`Here now · ${here.length}`}>
          {here.length ? (
            <RowGroup>
              {here.map((m) => (
                <ListRow key={m.id} leading={<Avatar name={m.name} url={m.avatarUrl} />} title={m.name} subtitle={<StatusPill state="here" label="Here" />} />
              ))}
            </RowGroup>
          ) : (
            <Card>
              <Text variant="secondary" tone="muted">
                Nobody is here right now.
              </Text>
            </Card>
          )}
        </Section>
      ) : null}

      <Section title={`Members · ${active.length}`} action={canInvite && !pending ? 'Invite' : undefined} onAction={() => setInviting(true)}>
        <RowGroup>
          {active.map((m) => (
            <ListRow
              key={m.id}
              leading={<Avatar name={m.name} url={m.avatarUrl} size={36} />}
              title={m.name}
              subtitle={m.role === 'admin' ? 'Admin' : undefined}
              onPress={admin && m.id !== myId ? () => setMember(m) : undefined}
            />
          ))}
          {invited.map((m) => (
            <ListRow key={m.id} leading={<Avatar name={m.name} url={m.avatarUrl} size={36} />} title={m.name} subtitle="Invited" onPress={admin ? () => setMember(m) : undefined} />
          ))}
        </RowGroup>
      </Section>

      {!pending && activity.data?.events?.length ? (
        <Section title="Today">
          <RowGroup>
            {activity.data.events.map((e) => (
              <ListRow key={e.id} leading={<Avatar name={e.user.name} url={e.user.avatarUrl} size={32} />} title={`${e.user.name.split(' ')[0]} ${e.kind === 'enter' ? 'arrived' : 'left'}`} value={timeAgo(e.at)} />
            ))}
          </RowGroup>
        </Section>
      ) : null}

      <Sheet visible={menu} onClose={() => setMenu(false)} title={info.name}>
        <RowGroup>
          <SwitchRow
            leading={<Radar size={20} color={c.ink} />}
            title="Show when I’m here"
            subtitle="Members see you in the “Here now” list."
            value={me.detectionEnabled}
            onValueChange={(on) => detection.mutate(on)}
          />
        </RowGroup>
        {admin ? (
          <RowGroup>
            <ListRow leading={<Pencil size={20} color={c.ink} />} title="Edit name, place and chat link" onPress={() => { setMenu(false); setEditing(true); }} />
            <ListRow leading={<MapPin size={20} color={c.ink} />} title={info.hasZone ? 'Redraw the zone' : 'Draw the zone'} onPress={() => { setMenu(false); router.push(`/circle/${id}/zone`); }} />
            {canInvite ? <ListRow leading={<UserPlus size={20} color={c.ink} />} title="Invite friends" onPress={() => { setMenu(false); setInviting(true); }} /> : null}
          </RowGroup>
        ) : null}
        <RowGroup>
          <ListRow leading={<LogOut size={20} color={c.danger} />} title="Leave circle" tone="danger" chevron={false} onPress={() => { setMenu(false); leaveNow(); }} />
          {!admin ? <ListRow leading={<Flag size={20} color={c.danger} />} title="Report circle" tone="danger" chevron={false} onPress={() => { setMenu(false); setReporting(true); }} /> : null}
          {admin ? (
            <ListRow
              leading={<Trash2 size={20} color={c.danger} />}
              title="Delete circle"
              tone="danger"
              chevron={false}
              onPress={async () => {
                setMenu(false);
                if (await confirm({ title: `Delete ${info.name}?`, message: 'This removes it for everyone.', confirmLabel: 'Delete', danger: true })) removeCircle.mutate();
              }}
            />
          ) : null}
        </RowGroup>
      </Sheet>

      <Sheet visible={Boolean(member)} onClose={() => setMember(null)} title={member?.name}>
        {member ? (
          <RowGroup>
            {member.status === 'active' && member.role !== 'admin' ? (
              <ListRow leading={<Shield size={20} color={c.ink} />} title="Make admin" onPress={() => memberAction.mutate({ userId: member.id, method: 'PATCH', body: { role: 'admin' } })} />
            ) : null}
            {member.role === 'admin' ? (
              <ListRow leading={<Shield size={20} color={c.ink} />} title="Remove as admin" onPress={() => memberAction.mutate({ userId: member.id, method: 'PATCH', body: { role: 'member' } })} />
            ) : (
              <ListRow
                leading={<UserMinus size={20} color={c.danger} />}
                title={member.status === 'pending' ? 'Cancel invitation' : 'Remove from circle'}
                tone="danger"
                chevron={false}
                onPress={() => memberAction.mutate({ userId: member.id, method: 'DELETE' })}
              />
            )}
          </RowGroup>
        ) : null}
      </Sheet>

      {editing ? <EditSheet visible onClose={() => setEditing(false)} circle={info} /> : null}
      <FriendPicker
        visible={inviting}
        onClose={() => setInviting(false)}
        title="Invite friends"
        friends={(friends.data?.friends || []).filter((f) => !members.some((m) => m.id === f.id))}
        actionLabel="Invite"
        busy={invite.isPending}
        onDone={(ids) => invite.mutate(ids)}
      />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} target={{ circleId: id, name: info.name }} />
      {dialog}
    </Screen>
  );
}
