import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Copy, Check, UserPlus } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { friendService, circleService } from '../../src/services/api';
import * as Clipboard from 'expo-clipboard';

// Deterministic fallback color
const nameToColor = (name = '') => {
  const colors = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/**
 * ShareCircleSheet — real invite link + real friends list with Invite buttons
 * @param {string} circleName - circle name for display
 * @param {string} circleId - the circle to invite into
 */
export const ShareCircleSheet = ({ visible, onClose, circleName = 'Circle', circleId }) => {
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState([]);
  const [invited, setInvited] = useState({});
  const [invitingId, setInvitingId] = useState(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const inviteLink = `bondhu.koi/invite/${circleId || 'unknown'}`;

  // Load real friends when sheet opens
  useEffect(() => {
    if (!visible || !circleId) return;
    setIsLoadingFriends(true);
    setInvited({});
    friendService.getFriendsList()
      .then(data => setFriends(data.friends || []))
      .catch(() => setFriends([]))
      .finally(() => setIsLoadingFriends(false));
  }, [visible, circleId]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInvite = async (friend) => {
    if (invited[friend.id] || invitingId === friend.id) return;
    setInvitingId(friend.id);
    try {
      await circleService.addMember(circleId, friend.id);
      setInvited(prev => ({ ...prev, [friend.id]: true }));
    } catch (err) {
      console.error('Failed to invite friend:', err);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={`Invite to ${circleName}`}>
      {/* Copy link row */}
      <XStack
        bg="$surfaceContainerLow" borderRadius={16} px={16} py={14} mb={24}
        ai="center" jc="space-between" borderWidth={1} borderColor="$outlineVariant"
      >
        <BodyText color="$onSurfaceVariant" fontSize={13} f={1} numberOfLines={1} pr={8}>
          {inviteLink}
        </BodyText>
        <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
          <XStack
            bg={copied ? 'rgba(42,229,0,0.15)' : 'rgba(71, 161, 255, 0.15)'}
            px={14} py={8} borderRadius={999} ai="center" gap={6}
          >
            {copied ? <Check color="#2AE500" size={16} /> : <Copy color="#47A1FF" size={16} />}
            <BodyText fontWeight="700" fontSize={13} color={copied ? '#2AE500' : '#47A1FF'}>
              {copied ? 'Copied!' : 'Copy Link'}
            </BodyText>
          </XStack>
        </TouchableOpacity>
      </XStack>

      {/* Quick share to friends */}
      <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={12}
        textTransform="uppercase" letterSpacing={1}>
        Share Directly
      </BodyText>

      {isLoadingFriends ? (
        <YStack ai="center" py={20}>
          <ActivityIndicator color="#47A1FF" />
        </YStack>
      ) : friends.length === 0 ? (
        <YStack ai="center" py={20}>
          <BodyText color="$onSurfaceVariant" fontSize={14}>No friends to invite yet.</BodyText>
        </YStack>
      ) : friends.map((friend) => {
        const bgColor = nameToColor(friend.name);
        const isInvited = invited[friend.id];
        const isInviting = invitingId === friend.id;

        return (
          <XStack key={friend.id} ai="center" jc="space-between" py={12}
            borderBottomWidth={1} borderBottomColor="$outlineVariant">
            <XStack ai="center" gap={12}>
              <YStack w={36} h={36} borderRadius="$full" bg={bgColor}
                ai="center" jc="center" overflow="hidden">
                {friend.avatarUrl ? (
                  <Image source={{ uri: friend.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <BodyText fontWeight="800" color="#FFF" fontSize={15}>
                    {friend.name?.[0]?.toUpperCase() || '?'}
                  </BodyText>
                )}
              </YStack>
              <BodyText fontWeight="600">{friend.name}</BodyText>
            </XStack>
            <TouchableOpacity onPress={() => handleInvite(friend)} activeOpacity={0.7}
              disabled={isInvited || isInviting}>
              <YStack
                bg={isInvited ? 'rgba(42,229,0,0.15)' : 'rgba(71, 161, 255, 0.15)'}
                px={14} py={6} borderRadius={999} ai="center" jc="center"
              >
                {isInviting ? (
                  <ActivityIndicator color="#47A1FF" size="small" />
                ) : isInvited ? (
                  <Check color="#2AE500" size={16} />
                ) : (
                  <BodyText fontSize={13} fontWeight="700" color="#47A1FF">Invite</BodyText>
                )}
              </YStack>
            </TouchableOpacity>
          </XStack>
        );
      })}
    </BottomSheetModal>
  );
};
