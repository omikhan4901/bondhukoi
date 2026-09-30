import { View } from 'react-native';
import { router } from 'expo-router';
import { EyeOff, Moon, Users } from 'lucide-react-native';
import { Screen, Text, Button, IconTile } from '../../src/ui';
import { Logo } from '../../src/ui/Logo';
import { useTheme } from '../../src/theme/ThemeProvider';

const POINTS = [
  { icon: EyeOff, title: 'Your location is never stored', body: 'Only “on campus” or “away”. Never a dot on a map.' },
  { icon: Users, title: 'Only the friends you choose', body: 'You see who can see you, and can stop it in one tap.' },
  { icon: Moon, title: 'Quiet at night', body: 'Nothing is shared from 6 PM to 6 AM unless you want.' },
];

export default function Welcome() {
  const { space } = useTheme();
  return (
    <Screen
      footer={
        <>
          <Button title="Create an account" onPress={() => router.push('/sign-up')} />
          <Button title="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
        </>
      }
    >
      <View style={{ paddingTop: space.xl, gap: space.xxl }}>
        <Logo />
        <View style={{ gap: space.md }}>
          <Text variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
            See which friends are on campus.
          </Text>
          <Text variant="body" tone="muted">
            Without anyone seeing where you are. Made for university students in Bangladesh.
          </Text>
        </View>
        <View style={{ gap: space.lg }}>
          {POINTS.map((p) => (
            <View key={p.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <IconTile icon={p.icon} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{p.title}</Text>
                <Text variant="secondary" tone="muted">
                  {p.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
