import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { GraduationCap, ExternalLink } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';

/**
 * VerifiedUniversityCard — verified university affiliation card in settings
 * @param {string} universityName - display name
 * @param {function} onHandbook - tap Student Handbook cta
 * @param {function} onSwitch - tap Switch Network cta
 */
export const VerifiedUniversityCard = ({ universityName = 'North South University', onHandbook, onSwitch }) => (
  <YStack
    bg="#0D192B"
    borderRadius={28}
    p={24}
    borderWidth={1}
    borderColor="rgba(71, 161, 255, 0.2)"
    overflow="hidden"
  >
    {/* Decorative bg glow */}
    <YStack
      position="absolute" top={-60} right={-60}
      w={180} h={180} borderRadius="$full"
      bg="rgba(71, 161, 255, 0.06)"
    />

    {/* Verified pill */}
    <XStack
      bg="rgba(42, 229, 0, 0.12)"
      px={12} py={6}
      borderRadius={999}
      ai="center"
      gap={6}
      alignSelf="flex-start"
      mb={16}
      borderWidth={1}
      borderColor="rgba(42,229,0,0.2)"
    >
      <YStack w={7} h={7} borderRadius="$full" bg="#2AE500" />
      <BodyText fontSize={11} fontWeight="800" color="#2AE500" letterSpacing={1}>
        VERIFIED CAMPUS
      </BodyText>
    </XStack>

    <XStack ai="center" gap={12} mb={8}>
      <YStack w={40} h={40} borderRadius={12} bg="rgba(71,161,255,0.15)" ai="center" jc="center">
        <GraduationCap color="#47A1FF" size={22} />
      </YStack>
      <YStack f={1}>
        <Heading fontSize={18} color="#FFFFFF" lineHeight={22}>{universityName}</Heading>
        <BodyText fontSize={13} color="rgba(255,255,255,0.5)">Network</BodyText>
      </YStack>
    </XStack>

    <BodyText color="rgba(255,255,255,0.55)" fontSize={14} lineHeight={20} mb={20}>
      You are part of the official student network. This lets you join verified groups and discover campus‑only locations.
    </BodyText>

    <XStack gap={12}>
      <TouchableOpacity onPress={onHandbook} activeOpacity={0.8} style={{ flex: 1 }}>
        <YStack bg="rgba(71,161,255,0.15)" borderRadius={14} py={13} ai="center" borderWidth={1} borderColor="rgba(71,161,255,0.25)">
          <BodyText fontWeight="700" color="#47A1FF" fontSize={14}>Student Handbook</BodyText>
        </YStack>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitch} activeOpacity={0.8} style={{ flex: 1 }}>
        <YStack bg="$surfaceContainerHighest" borderRadius={14} py={13} ai="center" borderWidth={1} borderColor="$outlineVariant">
          <BodyText fontWeight="700" color="$onSurfaceVariant" fontSize={14}>Switch Network</BodyText>
        </YStack>
      </TouchableOpacity>
    </XStack>
  </YStack>
);
