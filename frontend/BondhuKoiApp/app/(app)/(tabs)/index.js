import { useCallback, useEffect, useState } from 'react';
import { AppState, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Moon, PauseCircle, UserPlus, Users } from 'lucide-react-native';
import { Screen, Header, IconButton, Card, RowGroup, ListRow, Avatar, StatusPill, presenceLabel, Section, Text, Button, EmptyState, SkeletonList, ErrorState, IconTile, Banner } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMe, useMyPresence, useFriends, useNotifications, useConfig, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { permissionStatus } from '../../../src/location/location';
import { useRefreshLocation } from '../../../src/location/LocationSyncContext';
import { config } from '../../../src/lib/config';
import { timeAgo, hourLabel } from '../../../src/lib/format';

function usePermission() {
  const [status, setStatus] = useState(null);
  const check = useCallback(() => permissionStatus().then(setStatus), []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);
  return status;
}

function MyStatus({ me, presence }) {
  const { space } = useTheme();
  const permission = usePermission();
  const privacy = me.privacy;
  const toggle = useAction((on) => api('/api/me/privacy', { method: 'PATCH', body: { sharingEnabled: on } }), {
    invalidate: [keys.me, keys.myPresence],
    success: (_, on) => (on ? 'Sharing is on again.' : 'Sharing paused. Friends see “Not sharing”.'),
  });

  if (!config.demo && permission && !permission.foreground) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <IconTile icon={MapPin} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Location is off</Text>
            <Text variant="secondary" tone="muted">
              Friends can’t see when you’re on campus.
            </Text>
          </View>
        </View>
        <Button title="Turn on" size="sm" style={{ marginTop: space.md }} onPress={() => router.push('/onboarding?step=location')} />
      </Card>
    );
  }

  const paused = !privacy.sharingEnabled;
  const quiet = !paused && presence?.state === 'off';
  const state = paused ? 'paused' : quiet ? 'off' : presence?.state || 'unknown';
  const label = paused ? 'Sharing paused' : quiet ? 'Quiet hours' : presenceLabel(presence).label;
  const line = paused
    ? 'Nobody can see where you are.'
    : quiet
      ? `Nothing is shared until ${hourLabel(privacy.quietEnd)}.`
      : presence?.updatedAt
        ? `This is what your friends see · ${timeAgo(presence.updatedAt)}`
        : 'Open BondhuKoi on campus to update.';

  return (
    <Card>
      <View style={{ gap: space.sm }}>
        <Text variant="secondaryStrong" tone="muted">
          You
        </Text>
        <StatusPill state={state} label={label} size="lg" />
        <Text variant="secondary" tone="muted">
          {line}
        </Text>
      </View>
      <View style={{ marginTop: space.lg }}>
        {paused ? (
          <Button title="Resume sharing" size="sm" onPress={() => toggle.mutate(true)} loading={toggle.isPending} />
        ) : (
          <Button title="Pause sharing" icon={quiet ? Moon : PauseCircle} variant="secondary" size="sm" onPress={() => toggle.mutate(false)} loading={toggle.isPending} />
        )}
      </View>
    </Card>
  );
}

function FriendRow({ friend }) {
  const { state, label } = presenceLabel(friend.presence);
  return (
    <ListRow
      leading={<Avatar name={friend.name} url={friend.avatarUrl} />}
      title={friend.name}
      subtitle={<StatusPill state={state} label={label} />}
      onPress={() => router.push(`/friend/${friend.id}`)}
    />
  );
}

export default function Home() {
  const { space } = useTheme();
  const me = useMe();
  const presence = useMyPresence();
  const friends = useFriends();
  const notes = useNotifications();
  const { data: cfg } = useConfig();
  const refreshLocation = useRefreshLocation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshLocation({ force: true }), me.refetch(), presence.refetch(), friends.refetch(), notes.refetch()]);
    setRefreshing(false);
  };

  const list = friends.data?.friends || [];
  const here = list.filter((f) => f.presence.state === 'here');
  const rest = list.filter((f) => f.presence.state !== 'here');
  const waiting = notes.data?.waiting?.length || 0;
  const firstName = me.data?.user.name.split(' ')[0];

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header
        title={firstName ? `Hi, ${firstName}` : 'BondhuKoi'}
        right={<IconButton icon={Bell} label={waiting ? `Notifications, ${waiting} waiting` : 'Notifications'} badge={waiting} onPress={() => router.push('/notifications')} />}
      />
      <View style={{ gap: space.md }}>
        {cfg?.banner?.text ? <Banner text={cfg.banner.text} tone={cfg.banner.tone} /> : null}
        {me.data ? <MyStatus me={me.data} presence={presence.data?.presence} /> : <SkeletonList rows={1} />}
      </View>

      {friends.isLoading ? (
        <Section title="Friends">
          <SkeletonList />
        </Section>
      ) : friends.error ? (
        <ErrorState error={friends.error} onRetry={friends.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Add your first friend"
          message={`Share your code ${me.data?.user.friendCode ?? ''} or scan theirs. You’ll see when they’re on campus.`}
          action="Share my code"
          onAction={() =>
            Share.share({ message: `Add me on BondhuKoi: my code is ${me.data?.user.friendCode}. Get the app: https://bondhukoi.pages.dev` })
          }
          secondary="Add a friend"
          onSecondary={() => router.push('/add-friend')}
        />
      ) : (
        <>
          <Section title={here.length ? `On campus now · ${here.length}` : 'On campus now'}>
            {here.length ? (
              <RowGroup>
                {here.map((f) => (
                  <FriendRow key={f.id} friend={f} />
                ))}
              </RowGroup>
            ) : (
              <Card>
                <Text variant="secondary" tone="muted">
                  None of your friends are on campus right now.
                </Text>
              </Card>
            )}
          </Section>
          {rest.length ? (
            <Section title="Everyone else" action={rest.length > 4 ? 'See all' : undefined} onAction={() => router.push('/friends')}>
              <RowGroup>
                {rest.slice(0, 4).map((f) => (
                  <FriendRow key={f.id} friend={f} />
                ))}
              </RowGroup>
            </Section>
          ) : null}
          <View style={{ marginTop: space.xl }}>
            <Button title="Add a friend" icon={UserPlus} variant="secondary" onPress={() => router.push('/add-friend')} />
          </View>
        </>
      )}
    </Screen>
  );
}
