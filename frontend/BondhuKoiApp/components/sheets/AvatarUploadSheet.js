import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { YStack, XStack } from 'tamagui';
import { TextInput } from 'react-native';
import { Camera, Check } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { useAuth } from '../../src/hooks/useAuth';
import { userService } from '../../src/services/api';

// Deterministic fallback color
const nameToColor = (name = '') => {
  const colors = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/**
 * AvatarUploadSheet — lets user view, pick, and upload a profile photo
 */
export const AvatarUploadSheet = ({ visible, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) { setError(null); setSuccess(false); }
  }, [visible]);

  const bgColor = nameToColor(user?.name || '');

  const pickAndUpload = async () => {
    try {
      setError(null);
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access photos was denied.');
        return;
      }

      // Open picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setIsUploading(true);

      // Resize to 300×300 and compress heavily before reading as base64
      const manipulated = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );

      // Read resized file as base64
      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: EncodingType.Base64,
      });

      const mimeType = 'image/jpeg'; // always JPEG after manipulator

      // Upload to backend
      await userService.uploadAvatar(base64, mimeType);

      // Refresh user in auth context so avatar shows everywhere
      await refreshUser();

      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Profile Photo">
      {/* Current avatar preview */}
      <YStack ai="center" mb={28}>
        <YStack
          w={100} h={100} borderRadius="$full"
          bg={user?.avatarUrl ? 'transparent' : bgColor}
          overflow="hidden" ai="center" jc="center"
          borderWidth={2} borderColor="$outlineVariant"
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          ) : (
            <BodyText fontWeight="800" fontSize={38} color="#FFFFFF">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </BodyText>
          )}
        </YStack>
        <BodyText fontSize={13} color="$onSurfaceVariant" mt={12} ta="center">
          {user?.avatarUrl ? 'Current profile photo' : 'No photo set yet'}
        </BodyText>
      </YStack>

      {error && (
        <YStack bg="rgba(255,69,58,0.1)" borderRadius={16} p={14} mb={16} borderWidth={1} borderColor="rgba(255,69,58,0.2)">
          <BodyText fontSize={13} color="#FF453A" ta="center">{error}</BodyText>
        </YStack>
      )}

      <TouchableOpacity onPress={pickAndUpload} activeOpacity={0.8} disabled={isUploading}>
        <YStack
          bg={success ? '#2AE500' : '#47A1FF'} borderRadius={999} py={16} ai="center"
          mb={12} opacity={isUploading ? 0.7 : 1}
        >
          <XStack ai="center" gap={10}>
            {isUploading ? (
              <ActivityIndicator color="#111317" size="small" />
            ) : success ? (
              <Check color="#111317" size={20} />
            ) : (
              <Camera color="#111317" size={20} />
            )}
            <BodyText fontWeight="800" color="#111317">
              {isUploading ? 'Uploading...' : success ? 'Done!' : user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </BodyText>
          </XStack>
        </YStack>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
        <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
          borderWidth={1} borderColor="$outlineVariant">
          <BodyText fontWeight="700">Cancel</BodyText>
        </YStack>
      </TouchableOpacity>
    </BottomSheetModal>
  );
};
