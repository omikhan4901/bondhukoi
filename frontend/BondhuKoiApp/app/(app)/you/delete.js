import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Header, Card, Text, Input, Button } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useAction } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/auth/AuthProvider';
import { stopZones } from '../../../src/location/location';

export default function DeleteAccount() {
  const { space } = useTheme();
  const { signOut } = useAuth();
  const [typed, setTyped] = useState('');
  const remove = useAction(() => api('/api/me', { method: 'DELETE', body: { confirm: 'DELETE' } }), {
    success: 'Your account is deleted.',
    onSuccess: async () => {
      await stopZones();
      await signOut();
    },
  });
  return (
    <Screen footer={<Button title="Delete my account" variant="danger" disabled={typed !== 'DELETE'} loading={remove.isPending} onPress={() => remove.mutate()} />}>
      <Header back title="Delete account" />
      <View style={{ gap: space.lg }}>
        <Card>
          <Text variant="bodyStrong">This can’t be undone.</Text>
          <Text variant="secondary" tone="muted" style={{ marginTop: 4 }}>
            Your profile, photo, friendships, alerts and history are deleted straight away. Circles you run are handed to another member, or deleted if you’re the only one left.
          </Text>
        </Card>
        <Input label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
      </View>
    </Screen>
  );
}
