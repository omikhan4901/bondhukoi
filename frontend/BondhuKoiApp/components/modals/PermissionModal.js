import React from 'react';
import { Modal, TouchableOpacity, Linking } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Heading, BodyText } from '../SanctuaryComponents';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

/**
 * PermissionModal — pristine location permission error dialog with circle edges
 * @param {boolean} visible - modal visibility
 * @param {function} onClose - dismiss handler
 * @param {function} onRetry - retry permission request handler
 */
export const PermissionModal = ({ visible, onClose, onRetry, isMandatory = false }) => {
  const theme = useTheme();
  const isDark = theme.name === 'dark';

  const handleOpenSettings = async () => {
    await Linking.openSettings();
    if (!isMandatory) onClose();
  };

  const handleRetry = () => {
    if (onRetry) onRetry();
    if (!isMandatory) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isMandatory ? () => {} : onClose}
      statusBarTranslucent
    >
      {/* Blurred overlay with tap-to-dismiss (disabled if mandatory) */}
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
        activeOpacity={1}
        onPress={isMandatory ? null : onClose}
      >
        {/* Modal card - prevent taps from propagating to overlay */}
        <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
          <YStack
            bg="$surfaceContainerHigh"
            borderRadius={28}
            p={28}
            ai="center"
            borderWidth={1}
            borderColor="rgba(255,255,255,0.08)"
            gap={16}
          >
            {/* Icon - rounded circle container */}
            <YStack
              bg="rgba(255, 69, 58, 0.15)"
              borderRadius={999}
              width={72}
              height={72}
              ai="center"
              jc="center"
            >
              <MaterialCommunityIcons
                name="map-marker-off"
                size={40}
                color={isDark ? '#FF453A' : '#C42E1A'}
              />
            </YStack>

            {/* Content */}
            <Heading fontSize={22} ta="center">
              Location Shared?
            </Heading>

            <BodyText
              color="$onSurfaceVariant"
              fontSize={15}
              lineHeight={22}
              ta="center"
            >
              We're sorry for the interruption! BondhuKoi needs your location to show when you're 
              on campus or in your circles. Without this, the sanctuary just won't work correctly. 
              {"\n\n"}
              We take your privacy seriously—you'll find plenty of anti-tracking measures 
              inside the app to keep your exact whereabouts private.
            </BodyText>

            {/* Action buttons */}
            <XStack gap={12} width="100%" mt={8}>
              <TouchableOpacity
                onPress={handleRetry}
                activeOpacity={0.8}
                style={{ flex: 1 }}
              >
                <YStack
                  bg="$surfaceContainerHighest"
                  borderRadius={999}
                  py={14}
                  ai="center"
                  borderWidth={1}
                  borderColor="$outlineVariant"
                >
                  <BodyText fontWeight="700" fontSize={15}>
                    Try Again
                  </BodyText>
                </YStack>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenSettings}
                activeOpacity={0.8}
                style={{ flex: 1 }}
              >
                <YStack
                  bg="#47A1FF"
                  borderRadius={999}
                  py={14}
                  ai="center"
                >
                  <BodyText fontWeight="800" fontSize={15} color="#FFFFFF">
                    Settings
                  </BodyText>
                </YStack>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
