import React from 'react';
import { YStack, XStack } from 'tamagui';
import { MessageSquare } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';

/**
 * MessageStubSheet — placeholder chat sheet (coming soon)
 * @param {string} friendName - name to display in the sheet header
 */
export const MessageStubSheet = ({ visible, onClose, friendName = 'Friend' }) => (
  <BottomSheetModal visible={visible} onClose={onClose} title={`Message ${friendName}`}>
    <YStack ai="center" py={32}>
      <YStack
        w={72}
        h={72}
        borderRadius="$full"
        bg="rgba(71, 161, 255, 0.1)"
        ai="center" jc="center"
        mb={20}
      >
        <MessageSquare color="#47A1FF" size={36} />
      </YStack>
      <Heading fontSize={22} mb={12} ta="center">Direct Messages</Heading>
      <BodyText color="$onSurfaceVariant" fontSize={15} lineHeight={22} ta="center">
        In-app messaging is coming soon.{'\n'}Use the Messenger link in your Circle for now.
      </BodyText>
    </YStack>
  </BottomSheetModal>
);
