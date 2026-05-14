import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';
import { SanctuaryAvatar } from '../ui/SanctuaryAvatar';
import { WatchBadge } from '../ui/WatchBadge';

/**
 * Convert university names to shortforms
 */
const getUniversityShortform = (university) => {
  const shortforms = {
    'North South University': 'NSU',
    'BRAC University': 'BRAC',
    'Independent University Bangladesh': 'IUB',
    'American Int. University-Bangladesh': 'AIUB',
    'University of Dhaka': 'DU',
  };
  return shortforms[university] || university;
};

/**
 * FriendRow — standardized friend card used in the Campus Pulse screen
 * @param {object} friend - { id, name, avatarUrl, isInside, context, isWatched, watchPending }
 * @param {function} onGetSocials - tap socials button
 * @param {function} onToggleWatch - tap watch button
 */
export const FriendRow = ({ friend, onGetSocials, onToggleWatch }) => {
  return (
    <XStack
      bg="$surfaceContainerLow"
      borderRadius={32}
      px={28}
      py={22}
      mb={20}
      ai="center"
      jc="space-between"
      borderWidth={1}
      borderColor={friend.isWatched ? 'rgba(255,215,0,0.22)' : '$outlineVariant'}
    >
      <XStack ai="center" gap={16} f={1}>
        {/* Avatar + presence dot */}
        <YStack>
          <SanctuaryAvatar
            url={friend.avatarUrl || friend.avatar_url}
            name={friend.name}
            id={friend.id}
            size={56}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.05)"
          />
          {friend.isInside && (
            <YStack
              position="absolute" bottom={0} right={0}
              w={14} h={14} borderRadius="$full"
              bg="#2AE500" borderWidth={2} borderColor="$surfaceContainerLow"
              style={{ shadowColor: '#2ae500', shadowOpacity: 0.8, shadowRadius: 8, zIndex: 10 }}
            />
          )}
        </YStack>

        {/* Name + context */}
        <YStack f={1} pr={5}>
          <XStack ai="center" gap={8} mb={6}>
            <BodyText fontWeight="800" fontSize={19} color="$onSurface">
              {friend.name}
            </BodyText>
            {friend.isWatched && !friend.watchPending && (
              <BodyText fontSize={15} color="#FFD700">★</BodyText>
            )}
            {friend.watchPending && (
              <BodyText fontSize={15} color="#FFA500">●</BodyText>
            )}
          </XStack>
          <BodyText fontSize={14} color="$onSurfaceVariant" lineHeight={20} fontWeight="600" mt={5}>
            {getUniversityShortform(friend.context)}
          </BodyText>
        </YStack>
      </XStack>

      {/* Action area */}
      <XStack ai="center" gap={8}>
        <WatchBadge
          isWatched={friend.isWatched}
          isPending={friend.watchPending}
          onPress={onToggleWatch}
          size={20}
        />
        <TouchableOpacity onPress={onGetSocials} activeOpacity={0.8}>
          <YStack
            bg="rgba(71,161,255,0.12)"
            px={18} py={12}
            borderRadius={999}
            borderWidth={1}
            borderColor="rgba(71,161,255,0.3)"
          >
            <BodyText fontSize={14} fontWeight="800" color="#47A1FF">Socials</BodyText>
          </YStack>
        </TouchableOpacity>
      </XStack>
    </XStack>
  );
};
