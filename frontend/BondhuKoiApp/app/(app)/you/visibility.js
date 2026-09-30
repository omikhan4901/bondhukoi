import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Section, RowGroup, ListRow, Avatar, Text, Card, Button, SkeletonList, ErrorState, StatusPill } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useVisibility, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';

/**
 * "Who can see me": everyone who can see anything about you, what exactly they see, and
 * a way to stop each one.
 */
export default function Visibility() {
  const { space } = useTheme();
  const v = useVisibility();
  const invalidate = [keys.visibility, keys.watches, keys.notifications];
  const stopWatch = useAction((id) => api(`/api/watches/${id}`, { method: 'DELETE' }), { invalidate, success: 'Stopped.' });
  const allowWatch = useAction((id) => api(`/api/watches/${id}/accept`, { method: 'POST' }), { invalidate, success: 'Allowed.' });

  if (v.isLoading || v.error) {
    return (
      <Screen>
        <Header back title="Who can see me" />
        {v.error ? <ErrorState error={v.error} onRetry={v.refetch} /> : <SkeletonList />}
      </Screen>
    );
  }
  const d = v.data;

  return (
    <Screen onRefresh={v.refetch} refreshing={v.isRefetching}>
      <Header back title="Who can see me" subtitle="Nobody ever sees where you are, only these answers." />

      {!d.sharingEnabled ? (
        <Card>
          <StatusPill state="paused" size="lg" />
          <Text variant="secondary" tone="muted" style={{ marginTop: space.sm }}>
            You’ve paused sharing, so nobody below sees anything right now.
          </Text>
        </Card>
      ) : null}

      <Section title={`Friends · ${d.friends.length}`} style={d.sharingEnabled ? { marginTop: 0 } : undefined}>
        <Text variant="secondary" tone="muted" style={{ marginBottom: space.sm }}>
          {d.friends[0]?.seesCampus === false ? 'They see “Away” or your circles. Campus is hidden.' : 'They see “On campus” or “Away”, and circles they’re in with you.'}
        </Text>
        {d.friends.length ? (
          <RowGroup>
            {d.friends.map((f) => (
              <ListRow key={f.id} leading={<Avatar name={f.name} url={f.avatarUrl} size={32} />} title={f.name} onPress={() => router.push(`/friend/${f.id}`)} />
            ))}
          </RowGroup>
        ) : (
          <Text variant="secondary" tone="muted">
            No friends yet.
          </Text>
        )}
      </Section>

      <Section title={`Circles · ${d.circles.length}`}>
        {d.circles.length ? (
          <RowGroup>
            {d.circles.map((c) => (
              <ListRow
                key={c.id}
                title={c.name}
                subtitle={c.detectionEnabled ? `${c.otherMembers} people see when you’re in its place.` : 'Hidden: this circle can’t see when you’re there.'}
                onPress={() => router.push(`/circle/${c.id}`)}
              />
            ))}
          </RowGroup>
        ) : (
          <Text variant="secondary" tone="muted">
            You’re not in any circles.
          </Text>
        )}
      </Section>

      <Section title={`Arrival alerts · ${d.watchers.length}`}>
        {d.watchers.length ? (
          <RowGroup>
            {d.watchers.map((w) => (
              <ListRow
                key={w.watchId}
                leading={<Avatar name={w.user.name} url={w.user.avatarUrl} size={32} />}
                title={w.user.name}
                subtitle={
                  w.status === 'pending'
                    ? 'Asked to be told when you arrive or leave.'
                    : w.scope === 'all'
                      ? 'Told when you arrive or leave campus and shared circles.'
                      : 'Told when you arrive or leave campus.'
                }
              >
                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
                  {w.status === 'pending' ? <Button title="Allow" size="sm" full={false} onPress={() => allowWatch.mutate(w.watchId)} /> : null}
                  <Button title={w.status === 'pending' ? 'No' : 'Stop'} size="sm" variant="secondary" full={false} onPress={() => stopWatch.mutate(w.watchId)} />
                </View>
              </ListRow>
            ))}
          </RowGroup>
        ) : (
          <Text variant="secondary" tone="muted">
            Nobody gets alerts about you.
          </Text>
        )}
      </Section>

      <Section title="Can’t see you at all">
        <RowGroup>
          <ListRow title="Blocked people" value={String(d.blocked.length)} onPress={() => router.push('/you/blocked')} />
          <ListRow title="BondhuKoi’s team" subtitle="Admins never see where you are or were." chevron={false} />
        </RowGroup>
      </Section>
    </Screen>
  );
}
