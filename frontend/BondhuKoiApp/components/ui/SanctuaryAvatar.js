import React, { useState } from 'react';
import { Image } from 'react-native';
import { YStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

const AVATAR_COLORS = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
};

/**
 * Get stable color based on name/id (standardized hash logic)
 */
export const getStableColor = (name = '') => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * SanctuaryAvatar — standardized avatar with fallback logic
 */
export const SanctuaryAvatar = ({ 
  url, 
  name, 
  id, 
  size = 40, 
  borderWidth = 0, 
  borderColor = 'transparent' 
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const bgColor = getStableColor(name || id || '');

  const showFallback = !url || imageError;

  return (
    <YStack
      w={size}
      h={size}
      borderRadius={size / 2}
      bg={bgColor}
      ai="center"
      jc="center"
      overflow="hidden"
      borderWidth={borderWidth}
      borderColor={borderColor}
    >
      {!showFallback ? (
        <Image 
          source={{ uri: url }} 
          style={{ width: '100%', height: '100%' }} 
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <BodyText fontSize={size * 0.4} fontWeight="800" color="#FFFFFF">
          {initials}
        </BodyText>
      )}
    </YStack>
  );
};
