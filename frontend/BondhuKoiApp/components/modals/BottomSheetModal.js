import React from 'react';
import { Modal, TouchableOpacity, Animated } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';

/**
 * BottomSheetModal — reusable slide-up overlay sheet
 * @param {boolean} visible - controls visibility
 * @param {function} onClose - called when backdrop or close handle is tapped
 * @param {React.ReactNode} children - sheet content
 * @param {string} title - optional sheet title in header
 */
export const BottomSheetModal = ({ visible, onClose, children, title }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    {/* Backdrop */}
    <TouchableOpacity
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
      activeOpacity={1}
      onPress={onClose}
    >
      {/* Sheet body — stop propagation so tapping content doesn't dismiss */}
      <TouchableOpacity activeOpacity={1}>
        <YStack
          bg="$surfaceContainerHigh"
          borderTopLeftRadius={32}
          borderTopRightRadius={32}
          pt={12}
          pb={40}
          borderWidth={1}
          borderColor="rgba(255,255,255,0.07)"
          borderBottomWidth={0}
        >
          {/* Drag handle */}
          <YStack w={40} h={4} borderRadius={2} bg="$outlineVariant" alignSelf="center" mb={16} />

          {/* Header row */}
          {title && (
            <XStack px={24} jc="space-between" ai="center" mb={20}>
              <BodyText fontWeight="800" fontSize={18}>{title}</BodyText>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <BodyText color="#47A1FF" fontWeight="700">Done</BodyText>
              </TouchableOpacity>
            </XStack>
          )}

          {/* Content */}
          <YStack px={24}>
            {children}
          </YStack>
        </YStack>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);
