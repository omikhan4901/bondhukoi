import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Trash2, AlertCircle } from '@tamagui/lucide-icons-2';
import { BodyText, Heading } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SuccessModal } from '../modals/SuccessModal';
import { friendService } from '../../src/services/api';

/**
 * UnfriendSheet — Displays friend info with option to unfriend
 */
export const UnfriendSheet = ({ visible, onClose, friend, onUnfriended }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  if (!friend) return null;

  const handleUnfriend = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await friendService.unfriend(friend.id);
      setShowConfirm(false);
      setSuccessModal({ 
        visible: true, 
        title: 'Friend Removed', 
        message: `You are no longer friends with ${friend.name}` 
      });
      setTimeout(() => {
        onUnfriended?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Friend Details">
        {/* Friend Info */}
        <YStack mb={32} pb={24} borderBottomWidth={1} borderBottomColor="$outlineVariant" ai="center">
          <YStack w={72} h={72} borderRadius="$full" bg={friend?.color || '#8B5CF6'} ai="center" jc="center" mb={16}>
            <BodyText fontSize={32} fontWeight="700" color="white">
              {friend?.name?.charAt(0).toUpperCase()}
            </BodyText>
          </YStack>
          <BodyText fontWeight="800" fontSize={18} mb={8}>
            {friend?.name}
          </BodyText>
          <BodyText fontSize={14} color="$onSurfaceVariant">
            {friend?.email}
          </BodyText>
          {friend?.university && (
            <BodyText fontSize={13} color="$onSurfaceVariant" mt={8}>
              {friend.university}
            </BodyText>
          )}
        </YStack>

        {/* Error Message */}
        {error && (
          <YStack 
            bg="rgba(255,69,58,0.1)" 
            borderRadius={12} 
            p={12} 
            mb={20} 
            borderWidth={1} 
            borderColor="rgba(255,69,58,0.2)"
          >
            <XStack ai="flex-start" gap={8}>
              <AlertCircle color="#FF453A" size={16} style={{ marginTop: 2 }} />
              <BodyText color="#FF453A" fontSize={13} f={1}>
                {error}
              </BodyText>
            </XStack>
          </YStack>
        )}

        {/* Unfriend Button */}
        <TouchableOpacity 
          onPress={() => setShowConfirm(true)} 
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <YStack
            bg="rgba(255,69,58,0.1)"
            borderRadius={12}
            py={14}
            ai="center"
            jc="center"
            borderWidth={1}
            borderColor="rgba(255,69,58,0.2)"
            opacity={isLoading ? 0.5 : 1}
          >
            <XStack ai="center" jc="center" gap={10}>
              <Trash2 color="#FF453A" size={18} />
              <BodyText color="#FF453A" fontWeight="700" fontSize={15}>
                Remove Friend
              </BodyText>
            </XStack>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${friend?.name} from your friends list?`}
        confirmText="Remove"
        confirmColor="#FF453A"
        onConfirm={handleUnfriend}
        isLoading={isLoading}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        onDismiss={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </>
  );
};
