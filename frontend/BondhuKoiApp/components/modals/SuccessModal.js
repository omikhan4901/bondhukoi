import React, { useEffect } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';

/**
 * SuccessModal — elegant success confirmation dialog
 * Auto-dismisses after 2 seconds or on press
 * @param {boolean} visible
 * @param {function} onDismiss - dismiss handler
 * @param {string} title - success heading
 * @param {string} message - success message
 */
export const SuccessModal = ({
  visible,
  onDismiss,
  title = 'Success',
  message = 'Operation completed',
}) => {
  // Auto-close after 2 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
          <YStack
            bg="$surfaceContainerHigh"
            borderRadius={28}
            p={28}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.08)"
            ai="center"
          >
            <CheckCircle size={56} color="#34C759" strokeWidth={1.5} />
            <Heading fontSize={22} ta="center" mt={16}>{title}</Heading>
            {!!message && (
              <BodyText color="$onSurfaceVariant" fontSize={16} ta="center" mt={12}>{message}</BodyText>
            )}
          </YStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
