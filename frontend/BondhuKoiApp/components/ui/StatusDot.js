import React from 'react';
import { YStack } from 'tamagui';

/**
 * StatusDot — binary presence indicator
 * @param {boolean} active - true = inside (filled green), false = outside (hollow)
 * @param {number} size - diameter in dp (default 8)
 */
export const StatusDot = ({ active = false, size = 8 }) => {
  if (active) {
    return (
      <YStack
        w={size}
        h={size}
        borderRadius={size / 2}
        bg="#2AE500"
        style={{ shadowColor: '#2ae500', shadowOpacity: 0.5, shadowRadius: 6 }}
      />
    );
  }
  return (
    <YStack
      w={size}
      h={size}
      borderRadius={size / 2}
      borderColor="$outlineVariant"
      borderWidth={2}
    />
  );
};
