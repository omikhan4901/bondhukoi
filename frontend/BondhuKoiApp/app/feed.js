import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../components/SanctuaryComponents';
import { ChevronLeft, Clock } from '@tamagui/lucide-icons-2';

/**
 * FeedScreen — Inner Circle activity feed (coming soon)
 * Shows when location feature is implemented.
 */
export default function FeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" gap={16}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft color="$onSurface" size={28} />
          </TouchableOpacity>
          <YStack f={1}>
            <Heading fontSize={24}>Inner Circle</Heading>
            <BodyText color="$onSurfaceVariant" fontSize={14}>Activity Feed</BodyText>
          </YStack>
        </XStack>

        <YStack f={1} ai="center" jc="center" px={40} pb={60}>
          <YStack
            w={80} h={80} borderRadius="$full"
            bg="rgba(71,161,255,0.1)" ai="center" jc="center"
            mb={24} borderWidth={1} borderColor="rgba(71,161,255,0.2)"
          >
            <Clock color="#47A1FF" size={36} />
          </YStack>
          <Heading fontSize={24} ta="center" mb={12}>Coming Soon</Heading>
          <BodyText color="$onSurfaceVariant" fontSize={15} lineHeight={24} ta="center">
            The activity feed will show real-time check-ins and zone events from your circles once location is enabled.
          </BodyText>
        </YStack>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
