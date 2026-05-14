import React from 'react';
import { TouchableOpacity, Switch } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { MapPin, Plus } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { PlaceToggleRow } from '../ui/PlaceToggleRow';

/**
 * ManagePlacesSheet — full list of places with active/inactive toggles
 * @param {Array} places - [{ id, name, active }]
 * @param {function} onToggle - (id) toggle handler
 */
export const ManagePlacesSheet = ({ visible, onClose, places = [], onToggle }) => (
  <BottomSheetModal visible={visible} onClose={onClose} title="Manage Places">
    <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={20} mb={20}>
      Choose which places can detect your presence. Toggle off to go invisible at that location without leaving the place.
    </BodyText>

    {places.length === 0 ? (
      <YStack ai="center" py={20}>
        <BodyText color="$onSurfaceVariant">No places saved yet.</BodyText>
      </YStack>
    ) : (
      places.map((place) => (
        <PlaceToggleRow
          key={place.id}
          name={place.name}
          active={place.active}
          onToggle={() => onToggle?.(place.id)}
        />
      ))
    )}

    <YStack mt={20} pt={16} borderTopWidth={1} borderTopColor="$outlineVariant">
      <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
        <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
          borderWidth={1} borderColor="$outlineVariant">
          <BodyText fontWeight="700">Done</BodyText>
        </YStack>
      </TouchableOpacity>
    </YStack>
  </BottomSheetModal>
);
