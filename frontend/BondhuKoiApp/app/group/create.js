import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, ScrollView, Switch, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Input, useTheme } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../../components/SanctuaryComponents';
import { X, CornerUpLeft, CheckCircle, Users, Check, Info } from '@tamagui/lucide-icons-2';

// Components
import { TagPill } from '../../components/ui/TagPill';

import { BottomSheetModal } from '../../components/modals/BottomSheetModal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { BoundaryEditorSheet } from '../../components/sheets/BoundaryEditorSheet';

// API
import { circleService, userService, friendService } from '../../src/services/api';


export default function CreateGroupScreen() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [isUniversityGroup, setIsUniversityGroup] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [user, setUser] = useState(null);

  // Sheet states
  const [uniInfoOpen, setUniInfoOpen] = useState(false);
  const [boundaryInfoOpen, setBoundaryInfoOpen] = useState(false);
  const [boundaryEditorOpen, setBoundaryEditorOpen] = useState(false);
  const [boundary, setBoundary] = useState([]);
  const [snapshotBase64, setSnapshotBase64] = useState(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const theme = useTheme();

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, friendData] = await Promise.all([
        userService.getCurrentUser(),
        friendService.getFriendsList()
      ]);
      setUser(userData.user);
      setFriends(friendData.friends || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const toggleFriend = (id) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleToggleUniversityGroup = (val) => {
    if (val && (!user || !user.university)) {
      setValidationMessage("You must belong to a university to create a University Group.");
      setValidationOpen(true);
      return;
    }
    setIsUniversityGroup(val);
    if (val) {
      setUniInfoOpen(true);
      // Mutual Exclusivity: Clear boundary if university group is enabled
      setBoundary([]);
      setSnapshotBase64(null);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      setValidationMessage("Please give your circle a name before saving.");
      setValidationOpen(true);
      return;
    }
    if (selectedFriends.length < 2) {
      setValidationMessage("A circle must have at least 3 members. Please invite at least 2 friends.");
      setValidationOpen(true);
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      const type = isUniversityGroup ? 'university' : 'private';
      const locationLabel = isUniversityGroup ? selectedLocation : null;
      const result = await circleService.createCircle(
        groupName.trim(),
        '',
        type,
        null,
        false,
        selectedFriends,
        !isUniversityGroup ? boundary : null,
        !isUniversityGroup ? snapshotBase64 : null
      );
      // If a location was chosen, update it
      if (locationLabel && result.circle?.id) {
        await circleService.updateLocationLabel(result.circle.id, locationLabel);
      }
      // Close any open sheets before navigating to prevent native "child already has a parent" crash
      setUniInfoOpen(false);
      setBoundaryInfoOpen(false);
      setBoundaryEditorOpen(false);
      setValidationOpen(false);

      // Small delay to let modals finish dismissing before navigation
      setTimeout(() => router.replace('/groups'), 100);
    } catch (err) {
      console.error('Failed to create circle:', err);
      setValidationMessage(err.message || "Failed to create circle");
      setValidationOpen(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" jc="space-between">
          <Heading fontSize={22}>Create Circle</Heading>
          <TouchableOpacity onPress={() => router.back()}>
            <X color="$onSurface" size={28} />
          </TouchableOpacity>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* Name Input */}
          <YStack px={24} mt={24} mb={24}>
            <BodyText color="$onSurfaceVariant" fontSize={13} mb={8} fontWeight="700" letterSpacing={1} textTransform="uppercase">
              Details
            </BodyText>
            <XStack bg="$surfaceContainerLow" borderRadius={24} px={20} py={16} ai="center"
              borderWidth={1} borderColor="$outlineVariant">
              <Users color="$onSurfaceVariant" size={24} mr={16} />
              <Input
                unstyled
                placeholder="Enter Circle Name"
                placeholderTextColor="$onSurfaceVariant"
                value={groupName}
                onChangeText={setGroupName}
                color={theme.onSurface.get()}
                fontSize={18}
                fontWeight="600"
                f={1}
              />
            </XStack>
          </YStack>

          {/* Invite Friends - MOVED UP */}
          <YStack px={24} mb={24}>
            <XStack ai="center" jc="space-between" mb={8}>
              <BodyText color="$onSurfaceVariant" fontSize={13} fontWeight="700" letterSpacing={1} textTransform="uppercase">
                Invite Friends {selectedFriends.length > 0 && `(${selectedFriends.length})`}
              </BodyText>
              {selectedFriends.length < 2 && (
                <BodyText color={theme.error.get()} fontSize={11} fontWeight="600">Min 2 Required</BodyText>
              )}
            </XStack>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.id);
                return (
                  <TouchableOpacity 
                    key={friend.id} 
                    activeOpacity={0.8} 
                    onPress={() => toggleFriend(friend.id)}
                  >
                    <YStack ai="center" gap={8}>
                      <YStack 
                        w={64} h={64} borderRadius={32} ai="center" jc="center"
                        bg={isSelected ? "$primaryContainer" : "$surfaceContainerLow"}
                        borderWidth={2}
                        borderColor={isSelected ? "$primary" : "$outlineVariant"}
                        overflow="hidden"
                      >
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Users color={isSelected ? "$onPrimary" : "$onSurfaceVariant"} size={32} />
                        )}
                        {isSelected && (
                          <YStack 
                            pos="absolute" bottom={0} right={0} 
                            bg="$primary" borderRadius={100} p={4}
                            borderWidth={2} borderColor="$surface"
                          >
                            <Check color="$onPrimary" size={10} />
                          </YStack>
                        )}
                      </YStack>
                      <BodyText 
                        fontSize={11} 
                        fontWeight={isSelected ? "700" : "500"}
                        color={isSelected ? "$onSurface" : "$onSurfaceVariant"}
                        textAlign="center"
                        numberOfLines={1}
                        w={64}
                      >
                        {friend.name?.split(' ')[0]}
                      </BodyText>
                    </YStack>
                  </TouchableOpacity>
                );
              })}
              {friends.length === 0 && (
                <YStack py={20} ai="center" jc="center" w={300}>
                  <BodyText color="$onSurfaceVariant" fontSize={14} fontStyle="italic">
                    No friends found to invite.
                  </BodyText>
                </YStack>
              )}
            </ScrollView>
          </YStack>

          {/* Geography Selection Section - Disabled if name or friends not provided */}
          {(() => {
            const hasName = groupName.trim().length > 0;
            const hasMinFriends = selectedFriends.length >= 2;
            const canSelectArea = hasName && hasMinFriends;

            return (
              <YStack o={canSelectArea ? 1 : 0.5}>
                <YStack px={24} mb={24}>
                  <BodyText color="$onSurfaceVariant" fontSize={13} mb={8} fontWeight="700" letterSpacing={1} textTransform="uppercase">
                    Circle Geography
                  </BodyText>
                  
                  {!canSelectArea && (
                    <XStack p={12} bg="$surfaceContainerHigh" borderRadius={12} mb={16} ai="center" gap={12} borderWidth={1} borderColor="$outlineVariant">
                      <Info size={20} color="$onSurfaceVariant" />
                      <BodyText color="$onSurface" fontSize={13} f={1} lineHeight={18}>
                        {!hasName ? "Enter a circle name" : ""}
                        {!hasName && !hasMinFriends ? " and " : ""}
                        {!hasMinFriends ? "invite at least 2 friends" : ""}
                        {" to unlock geography options."}
                      </BodyText>
                    </XStack>
                  )}

                  <YStack bg="$surfaceContainerLow" borderRadius={24} px={20} py={20} borderWidth={1} borderColor={isUniversityGroup ? "$primary" : "$outlineVariant"}>
                    <XStack ai="center" jc="space-between">
                      <YStack f={1} pr={16}>
                        <BodyText fontWeight="700" fontSize={18} mb={4}>University Group</BodyText>
                        <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={20}>
                          Members are visible when inside the campus boundary.
                        </BodyText>
                      </YStack>
                      <Switch
                        disabled={!canSelectArea}
                        trackColor={{ false: theme.surfaceContainerHighest.get(), true: theme.primary.get() }}
                        thumbColor={isUniversityGroup ? theme.onPrimary.get() : theme.onSurfaceVariant.get()}
                        onValueChange={handleToggleUniversityGroup}
                        value={isUniversityGroup}
                      />
                    </XStack>
                  </YStack>
                </YStack>

                {/* Boundary Picker (Only for Private Circles) */}
                {!isUniversityGroup && (
                  <YStack px={24} mb={24}>
                    <BodyText color="$onSurfaceVariant" fontSize={13} mb={8} fontWeight="700" letterSpacing={1} textTransform="uppercase">
                      Map Privacy
                    </BodyText>
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={() => canSelectArea && setBoundaryEditorOpen(true)}
                      disabled={!canSelectArea}
                    >
                      <XStack bg="$surfaceContainerLow" borderRadius={24} px={20} py={20} ai="center"
                        jc="space-between" borderWidth={1} borderColor={boundary.length > 0 ? "$primary" : "$outlineVariant"}>
                        <YStack f={1} pr={16}>
                          <BodyText fontWeight="700" fontSize={18} mb={4}>
                            Custom Boundary {boundary.length > 0 && "✓"}
                          </BodyText>
                          <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={20}>
                            {boundary.length > 0 
                              ? `${boundary.length} points defined. Tap to edit.` 
                              : "Draw a polygon to limit visibility to this circle."}
                          </BodyText>
                        </YStack>
                        <BodyText color="$primary" fontWeight="700">
                          {boundary.length > 0 ? "Edit" : "Draw"}
                        </BodyText>
                      </XStack>
                    </TouchableOpacity>
                  </YStack>
                )}
              </YStack>
            );
          })()}
        </ScrollView>

        {/* Toolbar */}
        <XStack px={24} pb={16} ai="center" jc="space-between" mb={Platform.OS === 'ios' ? 20 : 0}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
            <XStack bg="$surfaceContainerHighest" px={20} py={12} borderRadius={999} ai="center" gap={8}
              borderWidth={1} borderColor="$outlineVariant">
              <CornerUpLeft color="$onSurface" size={20} />
              <BodyText fontWeight="700">Cancel</BodyText>
            </XStack>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={isCreating}>
            <XStack bg="$primaryContainer" px={24} py={12} borderRadius={999} ai="center" gap={8}
              opacity={isCreating ? 0.6 : 1}>
              <CheckCircle color="$onPrimary" size={20} />
              <BodyText fontWeight="800" color="$onPrimary">{isCreating ? 'Creating...' : 'Save Circle'}</BodyText>
            </XStack>
          </TouchableOpacity>
        </XStack>
      </SanctuaryPage>

      {/* University Info Sheet */}
      <BottomSheetModal visible={uniInfoOpen} onClose={() => setUniInfoOpen(false)} title="University Group">
        <BodyText color="$onSurfaceVariant" fontSize={15} lineHeight={24}>
          University groups appear as a tag in the Campus tab. Membership visibility is determined by predetermined campus zones — no polygon drawing needed.
        </BodyText>
        <TouchableOpacity onPress={() => setUniInfoOpen(false)} activeOpacity={0.8} style={{ marginTop: 24 }}>
          <YStack bg="$primary" borderRadius={999} py={14} ai="center">
            <BodyText fontWeight="800" color="$onPrimary">Got it</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Boundary Info Sheet */}
      <BottomSheetModal visible={boundaryInfoOpen} onClose={() => setBoundaryInfoOpen(false)} title="Custom Boundary">
        <BodyText color="$onSurfaceVariant" fontSize={15} lineHeight={24}>
          Custom map boundaries let you define any polygon area. Members' location is checked locally on their device — only a binary Inside/Outside status is ever sent to servers.{'\n\n'}Map drawing is coming in a future update.
        </BodyText>
        <TouchableOpacity onPress={() => setBoundaryInfoOpen(false)} activeOpacity={0.8} style={{ marginTop: 24 }}>
          <YStack bg="$primary" borderRadius={999} py={14} ai="center">
            <BodyText fontWeight="800" color="$onPrimary">Understood</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Validation error */}
      <ConfirmModal
        visible={validationOpen}
        onClose={() => setValidationOpen(false)}
        onConfirm={() => setValidationOpen(false)}
        title="Action Required"
        message={validationMessage}
        confirmLabel="OK"
        confirmVariant="blue"
      />

      {/* Boundary Editor */}
      <BoundaryEditorSheet
        visible={boundaryEditorOpen}
        onClose={() => setBoundaryEditorOpen(false)}
        circleId={null} // Important: null for creation flow
        entityName={groupName || "New Circle"}
        initialBoundary={boundary}
        onBoundarySelected={(points, base64) => {
          setBoundary(points);
          setSnapshotBase64(base64);
        }}
      />
    </SafeAreaView>
  );
}
