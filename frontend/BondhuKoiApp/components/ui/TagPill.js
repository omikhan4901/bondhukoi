import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

/**
 * TagPill — selectable category tag chip used in create screens
 * @param {string} label - display text
 * @param {boolean} active - whether selected
 * @param {function} onPress - tap handler
 * @param {number} mr - margin right (default 12)
 */
export const TagPill = ({ label, active = false, onPress, mr = 12 }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <YStack
      bg={active ? '#47A1FF' : '$surfaceContainerHigh'}
      px={16}
      py={10}
      borderRadius={999}
      mr={mr}
      borderWidth={1}
      borderColor={active ? '#47A1FF' : '$outlineVariant'}
    >
      <BodyText
        fontWeight="700"
        fontSize={14}
        color={active ? '#111317' : '$onSurfaceVariant'}
      >
        {label}
      </BodyText>
    </YStack>
  </TouchableOpacity>
);
