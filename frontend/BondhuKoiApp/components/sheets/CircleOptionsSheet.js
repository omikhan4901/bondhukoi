import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { Users, LogOut, Settings as SettingsIcon } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';

/**
 * CircleOptionsSheet — contextual options for a circle (⋮ menu)
 * @param {boolean} isAdmin - shows "Circle Settings" if true
 * @param {string} circleName
 * @param {function} onViewMembers
 * @param {function} onSettings
 * @param {function} onLeave - called after confirming leave
 */
export const CircleOptionsSheet = ({
  visible,
  onClose,
  isAdmin = false,
  circleName = 'Circle',
  onViewMembers,
  onSettings,
  onLeave,
}) => {
  const [confirmLeave, setConfirmLeave] = useState(false);

  const handleLeaveConfirmed = () => {
    setConfirmLeave(false);
    onClose();
    onLeave?.();
  };

  const Option = ({ Icon, label, color = '$onSurface', onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <YStack py={16} borderBottomWidth={1} borderBottomColor="$outlineVariant">
        <BodyText fontWeight="700" fontSize={16} color={color}>{label}</BodyText>
      </YStack>
    </TouchableOpacity>
  );

  return (
    <>
      <BottomSheetModal visible={visible} onClose={onClose} title={circleName}>
        <Option Icon={Users} label="View Members" onPress={() => { onClose(); onViewMembers?.(); }} />
        {isAdmin && (
          <Option Icon={SettingsIcon} label="Circle Settings" onPress={() => { onClose(); onSettings?.(); }} />
        )}
        <Option
          Icon={LogOut}
          label="Leave Circle"
          color="#FF453A"
          onPress={() => setConfirmLeave(true)}
        />
      </BottomSheetModal>

      <ConfirmModal
        visible={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeaveConfirmed}
        title={`Leave ${circleName}?`}
        message="You'll lose access to this circle and its activity. An admin can re-invite you."
        confirmLabel="Leave"
        confirmVariant="red"
      />
    </>
  );
};
