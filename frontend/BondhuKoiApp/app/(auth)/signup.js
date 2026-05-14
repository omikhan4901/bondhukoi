import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { YStack, XStack } from "tamagui";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { BottomSheetModal } from "../../components/modals/BottomSheetModal";
import {
  SanctuaryPage,
  Heading,
  LabelText,
  BodyText,
  GhostInput,
  LineSeparator,
} from "../../components/SanctuaryComponents";
import {
  ShieldCheck,
  ChevronDown,
  Camera,
  Facebook,
  Instagram,
  CheckCircle,
  AlertCircle,
} from "@tamagui/lucide-icons-2";
import { authService, userService } from "../../src/services/api";
import { useAuth } from "../../src/hooks/useAuth";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { View as MotiView } from "moti";

const STEP_LABELS = ["Account", "Profile & Socials"];

export default function SignupScreen() {
  const router = useRouter();
  const { signup, login } = useAuth();
  const params = useLocalSearchParams();
  const fromGoogle = params.fromGoogle === "true";

  const [name, setName] = useState(params.name || "");
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarMime, setAvatarMime] = useState(null);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [uniPickerOpen, setUniPickerOpen] = useState(false);
  const [unis, setUnis] = useState([]);

  const step1Valid = name.trim() && email.trim() && (fromGoogle ? true : password.trim()) && university;

  useEffect(() => {
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
    const manipulated = await manipulateAsync(asset.uri, [{ resize: { width: 300, height: 300 } }], { compress: 0.5, format: SaveFormat.JPEG });
    setAvatarMime("image/jpeg");
    const b64 = await readAsStringAsync(manipulated.uri, { encoding: EncodingType.Base64 });
    setAvatarBase64(b64);
  };

  const handleNextOrSubmit = async () => {
    if (step === 0) {
      if (!step1Valid) return;
      setStep(1);
    } else {
      try {
        setIsLoading(true);
        setError(null);
        
        await authService.signup(name, email, password, university, facebook || null, instagram || null);
        const loginResult = await login(email, password);
        if (!loginResult.success) throw new Error(loginResult.error);

        if (avatarBase64) {
          try {
            await userService.uploadAvatar(avatarBase64, avatarMime);
          } catch (avatarErr) {
            console.warn("Avatar upload failed, continuing:", avatarErr.message);
          }
        }
        router.replace("/(tabs)");
      } catch (err) {
        setError(err.message || "Signup failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <SanctuaryPage>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 60, flexGrow: 1 }}>
          <YStack ai="center" w="100%">
            <Heading textAlign="center" mb={12} fontSize={44}>Bondhu Koi?</Heading>
            <BodyText color="$onSurfaceVariant" textAlign="center" mb={44}>Connect with your campus community.</BodyText>

            {error && (
              <YStack bg="rgba(255,69,58,0.1)" p={16} mb={32} borderRadius={20} ai="center">
                <BodyText color="#FF453A">{error}</BodyText>
              </YStack>
            )}

            {step === 0 ? (
              <YStack w="100%" bg="$surfaceContainerLow" p={32} borderRadius={40}>
                <LabelText mb={10}>Full Name</LabelText>
                <GhostInput placeholder="Ariful Islam" value={name} onChangeText={setName} />
                <YStack mt={20}>
                  <LabelText mb={10}>University</LabelText>
                  <TouchableOpacity onPress={() => setUniPickerOpen(true)}><XStack h={60} bg="$surfaceContainerHigh" ai="center" jc="space-between" px={20} borderRadius={18}><BodyText>{university || "Select campus..."}</BodyText><ChevronDown size={20} /></XStack></TouchableOpacity>
                </YStack>
                <YStack mt={20} mb={32}>
                  <LabelText mb={10}>Institutional Email</LabelText>
                  <GhostInput placeholder="name@northsouth.edu" value={email} onChangeText={setEmail} />
                </YStack>
                {!fromGoogle && (
                  <YStack mb={32}>
                    <LabelText mb={10}>Password</LabelText>
                    <GhostInput placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
                  </YStack>
                )}
                <TouchableOpacity onPress={handleNextOrSubmit} disabled={!step1Valid || isLoading}>
                  <YStack bg={step1Valid ? "#47A1FF" : "$surfaceContainerHighest"} h={64} borderRadius={32} ai="center" jc="center">
                    <BodyText fontWeight="900" color={step1Valid ? "#111317" : "$onSurfaceVariant"}>Continue →</BodyText>
                  </YStack>
                </TouchableOpacity>
                <XStack jc="center" mt={24}>
                  <BodyText>Already a member? <Link href="/(auth)/login"><BodyText color="#47A1FF" fontWeight="800">Login</BodyText></Link></BodyText>
                </XStack>
              </YStack>
            ) : (
              <YStack w="100%" bg="$surfaceContainerLow" p={32} borderRadius={40}>
                <YStack ai="center" mb={32}>
                  <TouchableOpacity onPress={pickAvatar}>
                    <YStack w={120} h={120} borderRadius={60} bg="$surfaceContainerHighest" ai="center" jc="center" overflow="hidden">
                      {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: 120, height: 120 }} /> : <Camera size={44} />}
                    </YStack>
                  </TouchableOpacity>
                </YStack>
                <TouchableOpacity onPress={handleNextOrSubmit} disabled={isLoading}>
                  <YStack bg="#47A1FF" h={64} borderRadius={32} ai="center" jc="center">
                    <BodyText fontWeight="900" color="#111317">{isLoading ? "Loading..." : "Complete Signup"}</BodyText>
                  </YStack>
                </TouchableOpacity>
              </YStack>
            )}
          </YStack>
        </ScrollView>
        <BottomSheetModal visible={uniPickerOpen} onClose={() => setUniPickerOpen(false)} title="Select Your Campus">
          <YStack p={20}>{unis.map(u => <TouchableOpacity key={u} onPress={() => { setUniversity(u); setUniPickerOpen(false); }} style={{ paddingVertical: 15 }}><BodyText>{u}</BodyText></TouchableOpacity>)}</YStack>
        </BottomSheetModal>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
