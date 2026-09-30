import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Input, Button, Text } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMe, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';

export default function Profile() {
  const { space } = useTheme();
  const me = useMe();
  const [form, setForm] = useState({ name: '', facebook: '', instagram: '' });
  useEffect(() => {
    if (me.data) setForm({ name: me.data.user.name, facebook: me.data.user.facebook || '', instagram: me.data.user.instagram || '' });
  }, [me.data]);
  const save = useAction(() => api('/api/me', { method: 'PATCH', body: { name: form.name, facebook: form.facebook || null, instagram: form.instagram || null } }), {
    invalidate: [keys.me],
    success: 'Saved.',
    onSuccess: () => router.back(),
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Screen footer={<Button title="Save" onPress={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()} />}>
      <Header back title="Name and social links" />
      <View style={{ gap: space.lg }}>
        <Input label="Name" value={form.name} onChangeText={set('name')} maxLength={80} autoComplete="name" />
        <Input label="Facebook username (optional)" placeholder="nusrat.jahan" value={form.facebook} onChangeText={set('facebook')} autoCapitalize="none" autoCorrect={false} maxLength={60} />
        <Input label="Instagram username (optional)" placeholder="nusrat.j" value={form.instagram} onChangeText={set('instagram')} autoCapitalize="none" autoCorrect={false} maxLength={60} />
        <Text variant="caption" tone="muted">
          Only your friends see your social links.
        </Text>
      </View>
    </Screen>
  );
}
