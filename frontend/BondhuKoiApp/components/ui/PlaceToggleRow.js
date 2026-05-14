import React from 'react';
import { Switch } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { MapPin } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';

/**
 * PlaceToggleRow — a place with an active/inactive visibility toggle
 * @param {string} name - place name
 * @param {boolean} active - whether sharing is active for this place
 * @param {function} onToggle - toggle handler
 */
export const PlaceToggleRow = ({ name, active, onToggle }) => (
  <XStack
    ai="center"
    jc="space-between"
    py={14}
    px={4}
    borderBottomWidth={1}
    borderBottomColor="$outlineVariant"
  >
    <XStack ai="center" gap={12}>
      <MapPin color={active ? '#47A1FF' : '$onSurfaceVariant'} size={16} />
      <BodyText fontWeight={active ? '700' : '500'} color={active ? '$onSurface' : '$onSurfaceVariant'}>
        {name}
      </BodyText>
    </XStack>
    <XStack ai="center" gap={10}>
      <YStack
        px={10}
        py={4}
        borderRadius={999}
        bg={active ? 'rgba(42, 229, 0, 0.12)' : '$surfaceContainerHighest'}
      >
        <BodyText fontSize={11} fontWeight="800" color={active ? '#2AE500' : '$onSurfaceVariant'}>
          {active ? 'ACTIVE' : 'OFF'}
        </BodyText>
      </YStack>
      <Switch
        value={active}
        onValueChange={onToggle}
        trackColor={{ false: '#2A2D33', true: '#47A1FF' }}
        thumbColor={active ? '#FFFFFF' : '#8A919D'}
      />
    </XStack>
  </XStack>
);
