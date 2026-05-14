import React from 'react';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';
import { SanctuaryAvatar } from '../ui/SanctuaryAvatar';

/**
 * WatchAlertItem — priority notification row with gold star indicator
 * @param {string} friendName
 * @param {string} avatarUrl
 * @param {string} avatarId
 * @param {string} action - e.g. "entered NSU Campus"
 * @param {string} time - e.g. "3m"
 * @param {string} scope - 'campus' | 'all'
 */
export const WatchAlertItem = ({ 
  friendName, 
  avatarUrl,
  avatarId,
  action, 
  time, 
  scope = 'campus' 
}) => (
  <XStack
    bg="rgba(255, 215, 0, 0.06)"
    borderRadius={20}
    p={16}
    mb={10}
    ai="center"
    gap={14}
    borderWidth={1}
    borderColor="rgba(255, 215, 0, 0.18)"
  >
    {/* Avatar with optional star badge overlay could be added, but for now just the avatar replacing the star as requested */}
    <YStack>
      <SanctuaryAvatar
        url={avatarUrl}
        name={friendName}
        id={avatarId}
        size={44}
        borderWidth={2}
        borderColor="rgba(255, 215, 0, 0.3)"
      />
      <YStack
        position="absolute"
        bottom={-2}
        right={-2}
        w={18}
        h={18}
        borderRadius="$full"
        bg="#FFD700"
        ai="center"
        jc="center"
        borderWidth={2}
        borderColor="rgba(17, 19, 23, 1)"
      >
        <BodyText fontSize={10} color="#111317">★</BodyText>
      </YStack>
    </YStack>

    <YStack f={1}>
      <XStack ai="center" gap={6} mb={2}>
        <BodyText fontWeight="800" color="#FFD700" fontSize={14}>{friendName}</BodyText>
        <YStack px={7} py={2} borderRadius={999} bg="rgba(255,215,0,0.1)">
          <BodyText fontSize={10} fontWeight="800" color="#FFD700">
            {scope === 'campus' ? 'CAMPUS' : 'ALL ZONES'}
          </BodyText>
        </YStack>
      </XStack>
      <BodyText fontSize={13} color="$onSurfaceVariant">{action}</BodyText>
    </YStack>

    <BodyText fontSize={12} color="$outlineVariant">{time}</BodyText>
  </XStack>
);
