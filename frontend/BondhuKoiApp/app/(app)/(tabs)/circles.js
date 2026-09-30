import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { CircleDot, MapPin, Plus } from 'lucide-react-native';
import { Screen, Header, Button, Card, Text, AvatarStack, Section, EmptyState, SkeletonList, ErrorState, IconTile, StatusPill } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useCircles, useInvitations, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';

function CircleCard({ circle }) {
  const { c, space } = useTheme();
  return (
    <Card padded={false} onPress={() => router.push(`/circle/${circle.id}`)} accessibilityLabel={`${circle.name}, ${circle.hereCount} here now`}>
      {circle.snapshotUrl ? (
        <Image source={{ uri: circle.snapshotUrl }} style={{ height: 112, backgroundColor: c.sunken }} resizeMode="cover" />
      ) : null}
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          {circle.snapshotUrl ? null : <IconTile icon={circle.hasZone ? MapPin : CircleDot} />}
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {circle.name}
            </Text>
            <Text variant="secondary" tone="muted" numberOfLines={1}>
              {circle.locationLabel || (circle.hasZone ? 'Zone set' : 'No zone yet')}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AvatarStack people={circle.members} total={circle.memberCount} />
          {circle.hereCount ? (
            <StatusPill state="here" label={`${circle.hereCount} here now`} />
          ) : (
            <Text variant="caption" tone="faint">
              {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function Invitation({ circle }) {
  const { space } = useTheme();
  const invalidate = [keys.circles, keys.invitations, keys.notifications];
  const accept = useAction(() => api(`/api/circles/${circle.id}/accept`, { method: 'POST' }), { invalidate, success: `You joined ${circle.name}.` });
  const decline = useAction(() => api(`/api/circles/${circle.id}/decline`, { method: 'POST' }), { invalidate });
  return (
    <Card>
      <Text variant="heading">{circle.name}</Text>
      <Text variant="secondary" tone="muted">
        {circle.invitedBy ? `${circle.invitedBy.name} invited you` : 'You’re invited'} · {circle.memberCount} in it
      </Text>
      <Text variant="secondary" tone="muted" style={{ marginTop: space.sm }}>
        Members will see when you’re in this circle’s zone. You can turn that off any time.
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <Button title="Join" size="sm" full={false} onPress={() => accept.mutate()} loading={accept.isPending} />
        <Button title="No thanks" size="sm" variant="secondary" full={false} onPress={() => decline.mutate()} loading={decline.isPending} />
      </View>
    </Card>
  );
}

export default function Circles() {
  const { space } = useTheme();
  const circles = useCircles();
  const invitations = useInvitations();
  const list = circles.data?.circles || [];
  const invites = invitations.data?.invitations || [];

  return (
    <Screen onRefresh={() => Promise.all([circles.refetch(), invitations.refetch()])} refreshing={circles.isRefetching}>
      <Header title="Circles" right={list.length ? <Button title="New" icon={Plus} size="sm" full={false} onPress={() => router.push('/circle/new')} /> : null} />
      {invites.length ? (
        <Section title="Invitations" style={{ marginTop: 0, marginBottom: space.lg }}>
          <View style={{ gap: space.md }}>
            {invites.map((c) => (
              <Invitation key={c.id} circle={c} />
            ))}
          </View>
        </Section>
      ) : null}
      {circles.isLoading ? (
        <SkeletonList rows={2} />
      ) : circles.error ? (
        <ErrorState error={circles.error} onRetry={circles.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CircleDot}
          title="Make your first circle"
          message="A circle is a small group with a place: your thesis group at the lab, your friends at the library. Members see who’s there."
          action="New circle"
          onAction={() => router.push('/circle/new')}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {list.map((c) => (
            <CircleCard key={c.id} circle={c} />
          ))}
        </View>
      )}
    </Screen>
  );
}
