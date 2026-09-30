import { View } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Screen, Header, Section, RowGroup, ListRow, Avatar, Button, EmptyState, SkeletonList, ErrorState, Text } from '../../src/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useNotifications, useAction, keys } from '../../src/lib/queries';
import { api } from '../../src/lib/api';
import { timeAgo } from '../../src/lib/format';

const invalidate = [keys.notifications, keys.requests, keys.friends, keys.invitations, keys.circles, keys.watches, keys.visibility];

function Waiting({ item }) {
  const { space } = useTheme();
  const first = item.user?.name?.split(' ')[0] || 'Someone';
  const actions = {
    friend_request: {
      title: `${item.user.name} wants to be friends`,
      subtitle: 'You’ll see each other on campus.',
      yes: () => api(`/api/friends/requests/${item.id}/accept`, { method: 'POST' }),
      no: () => api(`/api/friends/requests/${item.id}`, { method: 'DELETE' }),
      yesLabel: 'Accept',
    },
    watch_request: {
      title: `${first} asked for arrival alerts`,
      subtitle: item.scope === 'all' ? `${first} would be notified when you arrive at or leave campus and your shared circles.` : `${first} would be notified when you arrive at or leave campus.`,
      yes: () => api(`/api/watches/${item.id}/accept`, { method: 'POST' }),
      no: () => api(`/api/watches/${item.id}`, { method: 'DELETE' }),
      yesLabel: 'Allow',
    },
    circle_invite: {
      title: `Join ${item.circle?.name}?`,
      subtitle: item.user ? `${item.user.name} invited you. Members see when you’re in the circle’s place.` : 'Members see when you’re in the circle’s place.',
      yes: () => api(`/api/circles/${item.id}/accept`, { method: 'POST' }),
      no: () => api(`/api/circles/${item.id}/decline`, { method: 'POST' }),
      yesLabel: 'Join',
    },
  }[item.type];
  const yes = useAction(actions.yes, { invalidate, success: 'Done.' });
  const no = useAction(actions.no, { invalidate });
  return (
    <ListRow leading={<Avatar name={item.user?.name || item.circle?.name} url={item.user?.avatarUrl} />} title={actions.title} subtitle={actions.subtitle}>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, alignItems: 'center' }}>
        <Button title={actions.yesLabel} size="sm" full={false} onPress={() => yes.mutate()} loading={yes.isPending} />
        <Button title="No" size="sm" variant="secondary" full={false} onPress={() => no.mutate()} loading={no.isPending} />
        <Text variant="caption" tone="faint" style={{ marginLeft: 'auto' }}>
          {timeAgo(item.at)}
        </Text>
      </View>
    </ListRow>
  );
}

export default function Notifications() {
  const n = useNotifications();
  const waiting = n.data?.waiting || [];
  const alerts = n.data?.alerts || [];

  return (
    <Screen onRefresh={n.refetch} refreshing={n.isRefetching}>
      <Header back title="Notifications" />
      {n.isLoading ? (
        <SkeletonList />
      ) : n.error ? (
        <ErrorState error={n.error} onRetry={n.refetch} />
      ) : !waiting.length && !alerts.length ? (
        <EmptyState icon={Bell} title="All caught up" message="Friend requests, circle invitations and arrival alerts show up here." />
      ) : (
        <>
          {waiting.length ? (
            <Section title="Waiting for you" style={{ marginTop: 0 }}>
              <RowGroup>
                {waiting.map((item) => (
                  <Waiting key={`${item.type}:${item.id}`} item={item} />
                ))}
              </RowGroup>
            </Section>
          ) : null}
          {alerts.length ? (
            <Section title="Arrivals" style={waiting.length ? undefined : { marginTop: 0 }}>
              <RowGroup>
                {alerts.map((a) => (
                  <ListRow
                    key={a.id}
                    leading={<Avatar name={a.user.name} url={a.user.avatarUrl} size={36} />}
                    title={`${a.user.name.split(' ')[0]} ${a.kind === 'enter' ? 'arrived at' : 'left'} ${a.place.kind === 'campus' ? 'campus' : a.place.name}`}
                    subtitle={timeAgo(a.at)}
                    onPress={() => router.push(`/friend/${a.user.id}`)}
                    chevron={false}
                  />
                ))}
              </RowGroup>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
