import React from 'react';
import { Switch, TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

/**
 * PrivacyToggleRow — a settings-style labeled switch row
 * @param {React.ComponentType} Icon - Lucide icon
 * @param {string} iconColor - icon and accent color
 * @param {string} iconBg - icon background
 * @param {string} title - row heading
 * @param {string} description - secondary text
 * @param {boolean} value - switch state
 * @param {function} onValueChange - switch handler
 */
export const PrivacyToggleRow = ({
  Icon,
  iconColor = '#47A1FF',
  iconBg = 'rgba(71, 161, 255, 0.15)',
  title,
  description,
  value,
  onValueChange,
}) => (
  <XStack
    bg="$surfaceContainerLow"
    borderRadius={20}
    p={20}
    mb={16}
    ai="center"
    borderWidth={1}
    borderColor="$outlineVariant"
  >
    {Icon && (
      <YStack w={44} h={44} borderRadius={14} bg={iconBg} ai="center" jc="center" mr={16}>
        <Icon color={iconColor} size={22} />
      </YStack>
    )}
    <YStack f={1} mr={16}>
      <BodyText fontWeight="700" fontSize={16}>{title}</BodyText>
      {description && (
        <BodyText fontSize={13} color="$onSurfaceVariant" mt={6} lineHeight={18}>
          {description}
        </BodyText>
      )}
    </YStack>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#2A2D33', true: '#47A1FF' }}
      thumbColor={value ? '#FFFFFF' : '#8A919D'}
    />
  </XStack>
);

