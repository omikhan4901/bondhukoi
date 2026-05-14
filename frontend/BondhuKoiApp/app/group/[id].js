import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { YStack, XStack, useTheme } from "tamagui";
import {
  SanctuaryPage,
  Heading,
  BodyText,
  SanctuaryLoader,
} from "../../components/SanctuaryComponents";
import {
  ChevronLeft,
  GraduationCap,
  Lock,
  MessageCircle,
  Settings as SettingsIcon,
  Link as LinkIcon,
  MapPin,
  UserPlus,
} from "@tamagui/lucide-icons-2";

// Components
import { MemberRow } from "../../components/cards/MemberRow";
import { SectionHeader } from "../../components/ui/SectionHeader";

// Sheets
import { MessengerLinkSheet } from "../../components/sheets/MessengerLinkSheet";
import { ManageMemberSheet } from "../../components/sheets/ManageMemberSheet";
import { BoundaryEditorSheet } from "../../components/sheets/BoundaryEditorSheet";
import { AddMemberSheet } from "../../components/sheets/AddMemberSheet";
import { CircleSettingsSheet } from "../../components/sheets/CircleSettingsSheet";
import { LocationPickerSheet } from "../../components/sheets/LocationPickerSheet";

// API
import { circleService, locationService, userService, friendService } from "../../src/services/api";

export default function GroupDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [circle, setCircle] = useState(null);
  const [circleName, setCircleName] = useState("");
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(params.role || "member");
  const [hasLink, setHasLink] = useState(params.hasLink === "true");
  const [messengerUrl, setMessengerUrl] = useState("");
  const [openInvite, setOpenInvite] = useState(false);
  const [location, setLocation] = useState("Campus Area");
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [user, setUser] = useState(null);

  const isAdmin = role === "admin";

  // Sheet states
  const [messengerSheetOpen, setMessengerSheetOpen] = useState(false);
  const [manageMember, setManageMember] = useState(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [circleSettingsOpen, setCircleSettingsOpen] = useState(false);
  const [boundaryEditorOpen, setBoundaryEditorOpen] = useState(false);
  const [boundary, setBoundary] = useState([]);
  const [circleSnapshotUrl, setCircleSnapshotUrl] = useState(null);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState(null);

  const [isPending, setIsPending] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const theme = useTheme();

  const loadCircleData = useCallback(async () => {
    if (!params.id) return;
    try {
      setIsLoading(true);
      setError(null);

      // Fetch circle data AND boundary in parallel
      const [data, boundaryData, currentUser] = await Promise.all([
        circleService.getCircleById(params.id),
        locationService.getCircleBoundary(params.id),
        userService.getCurrentUser()
      ]);

      setUser(currentUser.user);

      const c = data.circle;
      setCircle(c);
      setCircleName(c.name || "Circle");
      setRole(data.role || params.role || "member");
      setHasLink(c.hasMessengerLink || false);
      setMessengerUrl(c.messengerLink || "");
      setOpenInvite(c.isOpen || false);
      setLocation(c.locationLabel || "Campus Area");
      setMembers(data.members || []);

      const myMembership = (data.members || []).find(m => m.userId === currentUser.id);
      setIsPending(myMembership?.status === 'pending');

      // Set snapshot from circle data, boundary confirms it exists
      setBoundary(boundaryData?.boundary || []);
      setCircleSnapshotUrl(c.snapshotUrl || c.snapshot_url || null);
      setSnapshotUpdatedAt(c.snapshotUpdatedAt || c.snapshot_updated_at || null);
    } catch (err) {
      console.error("Failed to load circle data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, params.role]);

  const handleAcceptInvite = async () => {
    setIsProcessingInvite(true);
    try {
      await circleService.acceptInvitation(params.id);
      setIsPending(false);
      loadCircleData();
    } catch (err) {
      Alert.alert("Error", "Failed to accept invitation");
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleRejectInvite = async () => {
    Alert.alert(
      "Reject Invitation",
      "Are you sure you want to decline this invitation?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive", 
          onPress: async () => {
            setIsProcessingInvite(true);
            try {
              await circleService.rejectInvitation(params.id);
              router.replace('/circles');
            } catch (err) {
              Alert.alert("Error", "Failed to reject invitation");
            } finally {
              setIsProcessingInvite(false);
            }
          } 
        }
      ]
    );
  };
  useEffect(() => {
    loadCircleData();
  }, [loadCircleData]);

  useFocusEffect(
    useCallback(() => {
      loadCircleData();
    }, [loadCircleData]),
  );
  const isUniversityCircle = circle?.type === "university";

  // Save messenger link to API
  const handleMessengerSave = async (url) => {
    try {
      await circleService.updateMessengerLink(params.id, url);
      setMessengerUrl(url);
      setHasLink(!!url);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save messenger link");
    }
  };

  // Save location label to API
  const handleLocationSave = async (loc) => {
    try {
      await circleService.updateLocationLabel(params.id, loc);
      setLocation(loc);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save location");
    }
  };

  // Save circle name to API
  const handleCircleNameSave = async (name) => {
    try {
      await circleService.updateCircle(params.id, name);
      setCircleName(name);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to rename circle");
    }
  };

  // Delete circle via API
  const handleDeleteCircle = async () => {
    try {
      await circleService.deleteCircle(params.id);
      setCircleSettingsOpen(false); // Close before navigating
      setTimeout(() => router.replace("/groups"), 100);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to delete circle");
    }
  };

  // Remove member via API
  const handleRemoveMember = async (member) => {
    try {
      await circleService.removeMember(params.id, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      
      // If removing self, navigate home
      if (member.userId === user?.id) {
        setManageMember(null); // Close before navigating
        setTimeout(() => router.replace("/groups"), 100);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to remove member");
    }
  };

  // Update member role via API
  const handleRoleChanged = async (userId, newRole) => {
    try {
      await circleService.updateMemberRole(params.id, userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update role");
    }
  };

  // Member added callback — refresh member list
  const handleMemberAdded = (newUser) => {
    setMembers((prev) => [
      ...prev,
      {
        id: newUser.id,
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        university: newUser.university,
        role: "member",
        status: "pending",
      },
    ]);
  };

  // Toggle open invite via API
  const handleOpenInviteToggle = async (val) => {
    setOpenInvite(val); // optimistic
    setIsSavingInvite(true);
    try {
      await circleService.updateOpenInvite(params.id, val);
    } catch (err) {
      setOpenInvite(!val); // revert
      Alert.alert("Error", err.message || "Failed to update invite setting");
    } finally {
      setIsSavingInvite(false);
    }
  };

  const handleOpenBoundaryEditor = () => {
    Alert.alert(
      "Zone Limit",
      "Saving a zone boundary uses significant server resources. You can only save changes a limited number of times per day. Make sure your drawing is accurate before hitting Save!",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Editor", onPress: () => setBoundaryEditorOpen(true) }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <SanctuaryPage>
          <SanctuaryLoader message="Loading circle..." fullScreen />
        </SanctuaryPage>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <SanctuaryPage>
          <XStack px={24} py={20} ai="center">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft color="$onSurface" size={28} />
            </TouchableOpacity>
          </XStack>
          <YStack f={1} ai="center" jc="center" px={32}>
            <BodyText color="#FF453A" textAlign="center" mb={16}>
              {error}
            </BodyText>
            <TouchableOpacity onPress={loadCircleData}>
              <YStack bg="$primary" px={24} py={12} borderRadius={999}>
                <BodyText color="$onPrimary" fontWeight="700">
                  Retry
                </BodyText>
              </YStack>
            </TouchableOpacity>
          </YStack>
        </SanctuaryPage>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "transparent" }}
    >
      <SanctuaryPage>
        {/* Header */}
        <XStack px={24} py={20} ai="center" jc="space-between">
          <XStack ai="center" gap={16} f={1}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft color="$onSurface" size={28} />
            </TouchableOpacity>
            <YStack f={1}>
              <XStack ai="center" gap={10}>
                <Heading fontSize={26} letterSpacing={-0.5}>
                  {circleName}
                </Heading>
                {isUniversityCircle ? (
                  <YStack
                    bg="$primary"
                    opacity={0.15}
                    px={8}
                    py={4}
                    borderRadius={8}
                  >
                    <GraduationCap color="$primary" size={16} />
                  </YStack>
                ) : (
                  <YStack
                    bg="$surfaceContainerHighest"
                    px={8}
                    py={4}
                    borderRadius={8}
                  >
                    <Lock color="$onSurfaceVariant" size={16} />
                  </YStack>
                )}
              </XStack>
              <BodyText color="$onSurfaceVariant" fontSize={14} mt={3}>
                {members.length} Members
              </BodyText>
            </YStack>
          </XStack>

          {isAdmin && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCircleSettingsOpen(true)}
            >
              <SettingsIcon color="$onSurfaceVariant" size={24} />
            </TouchableOpacity>
          )}
        </XStack>

        {isPending && (
          <YStack
            bg="rgba(71, 161, 255, 0.1)"
            borderBottomWidth={1}
            borderColor="rgba(71, 161, 255, 0.2)"
            px={24}
            py={20}
            gap={16}
          >
            <YStack gap={4}>
              <Heading fontSize={18}>Circle Invitation</Heading>
              <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={20}>
                You've been invited to join this circle. Accept to see members' status and the zone boundary.
              </BodyText>
            </YStack>
            <XStack gap={12}>
              <TouchableOpacity 
                onPress={handleAcceptInvite} 
                disabled={isProcessingInvite}
                style={{ flex: 1 }}
              >
                <YStack bg="$primary" py={12} borderRadius={12} ai="center">
                  <BodyText color="$onPrimary" fontWeight="800">
                    {isProcessingInvite ? 'Processing...' : 'Accept'}
                  </BodyText>
                </YStack>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleRejectInvite}
                disabled={isProcessingInvite}
                style={{ flex: 1 }}
              >
                <YStack bg="$surfaceContainerHigh" py={12} borderRadius={12} ai="center">
                  <BodyText color="$onSurface" fontWeight="800">Decline</BodyText>
                </YStack>
              </TouchableOpacity>
            </XStack>
          </YStack>
        )}

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {isPending ? (
            <YStack f={1} ai="center" jc="center" py={100} gap={16}>
              <UserPlus color="$onSurfaceVariant" size={48} opacity={0.3} />
              <BodyText color="$onSurfaceVariant" ta="center" px={40}>
                Please accept the invitation to view the circle details and members.
              </BodyText>
            </YStack>
          ) : (
            <>
              {/* Messenger Link */}
          <YStack mb={40} mt={16}>
            {hasLink ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => isAdmin && setMessengerSheetOpen(true)}
              >
                <XStack
                  bg="$primary"
                  borderRadius={20}
                  py={20}
                  px={24}
                  ai="center"
                  jc="space-between"
                  style={{
                    shadowColor: "$primary",
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                  }}
                >
                  <XStack ai="center" gap={14}>
                    <MessageCircle color="$onPrimary" size={26} />
                    <BodyText color="$onPrimary" fontWeight="900" fontSize={17}>
                      Open Messenger Group
                    </BodyText>
                  </XStack>
                  {isAdmin && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        setMessengerSheetOpen(true);
                      }}
                    >
                      <YStack bg="rgba(0,0,0,0.1)" p={10} borderRadius={999}>
                        <SettingsIcon color="$onPrimary" size={18} />
                      </YStack>
                    </TouchableOpacity>
                  )}
                </XStack>
              </TouchableOpacity>
            ) : isAdmin ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setMessengerSheetOpen(true)}
              >
                <XStack
                  borderStyle="dashed"
                  borderWidth={2}
                  borderColor="$outlineVariant"
                  borderRadius={20}
                  py={20}
                  px={24}
                  ai="center"
                  jc="center"
                  gap={12}
                >
                  <LinkIcon color="$onSurfaceVariant" size={22} />
                  <BodyText
                    color="$onSurfaceVariant"
                    fontWeight="800"
                    fontSize={16}
                  >
                    Connect a Messenger Link
                  </BodyText>
                </XStack>
              </TouchableOpacity>
            ) : null}
          </YStack>

          {/* Admin Controls */}
          {isAdmin && (
            <YStack mb={40}>
              <Heading fontSize={20} mb={16}>
                Admin Controls
              </Heading>
              <XStack
                bg="$surfaceContainerLow"
                borderRadius={24}
                p={20}
                ai="center"
                jc="space-between"
                borderWidth={1}
                borderColor="$outlineVariant"
                opacity={isSavingInvite ? 0.6 : 1}
              >
                <YStack f={1} mr={16}>
                  <BodyText fontWeight="800">Open Invites</BodyText>
                  <BodyText
                    fontSize={14}
                    color="$onSurfaceVariant"
                    mt={6}
                    lineHeight={20}
                  >
                    Allow any member to invite others without your manual
                    approval.
                  </BodyText>
                </YStack>
                <Switch
                  value={openInvite}
                  onValueChange={handleOpenInviteToggle}
                  trackColor={{ false: theme.surfaceContainerHighest.get(), true: theme.primary.get() }}
                  thumbColor={openInvite ? theme.onPrimary.get() : theme.onSurfaceVariant.get()}
                  disabled={isSavingInvite}
                />
              </XStack>
            </YStack>
          )}

          {/* Zone Boundary - Only for Private Circles */}
          {!isUniversityCircle && (
            <YStack mb={48}>
              <XStack ai="center" jc="space-between" mb={16}>
                <Heading fontSize={20}>Zone Boundary</Heading>
                {isAdmin && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleOpenBoundaryEditor}
                  >
                    <XStack
                      bg="$surfaceContainerHigh"
                      px={16}
                      py={8}
                      borderRadius={999}
                      ai="center"
                      gap={6}
                      borderWidth={1}
                      borderColor="$outlineVariant"
                    >
                      <MapPin color="$onSurfaceVariant" size={14} />
                      <BodyText
                        fontSize={12}
                        color="$onSurfaceVariant"
                        fontWeight="800"
                      >
                        Draw Zone
                      </BodyText>
                    </XStack>
                  </TouchableOpacity>
                )}
              </XStack>
              <TouchableOpacity
                activeOpacity={isAdmin ? 0.8 : 1}
                onPress={() => isAdmin && handleOpenBoundaryEditor()}
              >
                <YStack
                  h={220}
                  bg="$surfaceContainerLow"
                  borderRadius={32}
                  borderWidth={1}
                  borderColor="$outlineVariant"
                  overflow="hidden"
                >
                  {circleSnapshotUrl || circle?.snapshotUrl ? (
                    <Image
                      source={{ 
                        uri: snapshotUpdatedAt || circle?.snapshotUpdatedAt
                          ? `${circleSnapshotUrl || circle?.snapshotUrl}?t=${new Date(snapshotUpdatedAt || circle?.snapshotUpdatedAt).getTime()}`
                          : circleSnapshotUrl || circle?.snapshotUrl 
                      }}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        opacity: 0.7,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <YStack
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.08,
                          backgroundColor: "$primary",
                        }}
                      />
                      <YStack f={1} ai="center" jc="center">
                        <YStack
                          bg="$primary"
                          opacity={0.15}
                          p={16}
                          borderRadius="$full"
                          mb={16}
                        >
                          <MapPin color="$primary" size={40} />
                        </YStack>
                        <BodyText
                          color="$onSurface"
                          fontSize={17}
                          fontWeight="800"
                        >
                          No Zone Set
                        </BodyText>
                        <BodyText
                          color="$onSurfaceVariant"
                          fontSize={14}
                          mt={8}
                          ta="center"
                          px={32}
                          lineHeight={20}
                        >
                          {isAdmin
                            ? "Tap to draw the boundary for this circle."
                            : "No zone boundary configured yet."}
                        </BodyText>
                      </YStack>
                    </>
                  )}
                </YStack>
              </TouchableOpacity>
            </YStack>
          )}

          {/* Members */}
          <SectionHeader
            title="Members Status"
            actionLabel={isAdmin || openInvite ? "Invite" : "Locked"}
            onAction={
              isAdmin || openInvite ? () => setAddMemberOpen(true) : undefined
            }
            mb={20}
          />

          <YStack mb={32}>
            {members.map((member) => (
              <MemberRow
                key={member.id || member.userId}
                member={member}
                isAdmin={isAdmin}
                isUniversityCircle={isUniversityCircle}
                onManage={() => setManageMember(member)}
              />
            ))}
          </YStack>
        </>
      )}
    </ScrollView>
      </SanctuaryPage>

      {/* Sheets */}
      <MessengerLinkSheet
        visible={messengerSheetOpen}
        onClose={() => setMessengerSheetOpen(false)}
        currentUrl={messengerUrl}
        onSave={handleMessengerSave}
      />
      <ManageMemberSheet
        visible={!!manageMember}
        onClose={() => setManageMember(null)}
        member={manageMember}
        circleId={params.id}
        currentUserId={user?.id}
        onRemove={handleRemoveMember}
        onRoleChanged={handleRoleChanged}
      />
      <LocationPickerSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        currentLocation={location}
        onSave={handleLocationSave}
      />
      <BoundaryEditorSheet
        visible={boundaryEditorOpen}
        onClose={() => setBoundaryEditorOpen(false)}
        circleId={params.id}
        entityName={circleName}
        initialBoundary={boundary}
        onSaved={(url) => {
          setCircleSnapshotUrl(url);
          setSnapshotUpdatedAt(new Date().toISOString());
          setBoundaryEditorOpen(false);
          loadCircleData(); // Refresh everything to be sure
        }}
      />
      <AddMemberSheet
        visible={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        circleId={params.id}
        onAdded={handleMemberAdded}
      />
      <CircleSettingsSheet
        visible={circleSettingsOpen}
        onClose={() => setCircleSettingsOpen(false)}
        circleId={params.id}
        currentName={circleName}
        onSave={handleCircleNameSave}
        onDelete={handleDeleteCircle}
      />
    </SafeAreaView>
  );
}
