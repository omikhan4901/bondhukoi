import React from 'react';
import { YStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

/**
 * RoleBadge — displays a role label (e.g., ADMIN, MOD)
 * @param {string} label - text to display (uppercase internally)
 * @param {'gold'|'blue'} variant - color variant
 */
export const RoleBadge = ({ label = 'ADMIN', variant = 'gold' }) => {
  const config = {
    gold: { bg: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' },
    blue: { bg: 'rgba(71, 161, 255, 0.15)', color: '#47A1FF' },
  };
  const { bg, color } = config[variant] || config.gold;

  return (
    <YStack bg={bg} px={6} py={2} borderRadius={4}>
      <BodyText fontSize={10} color={color} fontWeight="800">
        {label.toUpperCase()}
      </BodyText>
    </YStack>
  );
};
