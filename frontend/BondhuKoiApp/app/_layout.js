import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useEffect } from "react";
import config from "../tamagui.config";
import { AuthProvider } from "../src/context/AuthContext";
import { LocationStatusProvider } from "../src/context/LocationStatusContext";
import { useAuth } from "../src/hooks/useAuth";

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { SanctuaryLoader, SanctuaryPage } from "../components/SanctuaryComponents";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * RootAuthGuard - Watches auth state globally and redirects on logout/expiry
 * This is the ultimate security layer.
 */
function RootAuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Check if user is in a protected area (tabs) without a session
    const inTabsGroup = segments[0] === "(tabs)";
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && inTabsGroup) {
      console.log("[RootLayout] Protected access without user, redirecting to login...");
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      console.log("[RootLayout] Authenticated user in auth group, redirecting to tabs...");
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <SanctuaryPage>
          <SanctuaryLoader />
        </SanctuaryPage>
      </SafeAreaView>
    );
  }

  // Use a dynamic key based on auth state. 
  // Forces a total reset of the navigation tree on login/logout.
  return <Stack key={user ? 'authenticated' : 'guest'} screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'light' ? 'light' : 'dark';

  const [loaded] = useFonts({
    Inter: Inter_500Medium,
    InterRegular: Inter_400Regular,
    InterSemiBold: Inter_600SemiBold,
    Manrope: Manrope_600SemiBold,
    ManropeRegular: Manrope_400Regular,
    ManropeExtraBold: Manrope_800ExtraBold,
  });

  if (!loaded) return null;

  return (
    <AuthProvider>
      <LocationStatusProvider>
        <TamaguiProvider config={config} defaultTheme={themeName}>
          <Theme name={themeName}>
            <ThemeProvider value={themeName === 'dark' ? DarkTheme : DefaultTheme}>
              <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
              <RootAuthGuard />
            </ThemeProvider>
          </Theme>
        </TamaguiProvider>
      </LocationStatusProvider>
    </AuthProvider>
  );
}
