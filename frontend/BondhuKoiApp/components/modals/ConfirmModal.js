import React from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Heading, BodyText } from '../SanctuaryComponents';

/**
 * ConfirmModal — centered dialog for destructive or confirmation actions
 * @param {boolean} visible
 * @param {function} onClose - cancel handler
 * @param {function} onConfirm - confirm handler
 * @param {string} title - dialog heading
 * @param {string} message - dialog body text
 * @param {string} confirmLabel - confirm button label (default "Confirm")
 * @param {'red'|'blue'} confirmVariant - confirm button colour
 */
export const ConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  confirmVariant = 'blue',
}) => {
  const confirmBg = confirmVariant === 'red' ? '#FF453A' : '#47A1FF';
  const confirmTextColor = '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
          <YStack
            bg="$surfaceContainerHigh"
            borderRadius={28}
            p={28}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.08)"
          >
            <Heading fontSize={22} mb={12} ta="center">{title}</Heading>
            {!!message && (
              <BodyText color="$onSurfaceVariant" fontSize={15} lineHeight={22} mb={28} ta="center">
                {message}
              </BodyText>
            )}

            <XStack gap={12}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ flex: 1 }}>
                <YStack
                  bg="$surfaceContainerHighest"
                  borderRadius={999}
                  py={14}
                  ai="center"
                  borderWidth={1}
                  borderColor="$outlineVariant"
                >
                  <BodyText fontWeight="700">Cancel</BodyText>
                </YStack>
              </TouchableOpacity>

              <TouchableOpacity onPress={onConfirm} activeOpacity={0.8} style={{ flex: 1 }}>
                <YStack
                  bg={confirmBg}
                  borderRadius={999}
                  py={14}
                  ai="center"
                >
                  <BodyText fontWeight="800" color={confirmTextColor}>{confirmLabel}</BodyText>
                </YStack>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
