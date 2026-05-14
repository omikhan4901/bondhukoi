import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, TouchableOpacity, TextInput, Image } from "react-native";
import { useRouter } from "expo-router";
import { YStack, XStack, useTheme } from "tamagui";
import {
  SanctuaryPage,
  Heading,
  BodyText,
  SanctuaryLoader,
} from "../../components/SanctuaryComponents";
import {
  Bell,
  Search,
  GraduationCap,
  Lock,
  Users,
  Plus,
  Check,
  X,
} from "@tamagui/lucide-icons-2";
import { View as MotiView } from "moti";

// Components
import { CircleCard } from "../../components/cards/CircleCard";
import { AvatarStack } from "../../components/ui/AvatarStack";
import { TabScreenWrapper } from "../../src/components/animations/TabScreenWrapper";

// Sheets
import { ShareCircleSheet } from "../../components/sheets/ShareCircleSheet";
import { CircleOptionsSheet } from "../../components/sheets/CircleOptionsSheet";
import { PauseSharingSheet } from "../../components/sheets/PauseSharingSheet";

// UI Components
import { SharingStatusPill } from "../../components/ui/SharingStatusPill";

// API
import { circleService } from "../../src/services/api";
import { useAuth } from "../../src/hooks/useAuth";

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [circles, setCircles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCircle, setShareCircle] = useState(null);
  const [optionsCircle, setOptionsCircle] = useState(null);
  const [pauseSheetOpen, setPauseSheetOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isResponding, setIsResponding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Load circles and invitations in parallel
          const [circlesData, invitationsData] = await Promise.all([
            circleService.getCircles(),
            circleService.getInvitations()
          ]);
          
          // Ensure uniqueness by ID
          const uniqueCircles = [];
          const seenCircles = new Set();
          (circlesData.circles || []).forEach(c => {
            if (!seenCircles.has(c.id)) {
              seenCircles.add(c.id);
              uniqueCircles.push(c);
            }
          });
          
          const uniqueInvites = [];
          const seenInvites = new Set();
          (invitationsData.invitations || []).forEach(i => {
            if (!seenInvites.has(i.id)) {
              seenInvites.add(i.id);
              uniqueInvites.push(i);
            }
          });

          setCircles(uniqueCircles);
          setPendingInvitations(uniqueInvites);
        } catch (err) {
          console.error("Failed to load circles/invites:", err);
          setError(err.message);
          setCircles([]);
          setPendingInvitations([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }, []),
  );

  const filtered = circles.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const active = filtered.filter((c) => c.activeCount > 0);

  const goToCircle = (circle) =>
    router.push({
      pathname: `/group/${circle.id}`,
      params: {
        role: circle.role,
        hasLink: circle.hasMessengerLink ? "true" : "false",
      },
    });
    
  const handleInvitationResponse = async (circleId, accept) => {
    try {
      setIsResponding(true);
      if (accept) {
        await circleService.acceptInvitation(circleId);
        // Add to circles list
        const newCircle = pendingInvitations.find(inv => inv.id === circleId);
        if (newCircle) {
          setCircles(prev => {
            if (prev.some(c => c.id === circleId)) return prev;
            return [...prev, { ...newCircle, role: 'member' }];
          });
        }
      } else {
        await circleService.rejectInvitation(circleId);
      }
      
      // Remove from pending
      setPendingInvitations(prev => prev.filter(inv => inv.id !== circleId));
    } catch (err) {
      console.error("Failed to respond to invitation:", err);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "transparent" }}
    >
      <TabScreenWrapper index={1}>
        <SanctuaryPage>
        {/* Header */}
        <XStack px={24} py={20} jc="space-between" ai="center">
          <XStack ai="center" gap={10}>
            <YStack
              w={36}
              h={36}
              borderRadius={10}
              bg="rgba(71, 161, 255, 0.12)"
              ai="center"
              jc="center"
              borderWidth={1}
              borderColor="rgba(71, 161, 255, 0.2)"
            >
              <BodyText color="#47A1FF" fontWeight="900" fontSize={18}>
                B
              </BodyText>
            </YStack>
            <BodyText color="#47A1FF" fontWeight="800" fontSize={18}>
              Bondhu Koi?
            </BodyText>
          </XStack>
          <XStack ai="center" gap={16}>
            {/* Sharing status pill */}
            <SharingStatusPill
              onPress={() => setPauseSheetOpen(true)}
              size={13}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/notifications")}
            >
              <Bell color="$onSurfaceVariant" size={24} />
            </TouchableOpacity>
          </XStack>
        </XStack>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack mt={24} mb={32}>
            <Heading fontSize={40} mb={10} lineHeight={46}>
              Your Circles
            </Heading>
            <BodyText
              color="$onSurfaceVariant"
              fontSize={16}
              lineHeight={24}
              pr={32}
            >
              Private vaults for your friends, classmates, and teammates.
            </BodyText>
          </YStack>

          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <YStack mb={40}>
              <XStack ai="center" gap={10} mb={20}>
                <Users color="$primary" size={18} />
                <BodyText 
                  fontWeight="800" 
                  color="$primary" 
                  textTransform="uppercase" 
                  letterSpacing={1.5}
                  fontSize={13}
                >
                  Pending Invitations ({pendingInvitations.length})
                </BodyText>
              </XStack>
              
              <YStack gap={12}>
                {pendingInvitations.map((inv) => (
                  <XStack 
                    key={`inv-${inv.id}`}
                    bg="$surfaceContainerLow" 
                    borderRadius={24} 
                    p={16} 
                    ai="center" 
                    jc="space-between"
                    borderWidth={1}
                    borderColor="$outlineVariant"
                  >
                    <XStack ai="center" gap={16} f={1}>
                      <YStack 
                        w={48} 
                        h={48} 
                        borderRadius={14} 
                        bg="$surfaceContainerHighest" 
                        ai="center" 
                        jc="center"
                      >
                        <GraduationCap color="$primary" size={24} />
                      </YStack>
                      <YStack f={1} pr={8}>
                        <BodyText fontWeight="800" fontSize={16} numberOfLines={1}>
                          {inv.name}
                        </BodyText>
                        <BodyText color="$onSurfaceVariant" fontSize={13} numberOfLines={1}>
                          Circle Vault Invitation
                        </BodyText>
                      </YStack>
                    </XStack>
                    
                    <XStack gap={8}>
                      <TouchableOpacity 
                        onPress={() => handleInvitationResponse(inv.id, true)} 
                        disabled={isResponding}
                        activeOpacity={0.7}
                      >
                        <YStack 
                          w={40} 
                          h={40} 
                          borderRadius={12} 
                          bg="$primary" 
                          ai="center" 
                          jc="center"
                        >
                          <Check color="white" size={20} />
                        </YStack>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleInvitationResponse(inv.id, false)} 
                        disabled={isResponding}
                        activeOpacity={0.7}
                      >
                        <YStack 
                          w={40} 
                          h={40} 
                          borderRadius={12} 
                          bg="$surfaceContainerHighest" 
                          ai="center" 
                          jc="center"
                        >
                          <X color="$onSurface" size={20} />
                        </YStack>
                      </TouchableOpacity>
                    </XStack>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* Search */}
          <XStack
            bg="$surfaceContainerLow"
            borderRadius={28}
            px={24}
            py={20}
            ai="center"
            mb={36}
            borderWidth={1}
            borderColor="$outlineVariant"
          >
            <Search color="$onSurfaceVariant" size={22} mr={16} />
            <TextInput
              placeholder="Find a circle..."
              placeholderTextColor="#6C727F"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                fontFamily: "Inter",
                fontSize: 16,
                color: theme.onSurface.get(),
              }}
            />
          </XStack>

          {/* Live Active Circles */}
          {active.length > 0 && (
            <YStack mb={40}>
              <XStack ai="center" jc="space-between" mb={20}>
                <Heading fontSize={22}>Live Activity</Heading>
                <YStack
                  bg="rgba(42, 229, 0, 0.1)"
                  px={10}
                  py={4}
                  borderRadius={6}
                >
                  <BodyText color="#2AE500" fontSize={11} fontWeight="800">
                    REAL-TIME
                  </BodyText>
                </YStack>
              </XStack>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 24, paddingBottom: 10 }}
              >
                {active.map((circle) => (
                  <TouchableOpacity
                    key={`active-${circle.id}`}
                    activeOpacity={0.8}
                    onPress={() => goToCircle(circle)}
                  >
                    <YStack
                      w={180}
                      bg="$surfaceContainerLow"
                      borderRadius={28}
                      p={20}
                      mr={16}
                      borderWidth={1}
                      borderColor="$outlineVariant"
                      overflow="hidden"
                    >
                      {/* Suble map background */}
                      {(circle.snapshotUrl || circle.snapshot_url) && (
                        <Image
                          source={{
                            uri: circle.snapshotUrl || circle.snapshot_url,
                          }}
                          style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            opacity: theme.mode === "dark" ? 0.15 : 0.08,
                          }}
                          resizeMode="cover"
                        />
                      )}
                      <YStack
                        w={44}
                        h={44}
                        borderRadius={14}
                        bg="$surfaceContainerHighest"
                        ai="center"
                        jc="center"
                        mb={16}
                      >
                        {circle.type === "university" ? (
                          <GraduationCap color="$primary" size={22} />
                        ) : (
                          <Lock color="$primary" size={22} />
                        )}
                      </YStack>
                      <BodyText
                        fontWeight="800"
                        fontSize={16}
                        mb={8}
                        numberOfLines={1}
                        color="$onSurface"
                      >
                        {circle.name}
                      </BodyText>
                      <XStack
                        ai="center"
                        gap={8}
                        bg="rgba(42, 229, 0, 0.12)"
                        px={10}
                        py={6}
                        borderRadius={999}
                        selfFlex="flex-start"
                      >
                        <YStack
                          w={6}
                          h={6}
                          borderRadius="$full"
                          bg="#2AE500"
                          style={{
                            shadowColor: "#2ae500",
                            shadowOpacity: 0.8,
                            shadowRadius: 6,
                          }}
                        />
                        <BodyText
                          color="#2AE500"
                          fontSize={12}
                          fontWeight="800"
                          letterSpacing={0.5}
                        >
                          {circle.activeCount} INSIDE
                        </BodyText>
                      </XStack>
                    </YStack>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </YStack>
          )}

          {/* Full Cards */}
          {isLoading ? (
            <SanctuaryLoader message="Discovering Circles" />
          ) : error ? (
            <YStack ai="center" jc="center" py={40}>
              <BodyText color="#FF453A">{error}</BodyText>
            </YStack>
          ) : filtered.length === 0 ? (
            <YStack ai="center" jc="center" py={40}>
              <BodyText color="$onSurfaceVariant">No circles found</BodyText>
            </YStack>
          ) : (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 1000, delay: 400 }}
          >
            <YStack mb={8}>
              {filtered.map((circle) => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  onPress={() => goToCircle(circle)}
                  onShare={() => setShareCircle(circle)}
                  onMore={() => setOptionsCircle(circle)}
                />
              ))}
            </YStack>
          </MotiView>
          )}

          {/* Create Banner */}
          <YStack
            bg={theme.mode === "dark" ? "#0D192B" : "$surfaceContainerLow"}
            borderRadius={40}
            p={36}
            mt={24}
            ai="center"
            borderWidth={1}
            borderColor="$outlineVariant"
            overflow="hidden"
          >
            <YStack
              position="absolute"
              top={-60}
              left={-60}
              w={220}
              h={220}
              borderRadius="$full"
              bg={theme.mode === "dark" ? "#12233D" : "$surfaceContainerHigh"}
              opacity={0.6}
            />
            <YStack
              position="absolute"
              bottom={-100}
              right={-60}
              w={280}
              h={280}
              borderRadius="$full"
              bg={theme.mode === "dark" ? "#162C4C" : "$surfaceContainerHigh"}
              opacity={0.4}
            />
            <YStack
              w={72}
              h={72}
              borderRadius="$full"
              bg="$surfaceContainerHighest"
              ai="center"
              jc="center"
              mb={24}
            >
              <Users color="$primary" size={32} />
            </YStack>
            <Heading
              fontSize={28}
              color="$onSurface"
              textAlign="center"
              mb={16}
            >
              Start a New Circle
            </Heading>
            <BodyText
              color="$onSurfaceVariant"
              fontSize={16}
              textAlign="center"
              lineHeight={24}
              mb={32}
            >
              Create a private vault for your coworkers, teammates, or close
              ones.
            </BodyText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/group/create")}
              style={{ width: "100%" }}
            >
              <YStack
                bg="$primaryContainer"
                borderRadius={999}
                py={18}
                ai="center"
                jc="center"
                style={{
                  shadowColor: theme.primaryContainer.get(),
                  shadowOpacity: 0.3,
                  shadowRadius: 15,
                }}
              >
                <BodyText
                  color={theme.mode === "dark" ? "#111317" : "#FFFFFF"}
                  fontWeight="900"
                  fontSize={16}
                >
                  Create Circle Vault
                </BodyText>
              </YStack>
            </TouchableOpacity>
          </YStack>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/group/create")}
          style={{ position: "absolute", bottom: 100, right: 24, zIndex: 100 }}
        >
          <YStack
            w={64}
            h={64}
            borderRadius="$full"
            bg="$primaryContainer"
            ai="center"
            jc="center"
            style={{
              shadowColor: theme.primaryContainer.get(),
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <XStack ai="center" jc="center">
              <Users
                color={theme.mode === "dark" ? "#111317" : "#FFFFFF"}
                size={28}
              />
              <YStack
                position="absolute"
                top={-6}
                right={-12}
                bg={theme.mode === "dark" ? "#111317" : "#FFFFFF"}
                borderRadius={10}
                borderWidth={2}
                borderColor="$primaryContainer"
                ai="center"
                jc="center"
                p={3}
              >
                <Plus color="$primaryContainer" size={12} strokeWidth={4} />
              </YStack>
            </XStack>
          </YStack>
        </TouchableOpacity>

        {/* Sheets */}
        <ShareCircleSheet
          visible={!!shareCircle}
          onClose={() => setShareCircle(null)}
          circleName={shareCircle?.name}
          circleId={shareCircle?.id}
        />
        <CircleOptionsSheet
          visible={!!optionsCircle}
          onClose={() => setOptionsCircle(null)}
          isAdmin={optionsCircle?.role === "admin"}
          circleName={optionsCircle?.name}
          onViewMembers={() => {
            if (!optionsCircle) return;
            const circle = optionsCircle;
            setOptionsCircle(null);
            setTimeout(() => goToCircle(circle), 100);
          }}
          onSettings={() => {
            if (!optionsCircle) return;
            const circle = optionsCircle;
            setOptionsCircle(null);
            setTimeout(() => goToCircle(circle), 100);
          }}
          onLeave={async () => {
            if (!optionsCircle) return;
            try {
              await circleService.removeMember(optionsCircle.id, user.id);
              setCircles((prev) =>
                prev.filter((c) => c.id !== optionsCircle.id),
              );
              setOptionsCircle(null);
            } catch (err) {
              console.error("Failed to leave circle:", err);
            }
          }}
        />
        <PauseSharingSheet
          visible={pauseSheetOpen}
          onClose={() => setPauseSheetOpen(false)}
          isPaused={user?.isSharingEnabled === false}
          onToggle={() => setPauseSheetOpen(false)}
        />
        </SanctuaryPage>
      </TabScreenWrapper>
    </SafeAreaView>
  );
}
