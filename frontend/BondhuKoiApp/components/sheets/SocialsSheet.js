import React from 'react';
import { Image, TouchableOpacity, Linking } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Facebook, Instagram } from '@tamagui/lucide-icons-2';
import { Heading, BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877F2', bg: 'rgba(24,119,242,0.12)', urlPrefix: 'https://facebook.com/' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C', bg: 'rgba(225,48,108,0.12)', urlPrefix: 'https://instagram.com/' },
];

// Deterministic color from name
const nameToColor = (name = '') => {
  const colors = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/**
 * SocialsSheet — shows a friend's social handles with real avatar
 * @param {object} friend - { name, avatarUrl, socials: { facebook, instagram } }
 */
export const SocialsSheet = ({ visible, onClose, friend }) => {
  if (!friend) return null;

  const hasSocials = PLATFORMS.some((p) => friend.socials?.[p.key]);
  const bgColor = nameToColor(friend.name);

  const handleOpen = (platform, handle) => {
    const url = platform.urlPrefix + handle.replace('@', '');
    Linking.openURL(url).catch(() => {});
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Social Connections">
      {/* Friend header with real avatar */}
      <XStack ai="center" gap={18} mb={28} pb={24} borderBottomWidth={1} borderBottomColor="$outlineVariant">
        <YStack w={64} h={64} borderRadius="$full" bg={bgColor}
          ai="center" jc="center" overflow="hidden"
          borderWidth={1} borderColor="rgba(255,255,255,0.05)">
          {friend.avatarUrl ? (
            <Image source={{ uri: friend.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
          ) : (
            <BodyText fontWeight="800" fontSize={26} color="#FFFFFF">
              {friend.name?.[0]?.toUpperCase() || '?'}
            </BodyText>
          )}
        </YStack>
        <YStack>
          <Heading fontSize={22}>{friend.name}</Heading>
          <BodyText fontSize={13} color="$onSurfaceVariant" mt={4}>Choose a platform to connect</BodyText>
        </YStack>
      </XStack>

      <YStack gap={14}>
        {hasSocials ? (
          PLATFORMS.map((platform) => {
            const handle = friend.socials?.[platform.key];
            if (!handle) return null;
            return (
              <TouchableOpacity
                key={platform.key}
                onPress={() => handleOpen(platform, handle)}
                activeOpacity={0.8}
              >
                <XStack
                  bg={platform.bg} borderRadius={24} p={20}
                  ai="center" gap={16} borderWidth={1}
                  borderColor={`${platform.color}44`}
                >
                  <YStack w={48} h={48} borderRadius={16} bg="rgba(0,0,0,0.2)" ai="center" jc="center">
                    <platform.Icon color={platform.color} size={28} />
                  </YStack>
                  <YStack f={1}>
                    <BodyText fontWeight="800" fontSize={16} color={platform.color}>{platform.label}</BodyText>
                    <BodyText fontSize={14} color="$onSurface" mt={3} fontWeight="600">{handle}</BodyText>
                  </YStack>
                  <YStack bg="rgba(255,255,255,0.05)" px={12} py={6} borderRadius={999}>
                    <BodyText fontSize={12} color={platform.color} fontWeight="900">OPEN →</BodyText>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            );
          })
        ) : (
          <YStack ai="center" py={20}>
            <BodyText color="$onSurfaceVariant" fontSize={15} ta="center" lineHeight={22}>
              {friend.name} hasn't added any public social IDs yet.
            </BodyText>
          </YStack>
        )}
      </YStack>
    </BottomSheetModal>
  );
};
