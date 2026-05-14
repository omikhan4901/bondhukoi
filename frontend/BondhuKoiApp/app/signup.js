
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { YStack, XStack } from "tamagui";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { BottomSheetModal } from "../components/modals/BottomSheetModal";
import {
  SanctuaryPage,
  Heading,
  LabelText,
  BodyText,
  GhostInput,
  LineSeparator,
} from "../components/SanctuaryComponents";
import {
  ShieldCheck,
  ChevronDown,
  Camera,
  Facebook,
  Instagram,
  CheckCircle,
  AlertCircle,
} from "@tamagui/lucide-icons-2";
import { authService, userService } from "../src/services/api";
import { useAuth } from "../src/hooks/useAuth";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { View as MotiView } from "moti";
const STEP_LABELS = ["Account", "Profile & Socials"];

export default function SignupScreen() {
  console.log("🔴 [SIGNUP COMPONENT MOUNTED]");

  const router = useRouter();
  const { signup } = useAuth();
  const params = useLocalSearchParams();
  const fromGoogle = params.fromGoogle === "true";

  // Step 1 fields
  const [name, setName] = useState(params.name || "");
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");

  // UI State
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Profile State
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarMime, setAvatarMime] = useState(null);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  // Picker State
  const [uniPickerOpen, setUniPickerOpen] = useState(false);
  const [unis, setUnis] = useState([]);

  const step1Valid =
    name.trim() &&
    email.trim() &&
    (fromGoogle ? true : password.trim()) &&
    university;

  useEffect(() => {
    // Load universities (hardcoded for now)
    setUnis([
      "North South University",
      "BRAC University",
      "Independent University Bangladesh",
      "American Int. University-Bangladesh",
      "University of Dhaka",
    ]);
  }, []);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    // Resize to 300×300 and compress before encoding
    const manipulated = await manipulateAsync(
      asset.uri,
      [{ resize: { width: 300, height: 300 } }],
      { compress: 0.5, format: SaveFormat.JPEG },
    );
    setAvatarMime("image/jpeg");
    const b64 = await readAsStringAsync(manipulated.uri, {
      encoding: EncodingType.Base64,
    });
    setAvatarBase64(b64);
  };

  const handleNextOrSubmit = async () => {
    console.log("🔴 [Signup] handleNextOrSubmit called, step:", step);
    if (step === 0) {
      if (!step1Valid) return;
      setStep(1);
    } else {
      try {
        console.log("🔴 [Signup] Starting submission, fromGoogle:", fromGoogle);
        setIsLoading(true);
        setError(null);

        if (fromGoogle) {
          console.log("🔴 [Signup] Google flow detected");
          // Use new Google signup flow
          const idToken = params.idToken;
          console.log(
            "🔴 [Signup] idToken from params:",
            idToken?.substring(0, 20) + "...",
          );
          if (!idToken)
            throw new Error("Missing Google token. Please try again.");

          console.log("🔴 [Signup] Calling signupWithGoogle with:", {
            idToken: idToken?.substring(0, 20) + "...",
            university,
          });
          const result = await signupWithGoogle(idToken, university);
          console.log("🔴 [Signup] signupWithGoogle result:", result);
          if (!result.success) throw new Error(result.error);

          // Upload avatar if picked
          if (avatarBase64) {
            try {
              await userService.uploadAvatar(avatarBase64, avatarMime);
            } catch (avatarErr) {
              console.warn(
                "Avatar upload failed, continuing:",
                avatarErr.message,
              );
            }
          }

          router.replace("/(tabs)");
        } else {
          console.log("🔴 [Signup] Email/password flow detected");
          // Regular email/password signup
          await authService.signup(
            name,
            email,
            password,
            university,
            facebook || null,
            instagram || null,
          );

          // Auto-login after signup
          const loginResult = await login(email, password);
          if (!loginResult.success) throw new Error(loginResult.error);

          // Upload avatar if picked
          if (avatarBase64) {
            try {
              await userService.uploadAvatar(avatarBase64, avatarMime);
            } catch (avatarErr) {
              console.warn(
                "Avatar upload failed, continuing:",
                avatarErr.message,
              );
            }
          }

          router.replace("/(tabs)");
        }
      } catch (err) {
        console.error("🔴 [Signup] Error during submission:", err);
        setError(err.message || "Signup failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <SanctuaryPage>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 60,
            flexGrow: 1,
          }}
        >
          <YStack ai="center" w="100%">
            {/* Header */}
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <YStack ai="center" mb={44}>
                <Heading textAlign="center" mb={12} fontSize={44}>
                  Bondhu Koi?
                </Heading>
                <BodyText
                  color="$onSurfaceVariant"
                  textAlign="center"
                  fontSize={16}
                  lineHeight={24}
                >
                  Your university sanctuary.{"\n"}Connect with your campus
                  community.
                </BodyText>
              </YStack>
            </MotiView>

            {/* Step indicator */}
            <XStack gap={12} mb={44} px={10}>
              {STEP_LABELS.map((label, i) => (
                <YStack key={label} f={1} ai="center">
                  <XStack ai="center" gap={10}>
                    <YStack
                      w={32}
                      h={32}
                      borderRadius="$full"
                      bg={step >= i ? "#47A1FF" : "$surfaceContainerHighest"}
                      ai="center"
                      jc="center"
                      borderWidth={2}
                      borderColor={
                        step === i ? "rgba(255,255,255,0.1)" : "transparent"
                      }
                    >
                      {step > i ? (
                        <CheckCircle color="#111317" size={18} fill="#47A1FF" />
                      ) : (
                        <BodyText
                          fontWeight="900"
                          fontSize={14}
                          color={step === i ? "#111317" : "$onSurfaceVariant"}
                        >
                          {i + 1}
                        </BodyText>
                      )}
                    </YStack>
                    <BodyText
                      fontSize={14}
                      fontWeight={step === i ? "900" : "600"}
                      color={step >= i ? "#47A1FF" : "$onSurfaceVariant"}
                    >
                      {label}
                    </BodyText>
                  </XStack>
                  {i < STEP_LABELS.length - 1 && (
                    <YStack
                      h={2}
                      bg={step > i ? "#47A1FF" : "$outlineVariant"}
                      position="absolute"
                      left="75%"
                      right={-20}
                      top={15}
                    />
                  )}
                </YStack>
              ))}
            </XStack>

            {error && (
              <YStack
                bg="rgba(255,69,58,0.1)"
                borderRadius={20}
                p={16}
                mb={32}
                borderWidth={1}
                borderColor="rgba(255,69,58,0.25)"
                ai="flex-start"
                gap={8}
              >
                <XStack ai="center" gap={12}>
                  <AlertCircle color="#FF453A" size={20} />
                  <BodyText color="#FF453A" fontWeight="600" fontSize={14}>
                    {error}
                  </BodyText>
                </XStack>
              </YStack>
            )}

            {/* ── STEP 0: Account ── */}
            {step === 0 && (
              <MotiView
                from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 800 }}
                style={{ width: "100%" }}
              >
                <YStack
                  w="100%"
                  bg="$surfaceContainerLow"
                  borderRadius={40}
                  p={32}
                  borderWidth={1}
                  borderColor="$outlineVariant"
                  mb={32}
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                  }}
                >
                  <YStack mb={24}>
                    <LabelText mb={10} letterSpacing={1.5}>
                      Full Name
                    </LabelText>
                    <GhostInput
                      placeholder="Ariful Islam"
                      value={name}
                      onChangeText={setName}
                    />
                  </YStack>

                  <YStack mb={24}>
                    <LabelText mb={10} letterSpacing={1.5}>
                      Institutional Email
                    </LabelText>
                    <GhostInput
                      placeholder="name@northsouth.edu"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </YStack>

                  <YStack mb={24}>
                    <LabelText mb={10} letterSpacing={1.5}>
                      Your University
                    </LabelText>
                    <TouchableOpacity
                      onPress={() => setUniPickerOpen(true)}
                      activeOpacity={0.7}
                    >
                      <XStack
                        bg="$surfaceContainerHigh"
                        height={60}
                        borderRadius={18}
                        borderWidth={1}
                        borderColor="$outlineVariant"
                        px={20}
                        ai="center"
                        jc="space-between"
                      >
                        <BodyText
                          color={
                            university ? "$onSurface" : "$onSurfaceVariant"
                          }
                          fontWeight="600"
                        >
                          {university || "Select your campus..."}
                        </BodyText>
                        <ChevronDown color="$onSurfaceVariant" size={22} />
                      </XStack>
                    </TouchableOpacity>
                  </YStack>

                  {!fromGoogle && (
                    <YStack mb={36}>
                      <LabelText mb={10} letterSpacing={1.5}>
                        Security Password
                      </LabelText>
                      <GhostInput
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                    </YStack>
                  )}

                  <TouchableOpacity
                    onPress={handleNextOrSubmit}
                    activeOpacity={step1Valid && !isLoading ? 0.8 : 0.4}
                    disabled={!step1Valid || isLoading}
                  >
                    <YStack
                      bg={step1Valid ? "#47A1FF" : "$surfaceContainerHighest"}
                      h={64}
                      borderRadius={32}
                      ai="center"
                      jc="center"
                      opacity={isLoading ? 0.6 : 1}
                      style={
                        step1Valid
                          ? {
                              shadowColor: "#47A1FF",
                              shadowOpacity: 0.25,
                              shadowRadius: 10,
                            }
                          : {}
                      }
                    >
                      <BodyText
                        color={step1Valid ? "#111317" : "$onSurfaceVariant"}
                        fontWeight="900"
                        fontSize={16}
                      >
                        {isLoading ? "Loading..." : "Continue to Profile →"}
                      </BodyText>
                    </YStack>
                  </TouchableOpacity>

                  {!fromGoogle && (
                    <>
                      <XStack ai="center" my={24}>
                        <LineSeparator />
                        <BodyText
                          fontSize={12}
                          color="$onSurfaceVariant"
                          mx={16}
                          fontWeight="700"
                          textTransform="uppercase"
                        >
                          Or
                        </BodyText>
                        <LineSeparator />
                      </XStack>

                    </>
                  )}

                  <XStack jc="center" mt={24}>
                    <BodyText color="$onSurfaceVariant" fontSize={15}>
                      Already a member?{" "}
                      <Link href="/">
                        <BodyText
                          color="#47A1FF"
                          fontWeight="800"
                          fontSize={15}
                        >
                          Login
                        </BodyText>
                      </Link>
                    </BodyText>
                  </XStack>
                </YStack>
              </MotiView>
            )}

            {/* ── STEP 1: Profile & Socials ── */}
            {step === 1 && (
              <MotiView
                from={{ opacity: 0, scale: 0.95, translateY: 20 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 800 }}
                style={{ width: "100%" }}
              >
                <YStack
                  w="100%"
                  bg="$surfaceContainerLow"
                  borderRadius={40}
                  p={32}
                  borderWidth={1}
                  borderColor="$outlineVariant"
                  mb={32}
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                  }}
                >
                  {/* Avatar picker */}
                  <YStack
                    ai="center"
                    mb={36}
                    pb={32}
                    borderBottomWidth={1}
                    borderBottomColor="$outlineVariant"
                  >
                    <BodyText fontWeight="900" fontSize={16} mb={20}>
                      Identity Photo
                    </BodyText>
                    <TouchableOpacity activeOpacity={0.8} onPress={pickAvatar}>
                      <YStack>
                        <YStack
                          w={120}
                          h={120}
                          borderRadius="$full"
                          bg="$surfaceContainerHighest"
                          ai="center"
                          jc="center"
                          borderWidth={3}
                          borderColor={
                            avatarUri ? "#47A1FF" : "$outlineVariant"
                          }
                          overflow="hidden"
                        >
                          {avatarUri ? (
                            <Image
                              source={{ uri: avatarUri }}
                              style={{
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                              }}
                            />
                          ) : (
                            <Camera color="$onSurfaceVariant" size={44} />
                          )}
                        </YStack>
                        <YStack
                          position="absolute"
                          bottom={4}
                          right={4}
                          w={36}
                          h={36}
                          borderRadius="$full"
                          bg="#47A1FF"
                          ai="center"
                          jc="center"
                          borderWidth={3}
                          borderColor="$surfaceContainerLow"
                        >
                          <Camera color="#111317" size={18} />
                        </YStack>
                      </YStack>
                    </TouchableOpacity>
                    <BodyText
                      fontSize={14}
                      color="$onSurfaceVariant"
                      mt={16}
                      fontWeight="600"
                    >
                      Tap to set your display avatar
                    </BodyText>
                  </YStack>

                  {/* Social IDs */}
                  <Heading fontSize={20} mb={6}>
                    Connect Outside
                  </Heading>
                  <BodyText
                    fontSize={14}
                    color="$onSurfaceVariant"
                    mb={24}
                    lineHeight={20}
                  >
                    Help friends find you. Only shared with verified campus
                    members.
                  </BodyText>

                  <YStack mb={24}>
                    <XStack ai="center" mb={10} gap={10}>
                      <Facebook color="#1877F2" size={20} />
                      <LabelText letterSpacing={1.2}>Facebook Handle</LabelText>
                    </XStack>
                    <XStack
                      bg="$surfaceContainerHigh"
                      borderRadius={18}
                      px={20}
                      ai="center"
                      borderWidth={1}
                      borderColor="$outlineVariant"
                      height={56}
                    >
                      <BodyText
                        color="$onSurfaceVariant"
                        fontSize={16}
                        fontWeight="700"
                        mr={6}
                      >
                        @
                      </BodyText>
                      <TextInput
                        placeholder="your.handle"
                        placeholderTextColor="#6C727F"
                        value={facebook}
                        onChangeText={setFacebook}
                        autoCapitalize="none"
                        style={{
                          flex: 1,
                          fontFamily: "Inter",
                          fontSize: 16,
                          color: "#FFFFFF",
                          fontWeight: "600",
                        }}
                      />
                    </XStack>
                  </YStack>

                  <YStack mb={36}>
                    <XStack ai="center" mb={10} gap={10}>
                      <Instagram color="#E1306C" size={20} />
                      <LabelText letterSpacing={1.2}>
                        Instagram Handle
                      </LabelText>
                    </XStack>
                    <XStack
                      bg="$surfaceContainerHigh"
                      borderRadius={18}
                      px={20}
                      ai="center"
                      borderWidth={1}
                      borderColor="$outlineVariant"
                      height={56}
                    >
                      <BodyText
                        color="$onSurfaceVariant"
                        fontSize={16}
                        fontWeight="700"
                        mr={6}
                      >
                        @
                      </BodyText>
                      <TextInput
                        placeholder="your_handle"
                        placeholderTextColor="#6C727F"
                        value={instagram}
                        onChangeText={setInstagram}
                        autoCapitalize="none"
                        style={{
                          flex: 1,
                          fontFamily: "Inter",
                          fontSize: 16,
                          color: "#FFFFFF",
                          fontWeight: "600",
                        }}
                      />
                    </XStack>
                  </YStack>

                  <TouchableOpacity
                    onPress={handleNextOrSubmit}
                    activeOpacity={!isLoading ? 0.8 : 0.4}
                    disabled={isLoading}
                  >
                    <YStack
                      bg="#47A1FF"
                      h={64}
                      borderRadius={32}
                      ai="center"
                      jc="center"
                      mb={18}
                      opacity={isLoading ? 0.6 : 1}
                      style={{
                        shadowColor: "#47A1FF",
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                      }}
                    >
                      <BodyText color="#111317" fontWeight="900" fontSize={16}>
                        {isLoading ? "Creating Account..." : "Complete Signup"}
                      </BodyText>
                    </YStack>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNextOrSubmit}
                    activeOpacity={0.7}
                  >
                    <YStack ai="center">
                      <BodyText
                        color="$onSurfaceVariant"
                        fontSize={14}
                        fontWeight="700"
                      >
                        Skip these steps for now →
                      </BodyText>
                    </YStack>
                  </TouchableOpacity>
                </YStack>
              </MotiView>
            )}

            {/* Privacy note */}
            <YStack
              w="100%"
              bg="$surfaceContainerLow"
              borderRadius={28}
              p={28}
              borderWidth={1}
              borderColor="$outlineVariant"
              style={{ opacity: 0.9 }}
            >
              <XStack gap={20} ai="flex-start">
                <YStack
                  w={40}
                  h={40}
                  borderRadius={12}
                  bg="rgba(71, 161, 255, 0.1)"
                  ai="center"
                  jc="center"
                >
                  <ShieldCheck color="#47A1FF" size={24} />
                </YStack>
                <YStack f={1}>
                  <BodyText fontWeight="800" fontSize={16} mb={6}>
                    Your Privacy Guarantee
                  </BodyText>
                  <BodyText
                    fontSize={13}
                    color="$onSurfaceVariant"
                    lineHeight={20}
                  >
                    Presence data is end-to-end encrypted. Social handles are
                    only exposed to friends you've specifically approved in your
                    circles.
                  </BodyText>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>

        {/* University Picker via BottomSheetModal */}
        <BottomSheetModal
          visible={uniPickerOpen}
          onClose={() => setUniPickerOpen(false)}
          title="Select Your Campus"
        >
          <YStack pt={10}>
            {unis.map((uni) => (
              <TouchableOpacity
                key={uni}
                onPress={() => {
                  setUniversity(uni);
                  setUniPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <XStack
                  py={20}
                  px={8}
                  borderBottomWidth={1}
                  borderBottomColor="$outlineVariant"
                  ai="center"
                  jc="space-between"
                >
                  <BodyText
                    fontSize={17}
                    fontWeight={university === uni ? "900" : "600"}
                    color={university === uni ? "#47A1FF" : "$onSurface"}
                  >
                    {uni}
                  </BodyText>
                  {university === uni && (
                    <CheckCircle color="#47A1FF" size={20} fill="#47A1FF" />
                  )}
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
        </BottomSheetModal>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
