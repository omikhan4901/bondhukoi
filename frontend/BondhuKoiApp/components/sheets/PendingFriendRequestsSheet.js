import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Check, X } from '@tamagui/lucide-icons-2';
import { BodyText, Heading } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SuccessModal } from '../modals/SuccessModal';
import { friendService } from '../../src/services/api';

/**
 * PendingFriendRequestsSheet — Shows incoming friend requests with accept/reject options
 */
export const PendingFriendRequestsSheet = ({ visible, onClose, onRequestsUpdated }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [validating, setValidating] = useState(null);
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  const loadPendingRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await friendService.getPendingRequests();
      setPendingRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load pending requests:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPendingRequests();
    }
  }, [visible]);

  const handleAccept = async (requestId) => {
    try {
      setValidating(requestId);
      await friendService.acceptRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setSuccessModal({ visible: true, title: 'Request Accepted', message: 'New friend added!' });
      onRequestsUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setValidating(requestId);
      await friendService.rejectRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setSuccessModal({ visible: true, title: 'Request Declined', message: 'Request removed' });
      onRequestsUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(null);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Friend Requests">
        {isLoading ? (
          <YStack ai="center" jc="center" py={40}>
            <BodyText color="$onSurfaceVariant">Loading requests...</BodyText>
          </YStack>
        ) : error ? (
          <YStack ai="center" jc="center" py={40}>
            <BodyText color="#FF453A">{error}</BodyText>
          </YStack>
        ) : pendingRequests.length === 0 ? (
          <YStack ai="center" jc="center" py={40}>
            <BodyText color="$onSurfaceVariant">No pending requests</BodyText>
          </YStack>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap={12}>
              {pendingRequests.map((request) => (
                <YStack
                  key={request.id}
                  bg="$surfaceContainerLow"
                  borderRadius={12}
                  p={16}
                  borderWidth={1}
                  borderColor="$outlineVariant"
                >
                  <XStack jc="space-between" ai="center" mb={12}>
                    <YStack f={1}>
                      <BodyText fontWeight="700" fontSize={15}>
                        {request.fromUser?.name || 'Unknown User'}
                      </BodyText>
                      <BodyText fontSize={13} color="$onSurfaceVariant" mt={4}>
                        {request.fromUser?.email}
                      </BodyText>
                      {request.fromUser?.university && (
                        <BodyText fontSize={12} color="$onSurfaceVariant" mt={4}>
                          {request.fromUser.university}
                        </BodyText>
                      )}
                    </YStack>
                  </XStack>

                  <XStack gap={8}>
                    <TouchableOpacity
                      onPress={() => handleAccept(request.id)}
                      disabled={validating === request.id}
                      activeOpacity={0.7}
                      style={{ flex: 1 }}
                    >
                      <YStack
                        bg="#34C759"
                        borderRadius={10}
                        py={12}
                        ai="center"
                        opacity={validating === request.id ? 0.5 : 1}
                      >
                        <XStack ai="center" jc="center" gap={8}>
                          <Check size={16} color="white" />
                          <BodyText color="white" fontWeight="700" fontSize={13}>
                            Accept
                          </BodyText>
                        </XStack>
                      </YStack>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleReject(request.id)}
                      disabled={validating === request.id}
                      activeOpacity={0.7}
                      style={{ flex: 1 }}
                    >
                      <YStack
                        bg="$outlineVariant"
                        borderRadius={10}
                        py={12}
                        ai="center"
                        opacity={validating === request.id ? 0.5 : 1}
                      >
                        <XStack ai="center" jc="center" gap={8}>
                          <X size={16} color="$onSurface" />
                          <BodyText color="$onSurface" fontWeight="700" fontSize={13}>
                            Decline
                          </BodyText>
                        </XStack>
                      </YStack>
                    </TouchableOpacity>
                  </XStack>
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        )}
      </BottomSheetModal>

      <SuccessModal
        visible={successModal.visible}
        onDismiss={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </>
  );
};
