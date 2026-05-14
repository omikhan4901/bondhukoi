import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { Bell, BellOff } from '@tamagui/lucide-icons-2';

/**
 * WatchBadge — bell icon button for toggling watch status on a friend
 * @param {boolean} isWatched - currently watching this friend
 * @param {boolean} isPending - watch request sent but not yet accepted
 * @param {function} onPress - handler
 * @param {number} size - icon size (default 20)
 */
export const WatchBadge = ({ isWatched = false, isPending = false, onPress, size = 20 }) => {
  const bg = isWatched
    ? 'rgba(255, 215, 0, 0.15)'
    : isPending
    ? 'rgba(255, 165, 0, 0.12)'
    : '$surfaceContainerHighest';

  const color = isWatched ? '#FFD700' : isPending ? '#FFA500' : '$onSurfaceVariant';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <YStack
        w={size + 16}
        h={size + 16}
        borderRadius="$full"
        bg={bg}
        ai="center"
        jc="center"
        borderWidth={1}
        borderColor={isWatched ? 'rgba(255,215,0,0.3)' : isPending ? 'rgba(255,165,0,0.2)' : '$outlineVariant'}
      >
        {isWatched
          ? <Bell color={color} size={size} fill={color} />
          : <Bell color={color} size={size} />}
      </YStack>
    </TouchableOpacity>
  );
};
