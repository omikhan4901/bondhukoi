import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack, Input } from 'tamagui';
import { Users, Trash2, Check } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';

/**
 * CircleSettingsSheet — admin sheet to rename or delete a circle
 * @param {string} circleId - circle to act on
 * @param {string} currentName - pre-filled circle name
 * @param {function} onSave - async, called with new name
 * @param {function} onDelete - async, called after confirming delete
 */
export const CircleSettingsSheet = ({ visible, onClose, circleId, currentName = '', onSave, onDelete }) => {
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave?.(name.trim());
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err) {
      console.error('Failed to save circle name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.();
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete circle:', err);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Circle Settings">
        <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={10}
          textTransform="uppercase" letterSpacing={1}>
          Circle Name
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
          <Users color="$onSurfaceVariant" size={20} style={{ marginRight: 12 }} />
          <Input
            unstyled
            value={name}
            onChangeText={(t) => { setName(t); setSaved(false); }}
            color="$onSurface"
            fontSize={16}
            f={1}
            py={16}
          />
        </XStack>

        <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={isSaving}>
          <YStack bg={saved ? '#2AE500' : '#47A1FF'} borderRadius={999} py={14} ai="center" mb={24}
            opacity={isSaving ? 0.6 : 1}>
            <XStack ai="center" gap={8}>
              {isSaving ? (
                <ActivityIndicator color="#111317" size="small" />
              ) : saved ? (
                <Check color="#111317" size={18} />
              ) : null}
              <BodyText fontWeight="800" color="#111317">
                {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </BodyText>
            </XStack>
          </YStack>
        </TouchableOpacity>

        {/* Danger zone */}
        <YStack borderTopWidth={1} borderTopColor="$outlineVariant" pt={20}>
          <BodyText fontWeight="700" fontSize={13} color="#FF453A" mb={12}
            textTransform="uppercase" letterSpacing={1}>
            Danger Zone
          </BodyText>
          <TouchableOpacity onPress={() => setConfirmDelete(true)} activeOpacity={0.8} disabled={isDeleting}>
            <XStack
              bg="rgba(255, 69, 58, 0.1)"
              borderRadius={16}
              p={16}
              ai="center"
              gap={12}
              borderWidth={1}
              borderColor="rgba(255, 69, 58, 0.25)"
              opacity={isDeleting ? 0.6 : 1}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FF453A" size="small" />
              ) : (
                <Trash2 color="#FF453A" size={20} />
              )}
              <BodyText fontWeight="700" color="#FF453A">Delete Circle</BodyText>
            </XStack>
          </TouchableOpacity>
        </YStack>
      </BottomSheetModal>

      <ConfirmModal
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Circle?"
        message={`"${currentName}" will be permanently deleted and all members will lose access.`}
        confirmLabel="Delete"
        confirmVariant="red"
      />
    </>
  );
};
