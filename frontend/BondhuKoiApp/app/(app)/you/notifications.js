import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Screen, Header, RowGroup, SwitchRow, Card, Text, Button, SkeletonList } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMe, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { askPush, pushPermission, registerPushToken } from '../../../src/push/push';

const ROWS = [
  ['friendRequests', 'Friend requests', 'When someone asks to be friends or says yes.'],
  ['circleInvites', 'Circle invitations', 'When a friend invites you to a circle.'],
  ['watchRequests', 'Alert requests', 'When a friend asks to be told when you arrive.'],
  ['watchAlerts', 'Arrivals', 'When a friend you get alerts for arrives or leaves.'],
];

export default function NotificationSettings() {
  const { space } = useTheme();
  const me = useMe();
  const [permission, setPermission] = useState(null);
  useEffect(() => {
    pushPermission().then(setPermission);
  }, []);
  const save = useAction((body) => api('/api/me/notifications', { method: 'PATCH', body }), { invalidate: [keys.me] });
  const prefs = { ...me.data?.notifications, ...(save.isPending ? save.variables : {}) };

  return (
    <Screen>
      <Header back title="Notifications" />
      {permission && permission !== 'granted' && permission !== 'unavailable' ? (
        <Card style={{ marginBottom: space.lg }}>
          <Text variant="bodyStrong">Notifications are off for BondhuKoi</Text>
          <Text variant="secondary" tone="muted" style={{ marginBottom: space.md }}>
            Turn them on to hear about requests and arrivals.
          </Text>
          <Button
            title="Turn on"
            size="sm"
            onPress={async () => {
              const ok = await askPush();
              if (ok) {
                await registerPushToken().catch(() => {});
                setPermission('granted');
              } else Linking.openSettings();
            }}
          />
        </Card>
      ) : null}
      {me.data ? (
        <RowGroup>
          {ROWS.map(([key, title, subtitle]) => (
            <SwitchRow key={key} title={title} subtitle={subtitle} value={prefs[key] !== false} onValueChange={(v) => save.mutate({ [key]: v })} />
          ))}
        </RowGroup>
      ) : (
        <SkeletonList rows={4} />
      )}
    </Screen>
  );
}
