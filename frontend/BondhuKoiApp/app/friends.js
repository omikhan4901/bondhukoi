import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { YStack, XStack } from "tamagui";
import { SanctuaryPage,  Heading,
  BodyText,
  SanctuaryLoader,
} from "../components/SanctuaryComponents";
import { ChevronLeft, Users, Bell, MessageCircle, MoreVertical, Trash2 } from "@tamagui/lucide-icons-2";

// API & hooks
import { friendService } from "../src/services/api";
import { useAuth } from "../src/hooks/useAuth";

// Components & Sheets
import { WatchSheet } from "../components/sheets/WatchSheet";
import { SocialsSheet } from "../components/sheets/SocialsSheet";
import { PendingFriendRequestsSheet } from "../components/sheets/PendingFriendRequestsSheet";
import { UnfriendSheet } from "../components/sheets/UnfriendSheet";

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

const nameToColor = (name = '') => {
  const colors = ['#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/**
 * FriendListScreen — Full-screen friends list with watch request capability
 * Shows all friends with individual cards for managing watch alerts and social links
 */
export default function FriendsListScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [watchFriend, setWatchFriend] = useState(null);
  const [socialsFriend, setSocialsFriend] = useState(null);
  const [selectedFriendForUnfriend, setSelectedFriendForUnfriend] = useState(null);
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  // Load friends list function
  const loadFriends = useCallback(async (isLoadMore = false) => {
    try {
      if (!token) return;

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setOffset(0);
      }
      
      setError(null);

      const currentOffset = isLoadMore ? offset : 0;
      
      // Parallelize friends list and watched friends
      const [response, watchedResponse] = await Promise.all([
        friendService.getFriendsList(50, currentOffset),
        friendService.getWatchedFriends()
      ]);

      const friendsData = response.friends || [];
      const watchedData = watchedResponse.watches || [];

      // Map watched friends for quick lookup
      const watchedMap = {};
      watchedData.forEach(watch => {
        watchedMap[watch.id] = {
          watchId: watch.watchId,
          watchScope: watch.watchScope,
        };
      });

      // Enrich friends with watch info
      const enrichedFriends = friendsData.map(friend => ({
        ...friend,
        isWatched: !!watchedMap[friend.id],
        watchId: watchedMap[friend.id]?.watchId,
        watchScope: watchedMap[friend.id]?.watchScope || 'campus',
        color: nameToColor(friend.name),
        university: friend.university || 'Unknown University',
        socials: {
          facebook: friend.facebook || null,
          instagram: friend.instagram || null,
        },
      }));

      if (isLoadMore) {
        setFriends(prev => [...prev, ...enrichedFriends]);
        setOffset(prev => prev + friendsData.length);
      } else {
        setFriends(enrichedFriends);
        setOffset(friendsData.length);
      }

      setHasMore(response.hasMore);
      setTotalCount(response.total || response.count || 0);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [token, offset]);

  // Load friends list on component mount
  useEffect(() => {
    loadFriends();
  }, [token]);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;

    if (isCloseToBottom && hasMore && !isLoadingMore && !isLoading) {
      loadFriends(true);
    }
  };

  const watchedCount = friends.filter(f => f.isWatched).length;

  const handleWatchConfirm = (scope) => {
    setFriends(prev => prev.map(f =>
      f.id === watchFriend?.id
        ? { ...f, isWatched: true, watchScope: scope }
        : f
    ));
  };

  const handleUnwatch = () => {
    setFriends(prev => prev.map(f =>
      f.id === watchFriend?.id
        ? { ...f, isWatched: false }
        : f
    ));
  };

  const handleUnfriended = () => {
    setFriends(prev => prev.filter(f => f.id !== selectedFriendForUnfriend?.id));
    setTotalCount(prev => prev - 1);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: "transparent" }}>
      <SanctuaryPage>
        {/* Header */}
        <XStack px={24} py={20} ai="center" jc="space-between">
          <XStack ai="center" gap={16}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft color="$onSurface" size={28} />
            </TouchableOpacity>
            <YStack>
              <Heading fontSize={24}>Friends</Heading>
              <BodyText fontSize={13} color="$onSurfaceVariant" mt={2}>
                {totalCount} friend{totalCount !== 1 ? 's' : ''}
              </BodyText>
            </YStack>
          </XStack>
          <TouchableOpacity onPress={() => setShowPendingRequests(true)} activeOpacity={0.7}>
            <YStack
              w={44}
              h={44}
              borderRadius="$full"
              bg="$surfaceContainerHigh"
              ai="center"
              jc="center"
              borderWidth={1}
              borderColor="$outlineVariant"
            >
              <Users color="$onSurface" size={22} />
            </YStack>
          </TouchableOpacity>
        </XStack>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {isLoading && friends.length === 0 ? (
            <SanctuaryLoader message="Connecting with friends" />
          ) : error && friends.length === 0 ? (
            <YStack ai="center" jc="center" py={60}>
              <BodyText color="#FF453A" textAlign="center">{error}</BodyText>
            </YStack>
          ) : friends.length === 0 ? (
            <YStack ai="center" jc="center" py={60}>
              <Users color="$onSurfaceVariant" size={48} opacity={0.4} />
              <BodyText color="$onSurfaceVariant" mt={16}>No friends yet</BodyText>
              <BodyText color="$onSurfaceVariant" fontSize={13} mt={8} textAlign="center">
                Add a friend from the Campus tab to get started
              </BodyText>
            </YStack>
          ) : (
            <>
              {/* Watched Status Summary */}
              {watchedCount > 0 && (
                <YStack mb={56} mt={24}>
                  <XStack ai="center" gap={12} mb={16}>
                    <Bell color="#FFD700" size={20} fill="#FFD700" />
                    <BodyText fontWeight="800" color="#FFD700" fontSize={15}>
                      {watchedCount} friend{watchedCount !== 1 ? 's' : ''} being watched
                    </BodyText>
                  </XStack>
                </YStack>
              )}

              {/* Friends Grid */}
              <YStack>
                {friends.map(friend => (
                  <YStack
                    key={friend.id}
                    bg="$surfaceContainerLow"
                    borderRadius={24}
                    p={20}
                    borderWidth={1}
                    borderColor={friend.isWatched ? 'rgba(255, 215, 0, 0.2)' : '$outlineVariant'}
                    mb={24}
                  >
                    {/* Header: Avatar + Name/Uni + Watched Status */}
                    <XStack ai="flex-start" jc="space-between" mb={20}>
                      {/* Avatar */}
                      <YStack
                        w={48} h={48}
                        borderRadius="$full"
                        bg={nameToColor(friend.name)}
                        ai="center" jc="center"
                        overflow="hidden"
                        borderWidth={1} borderColor="rgba(255,255,255,0.05)"
                        mr={12}
                      >
                        {friend.avatarUrl ? (
                          <Image source={{ uri: friend.avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        ) : (
                          <BodyText fontWeight="800" fontSize={19} color="#FFFFFF">
                            {friend.name?.[0]?.toUpperCase() || '?'}
                          </BodyText>
                        )}
                      </YStack>

                      {/* Name + University */}
                      <YStack f={1} pr={5}>
                        <BodyText fontWeight="800" fontSize={19}>
                          {friend.name}
                        </BodyText>
                        <BodyText fontSize={14} color="$onSurfaceVariant" mt={5} fontWeight="600">
                          {getUniversityShortform(friend.university)}
                        </BodyText>
                      </YStack>

                      {/* Menu + Watched Badge */}
                      <XStack ai="flex-start" gap={8}>
                        {friend.isWatched && (
                          <YStack
                            px={14}
                            py={10}
                            borderRadius={999}
                            bg="rgba(255, 215, 0, 0.1)"
                          >
                            <Bell color="#FFD700" size={18} fill="#FFD700" />
                          </YStack>
                        )}
                        <TouchableOpacity
                          onPress={() => setSelectedFriendForUnfriend(friend)}
                          activeOpacity={0.7}
                        >
                          <YStack
                            px={12}
                            py={10}
                            ai="center"
                            jc="center"
                          >
                            <MoreVertical color="$onSurfaceVariant" size={20} />
                          </YStack>
                        </TouchableOpacity>
                      </XStack>
                    </XStack>

                    {/* Action Buttons */}
                    <XStack gap={20}>
                      {/* Watch Alert Button */}
                      <TouchableOpacity
                        onPress={() => setWatchFriend(friend)}
                        style={{ flex: 1 }}
                        activeOpacity={0.7}
                      >
                        <YStack
                          bg={friend.isWatched ? 'rgba(255, 215, 0, 0.12)' : '#47A1FF'}
                          py={13}
                          px={20}
                          borderRadius={14}
                          ai="center"
                          jc="center"
                          borderWidth={friend.isWatched ? 1 : 0}
                          borderColor="rgba(255, 215, 0, 0.3)"
                        >
                          <XStack ai="center" gap={10}>
                            <Bell
                              color={friend.isWatched ? '#FFD700' : 'white'}
                              size={18}
                              fill={friend.isWatched ? '#FFD700' : 'white'}
                            />
                            <BodyText
                              fontWeight="700"
                              color={friend.isWatched ? '#FFD700' : 'white'}
                              fontSize={15}
                            >
                              {friend.isWatched ? 'Watching' : 'Watch'}
                            </BodyText>
                          </XStack>
                        </YStack>
                      </TouchableOpacity>

                      {/* Get Socials Button */}
                      <TouchableOpacity
                        onPress={() => setSocialsFriend(friend)}
                        style={{ flex: 1 }}
                        activeOpacity={0.7}
                      >
                        <YStack
                          bg="$surfaceContainerHigh"
                          py={13}
                          px={20}
                          borderRadius={14}
                          ai="center"
                          jc="center"
                        >
                          <XStack ai="center" gap={10}>
                            <MessageCircle color="$onSurface" size={18} />
                            <BodyText
                              fontWeight="700"
                              color="$onSurface"
                              fontSize={15}
                            >
                              Socials
                            </BodyText>
                          </XStack>
                        </YStack>
                      </TouchableOpacity>
                    </XStack>
                  </YStack>
                ))}
              </YStack>

              {isLoadingMore && (
                <YStack py={20}>
                  <ActivityIndicator color="#47A1FF" />
                </YStack>
              )}
            </>
          )}
        </ScrollView>

        {/* Sheets */}
        <WatchSheet
          visible={!!watchFriend}
          onClose={() => setWatchFriend(null)}
          friend={watchFriend}
          watchedCount={watchedCount}
          onConfirm={handleWatchConfirm}
          onUnwatch={handleUnwatch}
        />
        <SocialsSheet
          visible={!!socialsFriend}
          onClose={() => setSocialsFriend(null)}
          friend={socialsFriend}
        />
        <PendingFriendRequestsSheet
          visible={showPendingRequests}
          onClose={() => setShowPendingRequests(false)}
          onRequestsUpdated={() => loadFriends(false)}
        />
        <UnfriendSheet
          visible={!!selectedFriendForUnfriend}
          onClose={() => setSelectedFriendForUnfriend(null)}
          friend={selectedFriendForUnfriend}
          onUnfriended={handleUnfriended}
        />
      </SanctuaryPage>
    </SafeAreaView>
  );
}
