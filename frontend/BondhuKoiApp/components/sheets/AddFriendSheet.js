import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack, Input, useTheme } from 'tamagui';
import { UserPlus, Check, AlertCircle, Info } from '@tamagui/lucide-icons-2';
import { BodyText, Heading } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { friendService } from '../../src/services/api';

/**
 * Input validation helper
 */
const validateInput = (input) => {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false, message: 'Please enter an email or friend code' };
  }
  
  // Check if it's an email
  if (trimmed.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true };
  }
  
  // Check if it's a friend code (6 alphanumeric)
  const codeRegex = /^[A-Z0-9]{6}$/i;
  if (!codeRegex.test(trimmed)) {
    return { valid: false, message: 'Friend code must be 6 characters (letters & numbers)' };
  }
  
  return { valid: true };
};

/**
 * Get user-friendly error message based on backend error
 */
const getErrorMessage = (backendError) => {
  const msg = backendError.toLowerCase();
  
  if (msg.includes('not found') || msg.includes('cannot find')) {
    return {
      title: 'User Not Found',
      message: 'No account exists with that email or friend code. Double-check and try again.',
    };
  }
  
  if (msg.includes('cannot add yourself')) {
    return {
      title: 'Nice Try!',
      message: "You can't add yourself as a friend. Try adding someone else instead!",
    };
  }
  
  if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
    return {
      title: 'Already Friends',
      message: 'You\'re already connected with this person.',
    };
  }
  
  return {
    title: 'Connection Failed',
    message: backendError || 'Something went wrong. Please try again.',
  };
};

/**
 * AddFriendSheet — bottom sheet to search and send a friend request
 */
export const AddFriendSheet = ({ visible, onClose }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const theme = useTheme();

  const handleSend = async () => {
    // Validate input
    const validation = validateInput(query);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    
    setValidationError(null);
    setIsLoading(true);
    setError(null);
    
    try {
      await friendService.sendRequest(query.trim());
      setSent(true);
      setTimeout(() => { 
        setSent(false); 
        setQuery(''); 
        setError(null);
        setValidationError(null);
        onClose(); 
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to send request');
      setShowErrorModal(true);
      setIsLoading(false);
    }
  };

  const errorInfo = error ? getErrorMessage(error) : null;

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Add a Friend">
        <BodyText color="$onSurfaceVariant" fontSize={14} mb={20} lineHeight={20}>
          Enter a friend's email or their 6-character friend code.
        </BodyText>

        <XStack
          bg="$surfaceContainerLow"
          borderRadius={16}
          px={16}
          mb={16}
          ai="center"
          borderWidth={1}
          borderColor={validationError || error ? 'rgba(255,69,58,0.3)' : '$outlineVariant'}
        >
          {validationError || error ? (
            <AlertCircle color="#FF453A" size={20} style={{ marginRight: 12 }} />
          ) : (
            <UserPlus color="$onSurfaceVariant" size={20} style={{ marginRight: 12 }} />
          )}
          <Input
            unstyled
            placeholder="email@example.com or ABC123"
            placeholderTextColor="$onSurfaceVariant"
            value={query}
            onChangeText={(t) => { setQuery(t); setValidationError(null); setError(null); }}
            editable={!isLoading && !sent}
            color={theme.onSurface.get()}
            fontSize={16}
            f={1}
            py={16}
          />
        </XStack>

        {(validationError || error) && (
          <YStack bg="rgba(255,69,58,0.1)" borderRadius={16} p={14} mb={20} borderWidth={1} borderColor="rgba(255,69,58,0.2)" ai="flex-start">
            <XStack ai="flex-start" gap={10}>
              <AlertCircle color="#FF453A" size={16} style={{ marginTop: 2 }} />
              <YStack f={1}>
                <BodyText color="#FF453A" fontSize={13} fontWeight="700" mb={2}>
                  {validationError ? 'Invalid Format' : errorInfo?.title}
                </BodyText>
                <BodyText color="#FF453A" fontSize={12} lineHeight={16}>
                  {validationError || errorInfo?.message}
                </BodyText>
              </YStack>
            </XStack>
          </YStack>
        )}

        <TouchableOpacity onPress={handleSend} activeOpacity={0.8} disabled={isLoading || sent || !query.trim() || !!validationError}>
          <YStack
            bg={sent ? '#2AE500' : isLoading ? '$surfaceContainerHighest' : '#47A1FF'}
            borderRadius={999}
            py={16}
            ai="center"
            jc="center"
            opacity={isLoading || (!query.trim() && !sent) || !!validationError ? 0.5 : 1}
          >
            <XStack ai="center" gap={8}>
              {isLoading && <ActivityIndicator color="#FFFFFF" />}
              {sent && <Check color="#111317" size={18} />}
              <BodyText fontWeight="800" color={sent ? '#111317' : isLoading ? '$onSurfaceVariant' : '#111317'}>
                {isLoading ? 'Sending...' : sent ? 'Request Sent!' : 'Send Friend Request'}
              </BodyText>
            </XStack>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Error modal for backend errors */}
      <ConfirmModal
        visible={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        onConfirm={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        title={errorInfo?.title || 'Connection Error'}
        message={errorInfo?.message || 'Something went wrong'}
        confirmLabel="Got It"
        confirmVariant="blue"
      />
    </>
  );
};
