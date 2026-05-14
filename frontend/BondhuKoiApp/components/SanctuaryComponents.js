import { styled, Text, Input, YStack, XStack } from "tamagui";

export const BodyText = styled(Text, {
  fontFamily: "$body",
  color: "$onSurface",
  fontSize: 16,
});

export const LabelText = styled(Text, {
  fontFamily: "$body",
  color: "$onSurfaceVariant",
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1,
  textTransform: "uppercase",
});

export const Heading = styled(Text, {
  fontFamily: "$heading",
  color: "$onSurface",
  fontSize: 40,
  fontWeight: "800",
});

export const GhostInput = styled(Input, {
  backgroundColor: "$surfaceContainerLowest",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "$outlineVariant",
  color: "$onSurface",
  paddingHorizontal: 16,
  height: 56, // Fixed height avoids collapse
  fontFamily: "$body",
  fontSize: 16,
  placeholderTextColor: "$onSurfaceVariant",
  focusStyle: {
    borderColor: "$primary",
    borderWidth: 1.5,
  },
});

export const SanctuaryPage = styled(YStack, {
  flex: 1,
  backgroundColor: "$surface",
});

// Custom separator
export const LineSeparator = styled(YStack, {
  height: 1,
  backgroundColor: "$outlineVariant",
  flex: 1,
});

import { View as MotiView, Pressable as MotiPressable } from "moti";

export const ElectricButton = ({ children, onPress, ...props }) => (
  <MotiPressable 
    onPress={onPress} 
    style={{ width: '100%' }}
    animate={({ pressed }) => {
      'worklet';
      return {
        scale: pressed ? 0.96 : 1,
      };
    }}
    transition={{
      type: 'timing',
      duration: 100,
    }}
  >
    <YStack bg="$primaryContainer" p={18} borderRadius={999} ai="center" jc="center" {...props}>
      {children}
    </YStack>
  </MotiPressable>
);

// Custom high-performance loader
export const SanctuaryLoader = ({ 
  message = "Loading...", 
  fullScreen = false, 
  overlay = false 
}) => {
  // Container styles based on mode
  const containerStyle = fullScreen
    ? { flex: 1, backgroundColor: "#111317", alignItems: "center", justifyContent: "center" }
    : overlay
      ? { 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 1000, 
          alignItems: "center", 
          justifyContent: "center", 
          backgroundColor: "rgba(0,0,0,0.7)" 
        }
      : { alignItems: "center", justifyContent: "center", padding: 40 };

  return (
    <YStack style={containerStyle}>
      <YStack ai="center" jc="center" w={100} h={100}>
        {/* Animated Spinning Ring */}
        <MotiView
          from={{ rotate: "0deg" }}
          animate={{ rotate: "360deg" }}
          transition={{
            type: "timing",
            duration: 1200,
            loop: true,
            repeatReverse: false,
          }}
          style={{
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: "transparent",
            borderTopColor: "#47A1FF",
            borderRightColor: "rgba(71, 161, 255, 0.3)",
          }}
        />
        
        {/* Central Brand Mark */}
        <YStack
          w={44}
          h={44}
          borderRadius={12}
          bg="rgba(71, 161, 255, 0.12)"
          ai="center"
          jc="center"
          borderWidth={1}
          borderColor="rgba(71, 161, 255, 0.2)"
        >
          <BodyText color="#47A1FF" fontWeight="900" fontSize={22}>
            B
          </BodyText>
        </YStack>
      </YStack>

      {message && (
        <BodyText 
          mt={24} 
          color={overlay ? "#FFFFFF" : "$onSurfaceVariant"} 
          fontWeight="800" 
          fontSize={12}
          letterSpacing={2}
          style={{ textTransform: "uppercase" }}
        >
          {message}
        </BodyText>
      )}
    </YStack>
  );
};

export const SanctuaryEmptyState = ({ icon: Icon, title, description, actionText, onAction }) => (
  <YStack ai="center" jc="center" p={32} mt={32} bg="$surfaceContainerLow" borderRadius={32} borderWidth={1} borderColor="$outlineVariant">
    <YStack w={80} h={80} borderRadius="$full" bg="$surfaceContainerHighest" ai="center" jc="center" mb={20}>
      {Icon && <Icon color="$onSurfaceVariant" size={40} />}
    </YStack>
    <Heading fontSize={24} mb={12} ta="center">{title}</Heading>
    <BodyText color="$onSurfaceVariant" ta="center" mb={32} lineHeight={24}>{description}</BodyText>
    {actionText && (
      <ElectricButton onPress={onAction}>
        <BodyText fontWeight="800" color="$onPrimary">{actionText}</BodyText>
      </ElectricButton>
    )}
  </YStack>
);
