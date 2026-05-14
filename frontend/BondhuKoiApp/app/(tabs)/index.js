import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { YStack, XStack } from "tamagui";
import { SanctuaryPage, Heading, BodyText } from "../../components/SanctuaryComponents";
import { Shield, MapPin, Users, Plus } from "@tamagui/lucide-icons-2";
import { Image } from 'react-native';

// Components
import { FilterPill } from "../../components/ui/FilterPill";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { FriendRow } from "../../components/cards/FriendRow";
import { TabScreenWrapper } from "../../src/components/animations/TabScreenWrapper";


// Sheets
import { AddFriendSheet } from "../../components/sheets/AddFriendSheet";
import { SocialsSheet } from "../../components/sheets/SocialsSheet";
import { WatchSheet } from "../../components/sheets/WatchSheet";
import { PauseSharingSheet } from "../../components/sheets/PauseSharingSheet";

// UI Components
import { SharingStatusPill } from "../../components/ui/SharingStatusPill";
import { SanctuaryAvatar } from "../../components/ui/SanctuaryAvatar";
import { View as MotiView } from "moti";

// API
import { friendService, circleService, locationService } from "../../src/services/api";
import { useAuth } from "../../src/hooks/useAuth";
import { useLocationStatus } from "../../src/context/LocationStatusContext";
import * as Location from 'expo-location';
import { registerGeofences } from '../../src/tasks/geofenceTask';
import { requestIgnoreBatteryOptimizations } from '../../src/utils/permissionUtils';
import { Platform } from 'react-native';

/**
 * Convert university names to shortforms
 */
const getUniversityShortform = (university) => {
  const shortforms = {
    'North South University': 'NSU',
    'BRAC University': 'BRAC',
    'Independent University Bangladesh': 'IUB',
    'American Int. University-Bangladesh': 'AIUB',
    'University of Dhaka': 'DU',
  };
  return shortforms[university] || university;
};

export default function CampusPulseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshStatus, isStale, checkLocation, permissionStatus, requestLocationPermissions } = useLocationStatus();
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sheet states
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [socialsFriend, setSocialsFriend] = useState(null);
  const [watchFriend, setWatchFriend] = useState(null);
  const [pauseSheetOpen, setPauseSheetOpen] = useState(false);
  const [circleCount, setCircleCount] = useState(0);
  const [universityCircles, setUniversityCircles] = useState([]);
  const [universityInfo, setUniversityInfo] = useState(null);


  // Load friends function
  const loadFriends = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load all friends and watched friends in parallel
      const [friendsResponse, watchedResponse] = await Promise.all([
        friendService.getFriendsList(50, 0),
        friendService.getWatchedFriends()
      ]);

      const friendsData = friendsResponse.friends || [];
      const watchedData = watchedResponse.watches || [];
      
      // Create a map of watched friend IDs to watch info
      const watchedMap = {};
      watchedData.forEach(watch => {
        watchedMap[watch.id] = {
          watchId: watch.watchId,
          watchScope: watch.watchScope,
        };
      });
      
      // Enrich friends with watch information
      const enrichedFriends = (Array.isArray(friendsData) ? friendsData : []).map(friend => ({
        ...friend,
        isWatched: !!watchedMap[friend.id],
        watchId: watchedMap[friend.id]?.watchId,
        watchScope: watchedMap[friend.id]?.watchScope,
        color: friend.color || '#8B5CF6',
        context: friend.university || 'Unknown',
        isInside: false, // Would need location data
        groups: friend.groups || [],
        socials: friend.socials || {},
      }));
      
      setFriends(enrichedFriends);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError(err.message);
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCampusData = useCallback(async () => {
    try {
      const { circles } = await circleService.getUniversityCircles();
      setUniversityCircles(circles || []);
      
      const boundaries = await locationService.getBoundaries();
      if (boundaries.universityBoundary) {
        setUniversityInfo(boundaries.universityBoundary);
      }
    } catch (err) {
      console.error('Failed to load campus data:', err);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    // Initial load of friends and circles in parallel
    Promise.all([
      loadFriends(),
      loadCampusData(),
      circleService.getCircles().then(d => setCircleCount((d.circles || []).length)).catch(() => {})
    ]);

    // 🔥 5-minute foreground location ping with stale-check + isMounted guard
    let isMounted = true;
    
    const locationInterval = setInterval(async () => {
      if (!isMounted) return;
      if (__DEV__) console.log('[LocationPing] Interval tick');
      if (isStale()) {
        if (__DEV__) console.log('[LocationPing] Data stale → attempting ping');
        await checkLocation();
      } else {
        if (__DEV__) console.log('[LocationPing] Data fresh → skipping');
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(locationInterval);
    };
  }, [isStale, checkLocation]);

  // 🔥 Step 2: Refresh when screen comes into focus (handles stale-check internally)
  useFocusEffect(
    useCallback(() => {
      // Don't run if user is logged out (prevents API errors during logout)
      if (!user) {
        if (__DEV__) console.log('[LocationPing] User logged out - skipping data refresh');
        return;
      }
      if (__DEV__) console.log('[LocationPing] Screen focused - refreshing status');
      loadFriends();
      loadCampusData();
      refreshStatus(); // Already checks if stale and pings location if needed
    }, [user, loadFriends, refreshStatus])
  );

  const watchedCount = friends.filter((f) => f.isWatched).length;

  const handleToggleWatch = (friend) => setWatchFriend(friend);

  const handleWatchConfirm = (scope) => {
    setFriends((prev) => prev.map((f) =>
      f.id === watchFriend?.id
        ? { ...f, isWatched: true, watchPending: true, watchScope: scope }
        : f
    ));
  };

  const handleUnwatch = () => {
    setFriends((prev) => prev.map((f) =>
      f.id === watchFriend?.id
        ? { ...f, isWatched: false, watchPending: false }
        : f
    ));
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: "transparent" }}>
      <TabScreenWrapper index={0}>
        <SanctuaryPage>


        {/* Top Header */}
        <XStack px={24} py={20} jc="space-between" ai="center">
          <XStack ai="center" gap={10}>
            <Shield color="#47A1FF" size={24} fill="#47A1FF" />
            <BodyText fontWeight="800" fontSize={18}>Bondhu Koi?</BodyText>
          </XStack>
          <XStack ai="center" gap={12}>
            {/* Sharing status pill */}
            <SharingStatusPill onPress={() => setPauseSheetOpen(true)} size={13} />
            {/* Avatar */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/settings')}>
              <YStack>
                <SanctuaryAvatar
                  url={user?.avatarUrl}
                  name={user?.name}
                  id={user?.id}
                  size={40}
                  borderWidth={0}
                />
                <YStack
                  position="absolute" bottom={0} right={0}
                  w={12} h={12} borderRadius="$full"
                  bg={user?.isSharingEnabled === false ? "#8A919D" : "#2AE500"}
                  borderWidth={2} borderColor="$surface"
                />
              </YStack>
            </TouchableOpacity>
          </XStack>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 800 }}
          >
            <YStack mt={24} mb={32}>
              <XStack ai="center" gap={12} mb={10}>
                <Heading fontSize={40} lineHeight={46}>Campus Pulse</Heading>
                <MotiView
                  from={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                >
                  <YStack w={12} h={12} borderRadius="$full" bg="#2AE500" style={{ shadowColor: '#2AE500', shadowOpacity: 0.5, shadowRadius: 10 }} />
                </MotiView>
              </XStack>
              <BodyText color="$onSurfaceVariant" fontSize={16} lineHeight={24} pr={32}>
                Real-time presence of your trusted circles at <BodyText color="#47A1FF" fontWeight="800">{user?.university || 'your campus'}</BodyText>.
              </BodyText>
            </YStack>
          </MotiView>

          {/* Quick Stats */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
          >
            <XStack gap={16} mb={36}>
              <YStack f={1} bg="$surfaceContainerLow" borderRadius={28} p={24} borderWidth={1} borderColor="$outlineVariant">
                <Heading fontSize={28} mb={4}>{friends.length}</Heading>
                <BodyText fontSize={13} color="$onSurfaceVariant" fontWeight="700">Friends</BodyText>
              </YStack>
              <YStack f={1} bg="$surfaceContainerLow" borderRadius={28} p={24} borderWidth={1} borderColor="$outlineVariant">
                <Heading fontSize={28} mb={4}>{circleCount}</Heading>
                <BodyText fontSize={13} color="$onSurfaceVariant" fontWeight="700">Active Circles</BodyText>
              </YStack>
            </XStack>
          </MotiView>

          {/* Map Zone Card */}
          <SectionHeader title="Your Location" mb={20} />
          <TouchableOpacity activeOpacity={0.9} style={{ marginBottom: 44 }} onPress={() => router.push('/map')}>
            <YStack bg="$surfaceContainerLow" borderRadius={32} p={0} borderWidth={1} borderColor="$outlineVariant" overflow="hidden">
              {universityInfo?.snapshot_url && (
                <Image 
                  source={{ uri: universityInfo.snapshot_url }} 
                  style={{ width: '100%', height: 160, opacity: 0.6 }} 
                  resizeMode="cover"
                />
              )}
              <YStack p={28}>
                <XStack ai="center" gap={16} mb={20}>
                  <YStack w={48} h={48} borderRadius={14} bg="rgba(71, 161, 255, 0.12)" ai="center" jc="center">
                    <MapPin color="#47A1FF" size={24} />
                  </YStack>
                  <YStack ml={16}>
                    <BodyText fontWeight="800" fontSize={18}>{user?.university || 'Your Campus'}</BodyText>
                    <XStack ai="center" space={0} mt={2}>
                      <YStack w={8} h={8} borderRadius="$full" bg={user?.is_inside ? '#2AE500' : '#8A919D'} />
                      <BodyText fontSize={13} color="$onSurfaceVariant" fontWeight="700" ml={6}>
                        {user?.is_inside ? 'Currently Inside Campus' : 'Outside Campus'}
                      </BodyText>
                    </XStack>
                  </YStack>
                </XStack>
                <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={20}>
                  Tap to view your detailed heat map and circle overlays for today.
                </BodyText>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* University Circles Section */}
          {universityCircles.length > 0 && (
            <YStack mb={44}>
              <SectionHeader 
                title="University Circles" 
                mb={20} 
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 24 }}>
                {universityCircles.map((circle) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    activeOpacity={0.8}
                    onPress={() => router.push(`/group/${circle.id}`)}
                  >
                    <YStack 
                      w={180} 
                      bg="$surfaceContainerLow" 
                      p={20} 
                      borderRadius={24} 
                      borderWidth={1} 
                      borderColor="$outlineVariant"
                    >
                      <XStack ai="center" gap={12} mb={12}>
                        <YStack w={40} h={40} borderRadius={12} bg="$primaryContainer" ai="center" jc="center">
                          <Shield color="#47A1FF" size={20} />
                        </YStack>
                        <YStack f={1}>
                          <BodyText fontWeight="800" fontSize={14} numberOfLines={1}>{circle.name}</BodyText>
                          <BodyText fontSize={11} color="$onSurfaceVariant" fontWeight="700">Uni Group</BodyText>
                        </YStack>
                      </XStack>
                      <BodyText fontSize={12} color="$onSurfaceVariant" numberOfLines={2} lineHeight={16}>
                        {circle.description || `Official ${user?.university || 'campus'} circle.`}
                      </BodyText>
                    </YStack>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </YStack>
          )}

          {/* Filter Bar */}
          <SectionHeader
            title="Who's Inside?"
            actionLabel="View All"
            onAction={() => router.push('/friends')}
            mb={20}
          />
          
          {/* Friends Title */}
          <YStack ai="center" mb={28}>
            <Heading fontSize={20} color="$onSurface">Friends</Heading>
          </YStack>

          {isLoading ? (
            <YStack ai="center" jc="center" py={40}>
              <ActivityIndicator color="#47A1FF" />
            </YStack>
          ) : error ? (
            <YStack ai="center" jc="center" py={40}>
              <BodyText color="#FF453A" textAlign="center">{error}</BodyText>
            </YStack>
          ) : friends.length === 0 ? (
            <YStack ai="center" jc="center" py={40}>
              <BodyText color="$onSurfaceVariant">No friends yet. Add one to get started!</BodyText>
            </YStack>
          ) : (
            friends.map((friend) => (
              <FriendRow
                key={friend.id}
                friend={friend}
                onGetSocials={() => setSocialsFriend(friend)}
                onToggleWatch={() => handleToggleWatch(friend)}
              />
            ))
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity activeOpacity={0.8}
          style={{ position: 'absolute', bottom: 100, right: 24, zIndex: 100 }}
          onPress={() => setAddFriendOpen(true)}>
          <YStack w={64} h={64} borderRadius="$full" bg="#47A1FF" ai="center" jc="center"
            style={{ shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { height: 4, width: 0 } }}>
            <Plus color="#111317" size={30} />
          </YStack>
        </TouchableOpacity>

        {/* Sheets */}
        <AddFriendSheet visible={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
        <SocialsSheet visible={!!socialsFriend} onClose={() => setSocialsFriend(null)} friend={socialsFriend} />
        <WatchSheet
          visible={!!watchFriend}
          onClose={() => setWatchFriend(null)}
          friend={watchFriend}
          watchedCount={watchedCount}
          onConfirm={handleWatchConfirm}
          onUnwatch={handleUnwatch}
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
