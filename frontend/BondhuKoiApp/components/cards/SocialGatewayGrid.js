import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Facebook, Instagram, MessageCircle, Plus } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';

const PLATFORMS = [
  { key: 'facebook',  label: 'Messenger', Icon: MessageCircle, color: '#1877F2', bg: 'rgba(24, 119, 242, 0.12)' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram,    color: '#E1306C', bg: 'rgba(225, 48, 108, 0.12)' },
];

/**
 * SocialGatewayGrid — 2×2 grid of social platform tiles
 * @param {object} socials - { facebook: bool, instagram: bool }
 * @param {function} onAdd - tap "Add New" tile
 * @param {function} onEdit - (key) tap an existing tile
 */
export const SocialGatewayGrid = ({ socials = {}, onAdd, onEdit }) => (
  <XStack flexWrap="wrap" mx={-6}>
    {PLATFORMS.map(({ key, label, Icon, color, bg }) => {
      const connected = !!socials[key];
      return (
        <TouchableOpacity
          key={key}
          onPress={() => onEdit?.(key)}
          activeOpacity={0.8}
          style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}
        >
          <YStack
            bg={connected ? bg : '$surfaceContainerLow'}
            borderRadius={20}
            p={16}
            ai="center"
            jc="center"
            borderWidth={1}
            borderColor={connected ? `${color}33` : '$outlineVariant'}
            minHeight={90}
          >
            <Icon color={connected ? color : '$onSurfaceVariant'} size={28} mb={8} />
            <BodyText fontSize={13} fontWeight="700" color={connected ? color : '$onSurfaceVariant'}>
              {label}
            </BodyText>
            {connected && (
              <YStack
                position="absolute" top={8} right={8}
                w={8} h={8} borderRadius="$full" bg="#2AE500"
              />
            )}
          </YStack>
        </TouchableOpacity>
      );
    })}

    {/* Add New tile */}
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={0.8}
      style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}
    >
      <YStack
        bg="$surfaceContainerLow"
        borderRadius={20}
        p={16}
        ai="center"
        jc="center"
        borderWidth={1}
        borderColor="$outlineVariant"
        minHeight={90}
        borderStyle="dashed"
      >
        <Plus color="$onSurfaceVariant" size={24} mb={8} />
        <BodyText fontSize={13} color="$onSurfaceVariant">Add New</BodyText>
      </YStack>
    </TouchableOpacity>
  </XStack>
);
