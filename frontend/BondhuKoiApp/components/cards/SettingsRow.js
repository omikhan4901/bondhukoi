import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';

/**
 * SettingsRow — tappable settings menu row
 * @param {React.ComponentType} Icon - Lucide icon
 * @param {string} label - row label
 * @param {string} subtitle - optional secondary line
 * @param {function} onPress - tap handler
 * @param {'blue'|'red'|'neutral'} variant - accent colour
 */
export const SettingsRow = ({ Icon, label, subtitle, onPress, variant = 'blue' }) => {
  const accent = { blue: '#47A1FF', red: '#FF453A', neutral: '$onSurfaceVariant' };
  const iconBg = { blue: 'rgba(71, 161, 255, 0.15)', red: 'rgba(255, 69, 58, 0.1)', neutral: '$surfaceContainerHighest' };
  const color = accent[variant] || accent.blue;
  const bg = iconBg[variant] || iconBg.blue;
  const isDestructive = variant === 'red';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <XStack
        bg={isDestructive ? 'rgba(255, 69, 58, 0.08)' : '$surfaceContainerLow'}
        py={18}
        px={20}
        mb={12}
        borderRadius={20}
        ai="center"
        jc="space-between"
        borderWidth={1}
        borderColor={isDestructive ? 'rgba(255, 69, 58, 0.2)' : '$outlineVariant'}
      >
        <XStack ai="center" gap={16} f={1}>
          <YStack w={40} h={40} borderRadius={12} bg={bg} ai="center" jc="center">
            <Icon color={color} size={20} />
          </YStack>
          <YStack f={1}>
            <BodyText fontWeight="700" fontSize={16} color={isDestructive ? '#FF453A' : '$onSurface'}>
              {label}
            </BodyText>
            {subtitle && (
              <BodyText fontSize={13} color="$onSurfaceVariant" mt={2}>{subtitle}</BodyText>
            )}
          </YStack>
        </XStack>
        {!isDestructive && <ChevronRight color="$onSurfaceVariant" size={20} />}
      </XStack>
    </TouchableOpacity>
  );
};
