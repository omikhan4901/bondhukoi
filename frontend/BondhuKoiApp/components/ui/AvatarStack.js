import React from 'react';
import { XStack, YStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';
import { SanctuaryAvatar } from './SanctuaryAvatar';

/**
 * AvatarStack — overlapping avatar circles with +N overflow badge
 * @param {array} members - array of user objects {id, name, avatar_url}
 * @param {number} count - total number of users
 * @param {number} max - max avatars to show before overflow (default 3)
 * @param {number} size - avatar diameter (default 36)
 */
export const AvatarStack = ({ members = [], count = 0, max = 3, size = 36 }) => {
  const visibleMembers = members.slice(0, max);
  const overflow = count > visibleMembers.length;

  return (
    <XStack>
      {visibleMembers.map((member, i) => (
        <YStack
          key={member.id || i}
          ml={i === 0 ? 0 : -size * 0.33}
          style={{ zIndex: max - i }}
        >
          <SanctuaryAvatar
            url={member.avatar_url || member.avatarUrl}
            name={member.name}
            id={member.id}
            size={size}
            borderWidth={2}
            borderColor="rgba(255,255,255,0.15)"
          />
        </YStack>
      ))}
      
      {overflow && (
        <YStack
          w={size}
          h={size}
          borderRadius={size / 2}
          bg="#2A2A2E"
          ai="center"
          jc="center"
          ml={-size * 0.33}
          borderWidth={2}
          borderColor="#1A1D21"
          style={{ zIndex: 0 }}
        >
          <BodyText fontSize={10} fontWeight="700" color="#FFFFFF">
            +{count - visibleMembers.length}
          </BodyText>
        </YStack>
      )}
    </XStack>
  );
};
