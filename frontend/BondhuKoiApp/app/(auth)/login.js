import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { YStack, XStack } from "tamagui";
import { Link, useRouter } from "expo-router";
import {
  SanctuaryPage,
  Heading,
  LabelText,
  BodyText,
  GhostInput,
  SanctuaryLoader,
} from "../../components/SanctuaryComponents";
import { View as MotiView } from "moti";
import { ShieldCheck } from "@tamagui/lucide-icons-2";
import { useAuth } from "../../src/hooks/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  // If user is already logged in, redirect to home structure
  useEffect(() => {
    if (user && !isLoading) {
      console.log('[LoginScreen] User already logged in, redirecting to tabs');
      router.replace("/(tabs)");
    }
  }, [user, isLoading, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password");
      return;
    }

    setLocalError(null);
    const result = await login(email, password);

    if (result.success) {
      setEmail("");
      setPassword("");
      router.replace("/(tabs)");
    } else {
      setLocalError(result.error);
    }
  };

  const displayError = localError || error;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <SanctuaryPage>
          <YStack flex={1} ai="center" jc="center">
            <SanctuaryLoader />
            <BodyText color="$onSurfaceVariant" mt={24} fontSize={15}>
              Restoring your session...
            </BodyText>
          </YStack>
        </SanctuaryPage>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <SanctuaryPage>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 40,
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <YStack ai="center" w="100%">
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
            >
              <YStack ai="center" mb={40}>
                <Heading textAlign="center" mb={8}>
                  Bondhu Koi?
                </Heading>
                <BodyText color="$onSurfaceVariant" fontSize={16}>
                  Secure. Private. Sanctuary.
                </BodyText>
              </YStack>
            </MotiView>

            {displayError && (
              <YStack
                w="100%"
                bg="rgba(255, 69, 58, 0.1)"
                borderRadius={16}
                p={16}
                mb={24}
                borderWidth={1}
                borderColor="rgba(255, 69, 58, 0.3)"
              >
                <BodyText color="#FF453A" fontSize={14} fontWeight="700">
                  {displayError}
                </BodyText>
              </YStack>
            )}

            <MotiView
              from={{ opacity: 0, scale: 0.95, translateY: 30 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 1000, delay: 200 }}
              style={{ width: "100%" }}
            >
              <YStack
                w="100%"
                bg="$surfaceContainerLow"
                borderRadius={32}
                p={32}
                borderWidth={1}
                borderColor="$outlineVariant"
                opacity={isLoading ? 0.6 : 1}
              >
                <YStack mb={24}>
                  <LabelText mb={8}>Email Address</LabelText>
                  <GhostInput
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                  />
                </YStack>

                <YStack mb={32}>
                  <XStack jc="space-between" ai="center" mb={8}>
                    <LabelText>Password</LabelText>
                    <LabelText color="$primaryContainer" fontSize={11}>
                      FORGOT PASSWORD?
                    </LabelText>
                  </XStack>
                  <GhostInput
                    placeholder="••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                </YStack>

                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <YStack
                    bg="$primaryContainer"
                    h={56}
                    borderRadius={28}
                    ai="center"
                    jc="center"
                    mb={32}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <BodyText color="$onPrimary" fontWeight="800">
                        Login with Email
                      </BodyText>
                    )}
                  </YStack>
                </TouchableOpacity>
              </YStack>
            </MotiView>

            <YStack ai="center" mt={40}>
              <BodyText color="$onSurfaceVariant" fontSize={15} mb={24}>
                New user?{" "}
                <Link href="/(auth)/signup">
                  <BodyText
                    color="$primaryContainer"
                    fontWeight="700"
                    fontSize={15}
                  >
                    Create Account
                  </BodyText>
                </Link>
              </BodyText>

              <XStack
                ai="center"
                gap={8}
                px={16}
                py={8}
                borderRadius={100}
                borderWidth={1}
                borderColor={"$surfaceContainerLow"}
                mb={40}
              >
                <ShieldCheck color="$tertiary" size={16} />
                <LabelText fontSize={11} color="$onSurfaceVariant">
                  End-to-End Encrypted
                </LabelText>
              </XStack>

              <XStack jc="space-between" w="100%" px={16}>
                <LabelText fontSize={10} color="$onSurfaceVariant">
                  PRIVACY POLICY
                </LabelText>
                <LabelText fontSize={10} color="$onSurfaceVariant">
                  TERMS OF SERVICE
                </LabelText>
                <LabelText fontSize={10} color="$onSurfaceVariant">
                  HELP CENTER
                </LabelText>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
