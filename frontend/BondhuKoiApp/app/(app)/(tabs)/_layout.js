import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, CircleDot, Users, CircleUserRound } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useRequests, useInvitations } from '../../../src/lib/queries';

export default function TabsLayout() {
  const { c, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: requests } = useRequests();
  const { data: invites } = useInvitations();
  const icon = (Icon) =>
    function TabIcon({ color, focused }) {
      return <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />;
    };
  const badge = (n) => (n ? n : undefined);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, borderTopWidth: 1, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
        tabBarBadgeStyle: { backgroundColor: c.brand, color: c.onBrand, fontSize: 10 },
        sceneStyle: { backgroundColor: c.page },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon(House) }} />
      <Tabs.Screen name="circles" options={{ title: 'Circles', tabBarIcon: icon(CircleDot), tabBarBadge: badge(invites?.invitations?.length) }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: icon(Users), tabBarBadge: badge(requests?.incoming?.length) }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon(CircleUserRound) }} />
    </Tabs>
  );
}
