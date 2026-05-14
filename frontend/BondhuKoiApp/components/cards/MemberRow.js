import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Shield } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { StatusDot } from '../ui/StatusDot';
import { RoleBadge } from '../ui/RoleBadge';
import { SanctuaryAvatar } from '../ui/SanctuaryAvatar';

/**
 * MemberRow — member card in the Group Detail screen
 * @param {object} member - { id, name, avatarUrl, isInside, role }
 * @param {boolean} isAdmin - whether the current user is admin (shows manage button)
 * @param {boolean} isUniversityCircle - affects location label text
 * @param {function} onManage - tap manage (shield) button
 */
export const MemberRow = ({ member, isAdmin, isUniversityCircle, onManage }) => {
  const isPending = member.status === 'pending';
  
  return (
    <XStack
      bg="$surfaceContainerLow"
      borderRadius={24}
      p={20}
      mb={16}
      ai="center"
      jc="space-between"
      borderWidth={1}
      borderColor="$outlineVariant"
      opacity={isPending ? 0.6 : 1}
    >
      <XStack ai="center" gap={16}>
        <YStack style={{ opacity: isPending ? 0.5 : 1 }}>
          <SanctuaryAvatar
            url={member.avatarUrl || member.avatar_url}
            name={member.name}
            id={member.userId || member.id}
            size={48}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.05)"
          />
        </YStack>

        <YStack>
          <XStack ai="center" gap={6}>
            <BodyText fontWeight="700" color={isPending ? "$onSurfaceVariant" : "$onSurface"}>
              {member.name}
            </BodyText>
            {isPending ? (
              <RoleBadge label="Invited" variant="blue" />
            ) : member.role === 'admin' ? (
              <RoleBadge label="Admin" variant="gold" />
            ) : (
              <RoleBadge label="Member" variant="blue" />
            )}
          </XStack>

          {!isPending && (
            <XStack ai="center" gap={6} mt={4}>
              <StatusDot active={member.isInside} />
              <BodyText fontSize={13} color="$onSurfaceVariant">
                {member.isInside
                  ? `Inside ${isUniversityCircle ? 'Campus' : 'Workspace'}`
                  : 'Outside'}
              </BodyText>
            </XStack>
          )}
          {isPending && (
            <BodyText fontSize={12} color="$onSurfaceVariant" mt={4} fontStyle="italic">
              Invitation sent
            </BodyText>
          )}
        </YStack>
      </XStack>

      {isAdmin && (
        <TouchableOpacity activeOpacity={0.7} onPress={onManage}>
          <XStack bg="$primary" opacity={0.1} px={12} py={6} borderRadius={999} ai="center" gap={6} pos="absolute" top={0} left={0} right={0} bottom={0} />
          <XStack px={12} py={6} borderRadius={999} ai="center" gap={6}>
            <Shield color="$primary" size={14} />
            <BodyText color="$primary" fontSize={12} fontWeight="700">Manage</BodyText>
          </XStack>
        </TouchableOpacity>
      )}
    </XStack>
  );
};
