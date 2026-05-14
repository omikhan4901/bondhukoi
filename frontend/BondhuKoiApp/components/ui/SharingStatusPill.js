import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { useAuth } from '../../src/hooks/useAuth';

/**
 * SharingStatusPill — Reusable sharing status indicator
 * Reads from auth context and displays "Sharing" or "Paused"
 * @param {function} onPress - Handler when pill is tapped
 * @param {number} size - Icon/text size (defaults to 13)
 */
export const SharingStatusPill = ({ onPress, size = 13 }) => {
  const { user } = useAuth();
  
  // Sharing is paused when isSharingEnabled is false
  const isPaused = user?.isSharingEnabled === false;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <XStack
        bg={isPaused ? 'rgba(255,69,58,0.12)' : 'rgba(42,229,0,0.1)'}
        px={14} py={8} borderRadius={999}
        ai="center" gap={6}
        borderWidth={1}
        borderColor={isPaused ? 'rgba(255,69,58,0.25)' : 'rgba(42,229,0,0.2)'}
      >
        {isPaused ? <EyeOff color="#FF453A" size={size} /> : <Eye color="#2AE500" size={size} />}
        <BodyText fontSize={size} fontWeight="800" color={isPaused ? '#FF453A' : '#2AE500'}>
          {isPaused ? 'Paused' : 'Sharing'}
        </BodyText>
      </XStack>
    </TouchableOpacity>
  );
};
