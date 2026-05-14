import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Bell, BellOff, Check, MapPin, Users, AlertCircle } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { friendService } from '../../src/services/api';

const SCOPES = [
  { key: 'campus', label: 'Campus Only', desc: 'Alert when they enter or leave the university.' },
  { key: 'all',    label: 'All Zones',   desc: "Alert for any circle or place they're tracked in." },
];


const MAX_WATCHES = 5;

/**
 * WatchSheet — consent-aware watch setup sheet
 * @param {object} friend - { name, email, isWatched, watchScope, watchPending, watchId }
 * @param {number} watchedCount - current number of watched friends
 * @param {function} onConfirm - (scope) user confirms watch
 * @param {function} onUnwatch - user removes watch
 */
export const WatchSheet = ({ visible, onClose, friend, watchedCount = 0, onConfirm, onUnwatch }) => {
  const [scope, setScope] = useState(friend?.watchScope || 'campus');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUnwatchConfirm, setShowUnwatchConfirm] = useState(false);
  const atCap = !friend?.isWatched && watchedCount >= MAX_WATCHES;

  if (!friend) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Sending watch request for:', { email: friend.email, scope });
      const response = await friendService.sendWatchRequest(friend.email, scope);
      console.log('Watch request response:', response);
      onConfirm?.(scope);
      onClose();
    } catch (err) {
      console.error('Watch request error:', err);
      setError(err.message || 'Failed to send watch request');
      setIsLoading(false);
    }
  };

  const handleUnwatch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await friendService.removeWatch(friend.watchId);
      setShowUnwatchConfirm(false);
      onUnwatch?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove watch');
      setIsLoading(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Priority Alert">

      {/* Friend identity */}
      <XStack ai="center" gap={18} mb={28} pb={24} borderBottomWidth={1} borderBottomColor="$outlineVariant">
        <YStack w={64} h={64} borderRadius="$full" bg={friend.color || '$surfaceContainerHighest'} ai="center" jc="center"
          borderWidth={1} borderColor="rgba(255,255,255,0.05)">
          <Users color="#FFFFFF" size={28} opacity={0.6} />
        </YStack>
        <YStack>
          <BodyText fontWeight="800" fontSize={18}>{friend.name}</BodyText>
          {friend.isWatched ? (
            <XStack ai="center" gap={6} mt={6}>
              <Bell color="#FFD700" size={14} fill="#FFD700" />
              <BodyText fontSize={13} color="#FFD700" fontWeight="800">
                {friend.watchPending ? 'REQUEST PENDING' : 'WATCHING'}
              </BodyText>
            </XStack>
          ) : (
            <BodyText fontSize={14} color="$onSurfaceVariant" mt={4}>Not currently in your Watch List</BodyText>
          )}
        </YStack>
      </XStack>

      {/* Error message */}
      {error && (
        <YStack bg="rgba(255,69,58,0.1)" borderRadius={20} p={18} mb={20} borderWidth={1} borderColor="rgba(255,69,58,0.2)">
          <BodyText fontSize={14} color="#FF453A" ta="center" lineHeight={20} fontWeight="600">
            {error}
          </BodyText>
        </YStack>
      )}

      {/* Cap warning */}
      {atCap && (
        <YStack bg="rgba(255,69,58,0.1)" borderRadius={20} p={18} mb={20} borderWidth={1} borderColor="rgba(255,69,58,0.2)">
          <BodyText fontSize={14} color="#FF453A" ta="center" lineHeight={20} fontWeight="600">
            You're watching {MAX_WATCHES} friends — the maximum limit reached. Remove a watch to add another.
          </BodyText>
        </YStack>
      )}

      {/* Privacy note */}
      {!friend.isWatched && !atCap && (
        <YStack bg="rgba(71,161,255,0.08)" borderRadius={20} p={18} mb={24} borderWidth={1} borderColor="rgba(71,161,255,0.2)">
          <BodyText fontSize={14} color="$onSurfaceVariant" lineHeight={22}>
            <BodyText fontWeight="800" color="#47A1FF">{friend.name}</BodyText> will receive a secure notification and must accept before alerts trigger. They can revoke access at any time.
          </BodyText>
        </YStack>
      )}

      {/* Scope selector */}
      {(!atCap || friend.isWatched) && (
        <>
          <BodyText fontWeight="800" fontSize={12} color="$onSurfaceVariant" mb={14}
            textTransform="uppercase" letterSpacing={1.5}>
            ALERTS TRIGGER ON
          </BodyText>
          <YStack mb={32} gap={12}>
            {SCOPES.map((s) => (
              <TouchableOpacity key={s.key} onPress={() => setScope(s.key)} activeOpacity={0.8} disabled={isLoading}>
                <XStack
                  bg={scope === s.key ? 'rgba(71,161,255,0.1)' : '$surfaceContainerLow'}
                  borderRadius={24} p={20} ai="center" gap={16}
                  borderWidth={1.5}
                  borderColor={scope === s.key ? '#47A1FF' : '$outlineVariant'}
                  opacity={isLoading ? 0.5 : 1}
                >
                  <YStack
                    w={24} h={24} borderRadius="$full"
                    bg={scope === s.key ? '#47A1FF' : '$surfaceContainerHighest'}
                    ai="center" jc="center"
                    borderWidth={scope === s.key ? 0 : 2}
                    borderColor="$outlineVariant"
                  >
                    {scope === s.key && <Check color="#111317" size={14} strokeWidth={4} />}
                  </YStack>
                  <YStack f={1}>
                    <BodyText fontWeight="800" fontSize={16} color={scope === s.key ? '#47A1FF' : '$onSurface'}>{s.label}</BodyText>
                    <BodyText fontSize={13} color="$onSurfaceVariant" mt={3} lineHeight={18}>{s.desc}</BodyText>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
        </>
      )}

      {/* Actions */}
      <YStack mb={8}>
        {friend.isWatched ? (
          <TouchableOpacity onPress={() => setShowUnwatchConfirm(true)} activeOpacity={0.8} disabled={isLoading}>
            <YStack bg={isLoading ? '$surfaceContainerHighest' : 'rgba(255,69,58,0.12)'} borderRadius={999} py={18} ai="center"
              borderWidth={1} borderColor="rgba(255,69,58,0.3)" opacity={isLoading ? 0.7 : 1}>
              <XStack ai="center" gap={10}>
                {isLoading ? (
                  <ActivityIndicator color="#FF453A" />
                ) : (
                  <BellOff color="#FF453A" size={20} />
                )}
                <BodyText fontWeight="900" color={isLoading ? '$onSurfaceVariant' : '#FF453A'} fontSize={16}>
                  {isLoading ? 'Removing...' : 'Stop Watching'}
                </BodyText>
              </XStack>
            </YStack>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.8} disabled={atCap || isLoading}>
            <YStack
              bg={atCap || isLoading ? '$surfaceContainerHighest' : '#47A1FF'}
              borderRadius={999} py={18} ai="center"
              style={(atCap || isLoading) ? {} : { shadowColor: "#47A1FF", shadowOpacity: 0.3, shadowRadius: 10 }}
              opacity={atCap || isLoading ? 0.7 : 1}
            >
              <XStack ai="center" gap={10}>
                {isLoading ? (
                  <ActivityIndicator color={atCap ? '$onSurfaceVariant' : '#111317'} />
                ) : (
                  <Bell color={atCap ? '$onSurfaceVariant' : '#111317'} size={20} />
                )}
                <BodyText fontWeight="900" color={atCap || isLoading ? '$onSurfaceVariant' : '#111317'} fontSize={16}>
                  {isLoading ? 'Sending...' : 'Send Watch Request'}
                </BodyText>
              </XStack>
            </YStack>
          </TouchableOpacity>
        )}
      </YStack>

      {/* Unwatch confirmation modal */}
      <ConfirmModal
        visible={showUnwatchConfirm}
        onClose={() => setShowUnwatchConfirm(false)}
        onConfirm={handleUnwatch}
        title="Stop Watching?"
        message={`You won't receive alerts when ${friend?.name} enters or leaves locations. They will not be notified.`}
        confirmLabel="Stop Watching"
        confirmVariant="red"
      />

    </BottomSheetModal>
  );
};
