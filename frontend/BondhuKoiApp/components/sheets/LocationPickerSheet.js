import React, { useState } from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import { YStack, XStack, Input } from 'tamagui';
import { MapPin, Check } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';

const QUICK_PICKS = [
  'NSU Main Campus', 'Central Library', 'Student Lounge',
  'Cafeteria', 'North Gate', 'Auditorium', 'Sports Complex',
];

/**
 * LocationPickerSheet — admin sheet to set/edit circle boundary location
 * @param {string} currentLocation - pre-filled value
 * @param {function} onSave - called with the new location string
 */
export const LocationPickerSheet = ({ visible, onClose, currentLocation = '', onSave }) => {
  const [name, setName] = useState(currentLocation);
  const [saved, setSaved] = useState(false);

  const handlePick = (loc) => setName(loc);

  const handleSave = () => {
    if (!name.trim()) return;
    setSaved(true);
    onSave?.(name.trim());
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Circle Base Location">
      <BodyText color="$onSurfaceVariant" fontSize={14} mb={16} lineHeight={20}>
        Set the boundary name or pick a preset campus zone.
      </BodyText>

      <XStack
        bg="$surfaceContainerLow"
        borderRadius={16}
        px={16}
        mb={16}
        ai="center"
        borderWidth={1}
        borderColor="$outlineVariant"
      >
        <MapPin color="$onSurfaceVariant" size={20} style={{ marginRight: 12 }} />
        <Input
          unstyled
          placeholder="Location name..."
          placeholderTextColor="$onSurfaceVariant"
          value={name}
          onChangeText={(t) => { setName(t); setSaved(false); }}
          color="$onSurface"
          fontSize={16}
          f={1}
          py={16}
        />
      </XStack>

      {/* Quick picks */}
      <BodyText fontWeight="700" fontSize={12} color="$onSurfaceVariant" mb={10}
        textTransform="uppercase" letterSpacing={1}>
        Quick Picks
      </BodyText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
        contentContainerStyle={{ paddingBottom: 4 }}>
        {QUICK_PICKS.map((loc) => (
          <TouchableOpacity key={loc} onPress={() => handlePick(loc)} activeOpacity={0.8}>
            <YStack
              bg={name === loc ? 'rgba(71, 161, 255, 0.15)' : '$surfaceContainerLow'}
              px={14} py={8} borderRadius={999} mr={10}
              borderWidth={1}
              borderColor={name === loc ? '#47A1FF' : '$outlineVariant'}
            >
              <BodyText fontSize={13} fontWeight="700" color={name === loc ? '#47A1FF' : '$onSurfaceVariant'}>
                {loc}
              </BodyText>
            </YStack>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
        <YStack bg={saved ? '#2AE500' : '#47A1FF'} borderRadius={999} py={16} ai="center">
          <XStack ai="center" gap={8}>
            {saved && <Check color="#111317" size={18} />}
            <BodyText fontWeight="800" color="#111317">
              {saved ? 'Saved!' : 'Save Location'}
            </BodyText>
          </XStack>
        </YStack>
      </TouchableOpacity>
    </BottomSheetModal>
  );
};
