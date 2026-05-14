import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, Input } from 'tamagui';
import { Link as LinkIcon, Check } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';

/**
 * MessengerLinkSheet — admin sheet to set/edit messenger group URL
 * @param {string} currentUrl - pre-filled URL value
 * @param {function} onSave - called with the new URL string
 */
export const MessengerLinkSheet = ({ visible, onClose, currentUrl = '', onSave }) => {
  const [url, setUrl] = useState(currentUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!url.trim()) return;
    setSaved(true);
    onSave?.(url.trim());
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Messenger Link">
      <BodyText color="$onSurfaceVariant" fontSize={14} mb={20} lineHeight={20}>
        Paste the invite link to your group chat (Messenger, WhatsApp, Telegram, etc.).
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
        <LinkIcon color="$onSurfaceVariant" size={20} style={{ marginRight: 12 }} />
        <Input
          unstyled
          placeholder="https://m.me/group/..."
          placeholderTextColor="$onSurfaceVariant"
          value={url}
          onChangeText={(t) => { setUrl(t); setSaved(false); }}
          autoCapitalize="none"
          keyboardType="url"
          color="$onSurface"
          fontSize={15}
          f={1}
          py={16}
        />
      </XStack>

      <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
        <YStack
          bg={saved ? '#2AE500' : '#47A1FF'}
          borderRadius={999}
          py={16}
          ai="center"
        >
          <XStack ai="center" gap={8}>
            {saved && <Check color="#111317" size={18} />}
            <BodyText fontWeight="800" color="#111317">
              {saved ? 'Link Saved!' : 'Save Link'}
            </BodyText>
          </XStack>
        </YStack>
      </TouchableOpacity>
    </BottomSheetModal>
  );
};
