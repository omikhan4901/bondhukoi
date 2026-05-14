import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { SanctuaryPage, SanctuaryLoader, BodyText } from "../components/SanctuaryComponents";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack } from "tamagui";

export default function RootIndex() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      console.log("[RootIndex] User found, dispatching to tabs");
      router.replace("/(tabs)");
    } else {
      console.log("[RootIndex] No user, dispatching to auth/login");
      router.replace("/(auth)/login");
    }
  }, [user, isLoading, router]);

  // Show a clean loader while the dispatcher is working
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <SanctuaryPage>
        <YStack flex={1} ai="center" jc="center">
          <SanctuaryLoader />
          <BodyText color="$onSurfaceVariant" mt={24} fontSize={15}>
            Preparing your sanctuary...
          </BodyText>
        </YStack>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
