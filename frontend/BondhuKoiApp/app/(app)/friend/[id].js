import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, Ban, Flag, UserMinus, MessageCircle, AtSign } from 'lucide-react-native';
import { Screen, Header, Avatar, Text, StatusPill, presenceLabel, Card, Button, RowGroup, ListRow, IconTile, Sheet, useConfirm, SkeletonList } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useFriends, useConfig, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { timeAgo } from '../../../src/lib/format';
import { ReportSheet } from '../../../src/components/ReportSheet';

function WatchCard({ friend }) {
  const { space } = useTheme();
  const [open, setOpen] = useState(false);
  const first = friend.name.split(' ')[0];
  const invalidate = [keys.friends, keys.watches];
  const ask = useAction((scope) => api('/api/watches', { method: 'POST', body: { userId: friend.id, scope } }), {
    invalidate,
    success: `Asked ${first}. Alerts start when they say yes.`,
    onSuccess: () => setOpen(false),
  });
  const stop = useAction(() => api(`/api/watches/${friend.watch.id}`, { method: 'DELETE' }), { invalidate, success: 'Alerts stopped.' });

  const w = friend.watch;
  const text = !w
    ? `Get a notification when ${first} arrives on or leaves campus. ${first} has to say yes.`
    : w.status === 'pending'
      ? `Waiting for ${first} to say yes.`
      : w.scope === 'all'
        ? `You’ll hear when ${first} arrives or leaves campus and your shared circles.`
        : `You’ll hear when ${first} arrives on or leaves campus.`;

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <IconTile icon={BellRing} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">Arrival alerts</Text>
          <Text variant="secondary" tone="muted">
            {text}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: space.md }}>
        {!w ? (
          <Button title="Ask for alerts" size="sm" variant="secondary" onPress={() => setOpen(true)} />
        ) : (
          <Button title={w.status === 'pending' ? 'Cancel request' : 'Stop alerts'} size="sm" variant="secondary" onPress={() => stop.mutate()} loading={stop.isPending} />
        )}
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title={`Alerts for ${first}`} subtitle={`${first} will be asked first and can stop it any time.`}>
        <RowGroup>
          <ListRow title="Campus only" subtitle={`When ${first} arrives on or leaves campus.`} onPress={() => ask.mutate('campus')} />
          <ListRow title="Campus and our circles" subtitle="Also the circles you’re both in." onPress={() => ask.mutate('all')} />
        </RowGroup>
      </Sheet>
    </Card>
  );
}

export default function FriendScreen() {
  const { c, space } = useTheme();
  const { id } = useLocalSearchParams();
  const friends = useFriends();
  const { data: cfg } = useConfig();
  const [confirm, dialog] = useConfirm();
  const [reporting, setReporting] = useState(false);
  const friend = friends.data?.friends.find((f) => f.id === id);
  const first = friend?.name.split(' ')[0];

  const remove = useAction(() => api(`/api/friends/${id}`, { method: 'DELETE' }), { invalidate: [keys.friends], success: 'Removed.', onSuccess: () => router.back() });
  const block = useAction(() => api('/api/blocks', { method: 'POST', body: { userId: id } }), { invalidate: [keys.friends, keys.circles], success: 'Blocked.', onSuccess: () => router.back() });

  if (!friend) {
    return (
      <Screen>
        <Header back title="" />
        {friends.isLoading ? <SkeletonList rows={2} /> : <Text tone="muted">This person isn’t in your friends any more.</Text>}
      </Screen>
    );
  }

  const p = presenceLabel(friend.presence);
  return (
    <Screen>
      <Header back title="" />
      <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.xl }}>
        <Avatar name={friend.name} url={friend.avatarUrl} size={88} />
        <Text variant="title" style={{ marginTop: space.sm }}>
          {friend.name}
        </Text>
        <Text variant="secondary" tone="muted">
          {friend.university}
        </Text>
        <StatusPill state={p.state} label={p.label} size="lg" />
        {friend.presence.updatedAt ? (
          <Text variant="caption" tone="faint">
            Updated {timeAgo(friend.presence.updatedAt)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        {friend.facebook || friend.instagram ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {friend.facebook ? (
              <Button title="Messenger" icon={MessageCircle} variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://m.me/${friend.facebook}`)} />
            ) : null}
            {friend.instagram ? (
              <Button title="Instagram" icon={AtSign} variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://instagram.com/${friend.instagram}`)} />
            ) : null}
          </View>
        ) : null}
        {cfg?.features?.watch !== false ? <WatchCard friend={friend} /> : null}
        <RowGroup>
          <ListRow
            leading={<UserMinus size={20} color={c.ink} />}
            title="Remove friend"
            chevron={false}
            onPress={async () =>
              (await confirm({ title: `Remove ${first}?`, message: 'You’ll stop seeing each other’s status. Alerts between you stop too.', confirmLabel: 'Remove', danger: true })) && remove.mutate()
            }
          />
          <ListRow
            leading={<Ban size={20} color={c.danger} />}
            title="Block"
            tone="danger"
            chevron={false}
            onPress={async () =>
              (await confirm({
                title: `Block ${first}?`,
                message: `${first} won’t be able to find you, add you, or see you, including in circles you share. They aren’t told.`,
                confirmLabel: 'Block',
                danger: true,
              })) && block.mutate()
            }
          />
          <ListRow leading={<Flag size={20} color={c.danger} />} title="Report" tone="danger" chevron={false} onPress={() => setReporting(true)} />
        </RowGroup>
      </View>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} target={{ userId: friend.id, name: friend.name }} />
      {dialog}
    </Screen>
  );
}
