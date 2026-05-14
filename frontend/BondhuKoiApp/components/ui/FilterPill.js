import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

/**
 * FilterPill — selectable rounded filter chip
 * @param {string} label - display text
 * @param {boolean} active - whether this pill is selected
 * @param {function} onPress - tap handler
 */
export const FilterPill = ({ label, active = false, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <YStack
      bg={active ? '#0056D2' : '$surfaceContainerHigh'}
      px={20}
      py={10}
      borderRadius={999}
      mr={12}
      borderWidth={1}
      borderColor={active ? '#0056D2' : '$outlineVariant'}
    >
      <BodyText
        fontWeight="700"
        fontSize={14}
        color={active ? '#FFFFFF' : '$onSurfaceVariant'}
      >
        {label}
      </BodyText>
    </YStack>
  </TouchableOpacity>
);
