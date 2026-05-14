import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../components/SanctuaryComponents';
import { ChevronLeft, ShieldCheck, Map, Lock } from '@tamagui/lucide-icons-2';

export default function TrustCenterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" gap={16}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="$onSurface" size={28} />
          </TouchableOpacity>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <YStack ai="center" mb={32} mt={16}>
            <ShieldCheck color="$primary" size={64} strokeWidth={1.5} />
            <Heading fontSize={28} ta="center" mt={16}>Trust Center</Heading>
            <BodyText color="$onSurfaceVariant" ta="center" mt={8}>How Bondhu Koi protects your location and identity.</BodyText>
          </YStack>

          <YStack bg="$surfaceContainerLow" borderRadius={24} p={24} mb={16} borderWidth={1} borderColor="$outlineVariant">
             <XStack ai="center" gap={16} mb={12}>
                <Map color="$primary" size={24} />
                <Heading fontSize={18}>Polygon-based Logic</Heading>
             </XStack>
             <BodyText color="$onSurfaceVariant" lineHeight={22}>
               We only track boundary intersections. The app checks locally on your actual device whether your coordinates fall "Inside" or "Outside" a Sanctuary polygon. We don't stream your continuous raw GPS on the map.
             </BodyText>
          </YStack>

          <YStack bg="$surfaceContainerLow" borderRadius={24} p={24} mb={16} borderWidth={1} borderColor="$outlineVariant">
             <XStack ai="center" gap={16} mb={12}>
                <Lock color="$primary" size={24} />
                <Heading fontSize={18}>Never Sent to Servers</Heading>
             </XStack>
             <BodyText color="$onSurfaceVariant" lineHeight={22}>
               Your exact pinpoint GPS coordinates are mathematically reduced to a binary 1 or 0 (Inside/Outside) directly on your hardware. Only the binary state is ever synced with the network.
             </BodyText>
          </YStack>

        </ScrollView>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
