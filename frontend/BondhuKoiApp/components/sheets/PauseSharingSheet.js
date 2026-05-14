import React, { useState } from 'react';
import { TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { EyeOff, Eye, AlertCircle } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { useAuth } from '../../src/hooks/useAuth';

/**
 * PauseSharingSheet — the quick master privacy toggle, accessible from any tab header
 * @param {boolean} isPaused - current global sharing state
 * @param {function} onToggle - (newValue) toggle handler
 */
export const PauseSharingSheet = ({ visible, onClose, isPaused, onToggle }) => {
  const { updateSharingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);

  const handleToggleRequest = (newValue) => {
    // If they're trying to pause, show confirmation
    if (newValue && !isPaused) {
      setPendingToggleValue(newValue);
      setShowPauseConfirm(true);
    } else {
      // If they're trying to resume, just do it
      handleToggle(newValue);
    }
  };

  const handleToggle = async (newValue) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use auth context's updateSharingStatus which updates both backend and context
      await updateSharingStatus(!newValue);
      onToggle(newValue);
      setShowPauseConfirm(false);
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to update sharing status');
      setIsLoading(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Sharing Status">

      {/* Status display */}
      <YStack
        bg={isPaused ? 'rgba(255,69,58,0.08)' : 'rgba(42,229,0,0.06)'}
        borderRadius={20}
        p={20}
        ai="center"
        mb={24}
        borderWidth={1}
        borderColor={isPaused ? 'rgba(255,69,58,0.2)' : 'rgba(42,229,0,0.15)'}
        opacity={isLoading ? 0.6 : 1}
      >
        <YStack
          w={64} h={64} borderRadius="$full"
          bg={isPaused ? 'rgba(255,69,58,0.12)' : 'rgba(42,229,0,0.12)'}
          ai="center" jc="center"
          mb={14}
        >
          {isLoading ? (
            <ActivityIndicator color={isPaused ? '#FF453A' : '#2AE500'} />
          ) : isPaused
            ? <EyeOff color="#FF453A" size={32} />
            : <Eye color="#2AE500" size={32} />}
        </YStack>
        <Heading fontSize={20} color={isPaused ? '#FF453A' : '#2AE500'} mb={6}>
          {isLoading ? 'Updating...' : isPaused ? 'Sharing Paused' : 'Sharing Active'}
        </Heading>
        <BodyText color="$onSurfaceVariant" fontSize={14} ta="center" lineHeight={20}>
          {isPaused
            ? 'You appear as offline to everyone. No circles or campus zone can detect your presence.'
            : 'Your presence is visible to your circles and campus friends based on your privacy settings.'}
        </BodyText>
      </YStack>

      {/* Error message */}
      {error && (
        <YStack bg="rgba(255,69,58,0.1)" borderRadius={20} p={18} mb={24} borderWidth={1} borderColor="rgba(255,69,58,0.2)">
          <BodyText fontSize={14} color="#FF453A" ta="center" lineHeight={20} fontWeight="600">
            {error}
          </BodyText>
        </YStack>
      )}

      {/* Toggle */}
      <XStack ai="center" jc="space-between" mb={24}>
        <YStack f={1} mr={16}>
          <BodyText fontWeight="700" fontSize={16}>Pause All Sharing</BodyText>
          <BodyText fontSize={13} color="$onSurfaceVariant" mt={4}>
            Instantly hide your status from everyone.
          </BodyText>
        </YStack>
        <Switch
          value={isPaused}
          onValueChange={handleToggleRequest}
          trackColor={{ false: '#2A2D33', true: '#FF453A' }}
          thumbColor="#FFFFFF"
          disabled={isLoading}
        />
      </XStack>

      <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
        <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
          borderWidth={1} borderColor="$outlineVariant">
          <BodyText fontWeight="700">Done</BodyText>
        </YStack>
      </TouchableOpacity>

      {/* Pause confirmation modal */}
      <ConfirmModal
        visible={showPauseConfirm}
        onClose={() => {
          setShowPauseConfirm(false);
          setPendingToggleValue(false);
        }}
        onConfirm={() => handleToggle(pendingToggleValue)}
        title="Pause All Sharing?"
        message="You'll appear offline to everyone. Circles, friends, and campus zones won't detect your presence until you resume sharing. This can be toggled anytime."
        confirmLabel="Pause Sharing"
        confirmVariant="red"
      />

    </BottomSheetModal>
  );
};
