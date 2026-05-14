import React, { useState } from 'react';
import { TouchableOpacity, Linking } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { ExternalLink, MessageCircle, Instagram, Facebook, X } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { GhostInput } from '../SanctuaryComponents';

const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook / Messenger',
    Icon: MessageCircle,
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.12)',
    placeholder: '@your.facebook.id',
    urlPrefix: 'https://facebook.com/',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: Instagram,
    color: '#E1306C',
    bg: 'rgba(225, 48, 108, 0.12)',
    placeholder: '@your_instagram',
    urlPrefix: 'https://instagram.com/',
  },
];

/**
 * EditSocialSheet — edit a single social handle
 */
export const EditSocialSheet = ({ visible, onClose, platformKey, currentValue, onSave, onRemove }) => {
  const [value, setValue] = useState(currentValue || '');
  const platform = PLATFORMS.find((p) => p.key === platformKey);
  if (!platform) return null;

  const handleSave = () => {
    onSave?.(platformKey, value.trim());
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={platform.label}>
      <XStack ai="center" gap={12} mb={24} pb={20} borderBottomWidth={1} borderBottomColor="$outlineVariant">
        <YStack w={44} h={44} borderRadius={14} bg={platform.bg} ai="center" jc="center">
          <platform.Icon color={platform.color} size={24} />
        </YStack>
        <BodyText color="$onSurfaceVariant" fontSize={14} f={1} lineHeight={20}>
          Enter your handle so friends can find you and connect outside the app.
        </BodyText>
      </XStack>

      <BodyText fontWeight="700" mb={8} fontSize={14}>Handle / Username</BodyText>
      <XStack bg="$surfaceContainerHigh" borderRadius={16} px={16} ai="center"
        borderWidth={1} borderColor="$outlineVariant" height={52} mb={24}>
        <BodyText color="$onSurfaceVariant" mr={4}>@</BodyText>
        <GhostInput
          value={value.replace('@', '')}
          onChangeText={(v) => setValue('@' + v)}
          placeholder={platform.placeholder.replace('@', '')}
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
      </XStack>

      <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
        <YStack bg="#47A1FF" borderRadius={999} py={15} ai="center" mb={12}>
          <BodyText fontWeight="800" color="#111317">Save Handle</BodyText>
        </YStack>
      </TouchableOpacity>

      {currentValue && (
        <TouchableOpacity onPress={() => { onRemove?.(platformKey); onClose(); }} activeOpacity={0.8}>
          <YStack bg="rgba(255,69,58,0.1)" borderRadius={999} py={13} ai="center"
            borderWidth={1} borderColor="rgba(255,69,58,0.2)">
            <BodyText fontWeight="700" color="#FF453A">Remove</BodyText>
          </YStack>
        </TouchableOpacity>
      )}
    </BottomSheetModal>
  );
};
