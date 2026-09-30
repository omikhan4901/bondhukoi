import { useEffect } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Download } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useConfig } from '../../src/lib/queries';
import { config, versionBelow } from '../../src/lib/config';
import { needsOnboarding } from '../../src/lib/onboarding';
import { useLocationSync } from '../../src/location/useLocationSync';
import { usePush } from '../../src/push/push';
import { Screen, EmptyState } from '../../src/ui';
import { LocationSyncContext } from '../../src/location/LocationSyncContext';

export default function AppLayout() {
  const { c } = useTheme();
  const { data: cfg } = useConfig();
  const refreshLocation = useLocationSync(true);
  usePush(true);

  useEffect(() => {
    needsOnboarding().then((yes) => yes && router.replace('/onboarding'));
  }, []);

  if (cfg && versionBelow(config.appVersion, cfg.minAppVersion)) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={Download}
            title="Update BondhuKoi"
            message="This version is too old to keep sharing safely. Update from the Play Store to continue."
            action="Open the Play Store"
            onAction={() => Linking.openURL(Platform.OS === 'android' ? 'market://details?id=com.omi.bondhukoi' : 'https://bondhukoi.pages.dev')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <LocationSyncContext.Provider value={refreshLocation}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.page }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </LocationSyncContext.Provider>
  );
}
