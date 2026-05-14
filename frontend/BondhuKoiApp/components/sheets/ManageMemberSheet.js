import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { RoleBadge } from '../ui/RoleBadge';

/**
 * ManageMemberSheet — admin sheet to change role or remove a member
 * @param {object} member - { name, role, userId }
 * @param {string} circleId - circle to act on
 * @param {function} onRemove - called after confirming removal
 * @param {function} onRoleChanged - called with (userId, newRole)
 */
export const ManageMemberSheet = ({ visible, onClose, member, circleId, currentUserId, onRemove, onRoleChanged }) => {
  const isSelf = member?.userId === currentUserId;
  const isTargetAdmin = member?.role === 'admin';
  const canManageRole = !isSelf && !isTargetAdmin;
  const canRemove = isSelf || (!isTargetAdmin);
  const [role, setRole] = useState(member?.role || 'member');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Sync local role state when member changes
  React.useEffect(() => {
    if (member) {
      setRole(member.role || 'member');
    }
  }, [member]);

  if (!member) return null;

  const handleRoleSelect = async (r) => {
    if (r === role || isSavingRole) return;
    setRole(r);
    setIsSavingRole(true);
    try {
      await onRoleChanged?.(member.userId, r);
    } catch (err) {
      setRole(member.role); // revert on error
      setErrorMessage(err.message || "Failed to update member role.");
      setErrorOpen(true);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleRemoveConfirmed = async () => {
    setIsRemoving(true);
    try {
      await onRemove?.(member);
      setConfirmRemove(false);
      onClose();
    } catch (err) {
      setIsRemoving(false);
      setErrorMessage(err.message || "Failed to remove member from circle.");
      setErrorOpen(true);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title="Manage Member">
        {/* Member identity */}
        <XStack ai="center" gap={12} mb={24} pb={20} borderBottomWidth={1} borderBottomColor="$outlineVariant">
          <YStack w={48} h={48} borderRadius="$full" bg="$surfaceContainerHighest" ai="center" jc="center">
            <BodyText fontWeight="800" fontSize={20} color="$onSurfaceVariant">
              {member.name?.[0] ?? '?'}
            </BodyText>
          </YStack>
          <YStack>
            <BodyText fontWeight="700" fontSize={17}>{member.name}</BodyText>
            <RoleBadge label={role} variant={role === 'admin' ? 'gold' : 'blue'} />
          </YStack>
        </XStack>

        {/* Role toggle */}
        {canManageRole && (
          <>
            <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={12}
              textTransform="uppercase" letterSpacing={1} opacity={isSavingRole ? 0.6 : 1}>
              Change Role {isSavingRole && '(saving...)'}
            </BodyText>
            <XStack gap={12} mb={24}>
              {['member', 'admin'].map((r) => (
                <TouchableOpacity key={r} onPress={() => handleRoleSelect(r)} activeOpacity={0.8}
                  style={{ flex: 1 }} disabled={isSavingRole}>
                  <YStack
                    bg={role === r ? '$primary' : '$surfaceContainerLow'}
                    opacity={role === r ? 0.15 : 1}
                    borderRadius={16}
                    py={14}
                    ai="center"
                    borderWidth={1.5}
                    borderColor={role === r ? '$primary' : '$outlineVariant'}
                    disabled={isSavingRole}
                  >
                    <BodyText fontWeight="700" color={role === r ? '$primary' : '$onSurfaceVariant'}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </BodyText>
                  </YStack>
                </TouchableOpacity>
              ))}
            </XStack>
          </>
        )}

        {isTargetAdmin && !isSelf && (
          <YStack bg="rgba(255, 179, 64, 0.1)" p={16} borderRadius={16} mb={24} borderWidth={1} borderColor="rgba(255, 179, 64, 0.2)">
            <BodyText color="#FFB340" fontSize={14} textAlign="center" fontWeight="600">
              You cannot manage or kick other admins.
            </BodyText>
          </YStack>
        )}

        {/* Remove */}
        {canRemove && (
          <TouchableOpacity onPress={() => setConfirmRemove(true)} activeOpacity={0.8} disabled={isRemoving}>
            <YStack
              bg={isSelf ? "rgba(255, 69, 58, 0.05)" : "rgba(255, 69, 58, 0.1)"}
              borderRadius={999}
              py={14}
              ai="center"
              borderWidth={1}
              borderColor="rgba(255, 69, 58, 0.25)"
              opacity={isRemoving ? 0.6 : 1}
            >
              {isRemoving ? (
                <ActivityIndicator color="#FF453A" />
              ) : (
                <BodyText fontWeight="800" color="#FF453A">
                  {isSelf ? "Leave Circle" : "Remove from Circle"}
                </BodyText>
              )}
            </YStack>
          </TouchableOpacity>
        )}
      </BottomSheetModal>

      <ConfirmModal
        visible={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemoveConfirmed}
        title={isSelf ? "Leave Circle?" : `Remove ${member.name}?`}
        message={isSelf 
          ? "You will no longer be able to see this circle or its members' locations."
          : "They will lose access to this circle immediately."}
        confirmLabel={isSelf ? "Leave" : "Remove"}
        confirmVariant="red"
      />

      <ConfirmModal
        visible={errorOpen}
        onClose={() => setErrorOpen(false)}
        onConfirm={() => setErrorOpen(false)}
        title="Action Failed"
        message={errorMessage}
        confirmLabel="Got it"
        confirmVariant="blue"
      />
    </>
  );
};
