import React from "react";
import { TouchableOpacity, Image } from "react-native";
import { YStack, XStack, useTheme } from "tamagui";
import {
  GraduationCap,
  Lock,
  Share2,
  MoreVertical,
  MapPin,
} from "@tamagui/lucide-icons-2";
import {
  Svg,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { Heading, BodyText } from "../SanctuaryComponents";
import { AvatarStack } from "../ui/AvatarStack";

/**
 * CircleCard — large full-width circle card with map background
 * @param {object} circle - circle data object
 * @param {function} onPress - navigate into circle
 * @param {function} onShare - tap share icon
 * @param {function} onMore - tap ⋮ icon
 */
export const CircleCard = ({ circle, onPress, onShare, onMore }) => {
  const theme = useTheme();
  const snapshotUrl = circle.snapshotUrl || circle.snapshot_url;
  const isUniversity = circle.type === "university";

  // Use theme colors for gradient and card background
  const cardBg = theme.surfaceContainerLowest.get();
  const onSurfaceColor = theme.onSurface.get();
  const onSurfaceVariantColor = theme.onSurfaceVariant.get();

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <YStack
        borderRadius={40}
        mb={32}
        borderWidth={1}
        borderColor="$outlineVariant"
        overflow="hidden"
        minHeight={420}
        bg="$surfaceContainerLowest"
        style={{
          shadowColor: "#000",
          shadowOpacity: theme.mode === "dark" ? 0.3 : 0.08,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        {/* Top Section: Map Snapshot or Fallback */}
        <YStack h={260} bg="$surfaceContainerLow" overflow="hidden">
          {snapshotUrl ? (
            <Image
              source={{ 
                uri: circle.snapshotUpdatedAt 
                  ? `${snapshotUrl}?t=${new Date(circle.snapshotUpdatedAt).getTime()}`
                  : snapshotUrl 
              }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <YStack f={1} ai="center" jc="center" opacity={0.4}>
              <YStack
                w={80}
                h={80}
                borderRadius={24}
                bg="$surfaceContainerHighest"
                ai="center"
                jc="center"
                mb={12}
              >
                {isUniversity ? (
                  <GraduationCap color="$primary" size={40} />
                ) : (
                  <MapPin color="$onSurfaceVariant" size={40} />
                )}
              </YStack>
              <BodyText color="$onSurfaceVariant" fontSize={14} fontWeight="600">
                No Zone Set
              </BodyText>
            </YStack>
          )}

          {/* Overlays to blend with content */}
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(0, 0, 0, 0.05)"
          />

          <YStack position="absolute" left={0} right={0} bottom={0} h={120}>
            <Svg height="100%" width="100%">
              <Defs>
                <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={cardBg} stopOpacity="0" />
                  <Stop offset="1" stopColor={cardBg} stopOpacity="1" />
                </SvgGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
            </Svg>
          </YStack>

          {/* INSIDE Pill */}
          <XStack position="absolute" top={24} left={24}>
            <XStack
              bg="rgba(42, 229, 0, 0.15)"
              px={16}
              py={8}
              borderRadius={999}
              ai="center"
              gap={8}
              borderWidth={1}
              borderColor="rgba(42, 229, 0, 0.25)"
            >
              <YStack
                w={8}
                h={8}
                borderRadius="$full"
                bg="#2AE500"
                style={{
                  shadowColor: "#2ae500",
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                }}
              />
              <BodyText color="#2AE500" fontWeight="900" fontSize={12} letterSpacing={1}>
                {circle.activeCount || 0} INSIDE
              </BodyText>
            </XStack>
          </XStack>

          {/* Avatar Stack in Map Corner */}
          <XStack position="absolute" top={24} right={24}>
            <AvatarStack members={circle.members || []} count={circle.memberCount} />
          </XStack>
        </YStack>

        {/* Bottom Section: Info & Actions */}
        <YStack p={32} f={1} bg="$surfaceContainerLowest" mt={-20} borderRadius={32}>
          <XStack ai="center" jc="space-between" mb={10}>
            <XStack ai="center" gap={12}>
              <Heading fontSize={28} fontWeight="900" color="$onSurface" letterSpacing={-0.5}>
                {circle.name}
              </Heading>
              {isUniversity ? (
                <GraduationCap color="$primary" size={24} />
              ) : (
                <Lock color="$onSurfaceVariant" size={22} />
              )}
            </XStack>
          </XStack>

          <BodyText
            color="$onSurfaceVariant"
            fontSize={15}
            lineHeight={22}
            mb={32}
            numberOfLines={2}
          >
            {circle.description || "Stay connected with your inner circle in real-time."}
          </BodyText>

          <XStack ai="center" jc="space-between" mt="auto">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onPress();
              }}
            >
              <YStack
                bg={theme.mode === "dark" ? "#FFFFFF" : "#111317"}
                px={28}
                py={16}
                borderRadius={20}
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                }}
              >
                <BodyText
                  color={theme.mode === "dark" ? "#111317" : "#FFFFFF"}
                  fontWeight="900"
                  fontSize={15}
                >
                  Enter Vault
                </BodyText>
              </YStack>
            </TouchableOpacity>

            <XStack ai="center" gap={20}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                }}
              >
                <Share2 color="$onSurface" opacity={0.7} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  onMore();
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                }}
              >
                <MoreVertical color="$onSurface" opacity={0.7} size={20} />
              </TouchableOpacity>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </TouchableOpacity>
  );
};
