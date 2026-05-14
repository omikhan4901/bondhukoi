import React from 'react';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';
import { SanctuaryAvatar } from '../ui/SanctuaryAvatar';

/**
 * NotificationItem — a single notification row
 * @param {React.ComponentType} Icon - Lucide icon component (fallback)
 * @param {string} avatarUrl - user avatar url
 * @param {string} avatarName - user name for initials
 * @param {string} avatarId - user id for stable color
 * @param {string} title - bold heading text
 * @param {string} subtitle - secondary text
 * @param {string} time - timestamp label (e.g. "2m", "3h")
 * @param {'blue'|'neutral'} variant - icon bg colour
 */
export const NotificationItem = ({ 
  Icon, 
  avatarUrl,
  avatarName,
  avatarId,
  title, 
  subtitle, 
  time, 
  variant = 'neutral' 
}) => {
  const iconBg = variant === 'blue' ? 'rgba(71, 161, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  const iconColor = variant === 'blue' ? '$primary' : '$onSurface';

  const showAvatar = !!avatarUrl || !!avatarName;

  return (
    <XStack
      bg="$surfaceContainerLow"
      borderRadius={24}
      p={20}
      mb={16}
      ai="center"
      gap={20}
      borderWidth={1}
      borderColor="$outlineVariant"
    >
      {showAvatar ? (
        <SanctuaryAvatar
          url={avatarUrl}
          name={avatarName}
          id={avatarId}
          size={44}
        />
      ) : (
        <YStack w={44} h={44} borderRadius="$full" bg={iconBg} ai="center" jc="center">
          <Icon color={iconColor} size={22} />
        </YStack>
      )}
      <YStack f={1}>
        <BodyText fontWeight="700">{title}</BodyText>
        <BodyText fontSize={13} color="$onSurfaceVariant" mt={2}>{subtitle}</BodyText>
      </YStack>
      <BodyText fontSize={12} color="$outlineVariant">{time}</BodyText>
    </XStack>
  );
};
