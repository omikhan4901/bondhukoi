import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Shield, Eye, Bell, UserPen, Ban, LifeBuoy, FileText, LogOut, MonitorSmartphone, Trash2, QrCode, Camera } from 'lucide-react-native';
import { Screen, Header, Card, Avatar, Text, RowGroup, ListRow, Section, useConfirm, useToast, SkeletonList } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMe, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/auth/AuthProvider';
import { unregisterPushToken } from '../../../src/push/push';
import { stopZones } from '../../../src/location/location';
import { config } from '../../../src/lib/config';
import { spacedCode } from '../../../src/lib/format';

export default function You() {
  const { c, space } = useTheme();
  const me = useMe();
  const { signOut } = useAuth();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();

  const upload = useAction((imageBase64) => api('/api/me/avatar', { method: 'POST', body: { imageBase64 } }), { invalidate: [keys.me], success: 'Photo updated.' });

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (res.canceled) return;
    const small = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    upload.mutate(small.base64);
  }

  async function doSignOut() {
    await unregisterPushToken();
    await stopZones();
    await signOut();
  }

  const icon = (Icon, tone = 'ink') => <Icon size={20} color={c[tone]} />;
  const user = me.data?.user;

  return (
    <Screen>
      <Header title="You" />
      {user ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Change your photo">
              <Avatar name={user.name} url={user.avatarUrl} size={64} />
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={13} color={c.muted} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="secondary" tone="muted" numberOfLines={1}>
                {user.university.name}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/add-friend')}
            accessibilityRole="button"
            accessibilityLabel={`Your friend code, ${user.friendCode}. Show QR`}
            style={({ pressed }) => ({
              marginTop: space.lg,
              padding: space.md,
              borderRadius: 12,
              backgroundColor: pressed ? c.brandLine : c.brandSoft,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <View>
              <Text variant="caption" tone="brand">
                YOUR FRIEND CODE
              </Text>
              <Text variant="title" tone="ink" style={{ letterSpacing: 2 }}>
                {spacedCode(user.friendCode)}
              </Text>
            </View>
            <QrCode size={24} color={c.brand} />
          </Pressable>
        </Card>
      ) : (
        <SkeletonList rows={1} />
      )}

      <Section title="Privacy">
        <RowGroup>
          <ListRow leading={icon(Shield)} title="Sharing and quiet hours" onPress={() => router.push('/you/privacy')} />
          <ListRow leading={icon(Eye)} title="Who can see me" onPress={() => router.push('/you/visibility')} />
          <ListRow leading={icon(Ban)} title="Blocked people" onPress={() => router.push('/you/blocked')} />
        </RowGroup>
      </Section>

      <Section title="Account">
        <RowGroup>
          <ListRow leading={icon(UserPen)} title="Name and social links" onPress={() => router.push('/you/profile')} />
          <ListRow leading={icon(Bell)} title="Notifications" onPress={() => router.push('/you/notifications')} />
          <ListRow leading={icon(LifeBuoy)} title="Help and feedback" onPress={() => router.push('/you/help')} />
          <ListRow leading={icon(FileText)} title="Privacy policy" onPress={() => Linking.openURL('https://bondhukoi.pages.dev/privacy')} />
        </RowGroup>
      </Section>

      <Section title="Sign out">
        <RowGroup>
          <ListRow leading={icon(LogOut)} title="Sign out" chevron={false} onPress={doSignOut} />
          <ListRow
            leading={icon(MonitorSmartphone)}
            title="Sign out on every device"
            subtitle="If you lost a phone or shared your password."
            chevron={false}
            onPress={async () => {
              if (!(await confirm({ title: 'Sign out everywhere?', message: 'Every phone signed in to your account, including this one, will be signed out.', confirmLabel: 'Sign out everywhere' }))) return;
              try {
                await api('/api/me/sign-out-everywhere', { method: 'POST' });
              } catch (err) {
                return toast(err.message, 'error');
              }
              await doSignOut();
            }}
          />
          <ListRow leading={icon(Trash2, 'danger')} title="Delete account" tone="danger" onPress={() => router.push('/you/delete')} />
        </RowGroup>
      </Section>

      <Text variant="caption" tone="faint" align="center" style={{ marginTop: space.xl }}>
        BondhuKoi {config.appVersion}
      </Text>
      {dialog}
    </Screen>
  );
}
