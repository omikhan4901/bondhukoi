import { View } from 'react-native';
import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import { Screen, Header, IconButton, Section, RowGroup, ListRow, Avatar, StatusPill, presenceLabel, Button, EmptyState, SkeletonList, ErrorState, Text } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useFriends, useRequests, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { timeAgo } from '../../../src/lib/format';

function RequestRow({ request }) {
  const { space } = useTheme();
  const invalidate = [keys.requests, keys.friends, keys.notifications];
  const accept = useAction(() => api(`/api/friends/requests/${request.id}/accept`, { method: 'POST' }), { invalidate, success: `You and ${request.user.name} are friends.` });
  const decline = useAction(() => api(`/api/friends/requests/${request.id}`, { method: 'DELETE' }), { invalidate });
  return (
    <ListRow leading={<Avatar name={request.user.name} url={request.user.avatarUrl} />} title={request.user.name} subtitle={`${request.user.university ?? ''} · ${timeAgo(request.createdAt)}`}>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Button title="Accept" size="sm" full={false} onPress={() => accept.mutate()} loading={accept.isPending} />
        <Button title="Decline" size="sm" variant="secondary" full={false} onPress={() => decline.mutate()} loading={decline.isPending} />
      </View>
    </ListRow>
  );
}

export default function Friends() {
  const friends = useFriends();
  const requests = useRequests();
  const cancel = useAction((id) => api(`/api/friends/requests/${id}`, { method: 'DELETE' }), { invalidate: [keys.requests], success: 'Request cancelled.' });
  const incoming = requests.data?.incoming || [];
  const outgoing = requests.data?.outgoing || [];
  const list = friends.data?.friends || [];

  return (
    <Screen onRefresh={() => Promise.all([friends.refetch(), requests.refetch()])} refreshing={friends.isRefetching}>
      <Header title="Friends" right={<IconButton icon={UserPlus} label="Add a friend" onPress={() => router.push('/add-friend')} />} />

      {incoming.length ? (
        <Section title={`Requests · ${incoming.length}`} style={{ marginTop: 0 }}>
          <RowGroup>
            {incoming.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </RowGroup>
        </Section>
      ) : null}

      {friends.isLoading ? (
        <SkeletonList />
      ) : friends.error ? (
        <ErrorState error={friends.error} onRetry={friends.refetch} />
      ) : list.length === 0 && !incoming.length ? (
        <EmptyState icon={Users} title="No friends yet" message="Add friends by their code or QR. They say yes before anyone sees anything." action="Add a friend" onAction={() => router.push('/add-friend')} />
      ) : list.length ? (
        <Section title={`Your friends · ${list.length}`} style={incoming.length ? undefined : { marginTop: 0 }}>
          <RowGroup>
            {list.map((f) => {
              const p = presenceLabel(f.presence);
              return (
                <ListRow
                  key={f.id}
                  leading={<Avatar name={f.name} url={f.avatarUrl} />}
                  title={f.name}
                  subtitle={<StatusPill state={p.state} label={p.label} />}
                  onPress={() => router.push(`/friend/${f.id}`)}
                />
              );
            })}
          </RowGroup>
        </Section>
      ) : null}

      {outgoing.length ? (
        <Section title="Waiting for them">
          <RowGroup>
            {outgoing.map((r) => (
              <ListRow
                key={r.id}
                leading={<Avatar name={r.user.name} url={r.user.avatarUrl} size={36} />}
                title={r.user.name}
                subtitle={`Sent ${timeAgo(r.createdAt)}`}
                trailing={
                  <Text variant="secondaryStrong" tone="muted" onPress={() => cancel.mutate(r.id)} accessibilityRole="button">
                    Cancel
                  </Text>
                }
              />
            ))}
          </RowGroup>
        </Section>
      ) : null}
    </Screen>
  );
}
