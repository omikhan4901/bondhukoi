import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { YStack, XStack } from "tamagui";
import {
  SanctuaryPage,
  Heading,
  BodyText,
  SanctuaryLoader,
} from "../components/SanctuaryComponents";
import { ChevronLeft, Bell, Trash2 } from "@tamagui/lucide-icons-2";

// Components
import NotificationRenderer from "../components/NotificationRenderer.js";
import { WatchAlertItem } from "../components/cards/WatchAlertItem.js";
import { SuccessModal } from "../components/modals/SuccessModal.js";

// API & hooks
import { useAuth } from "../src/hooks/useAuth.js";
import { friendService, notificationService, circleService } from "../src/services/api.js";

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Load notifications from backend
  const loadNotifications = useCallback(
    async (isLoadMore = false) => {
      try {
        if (!token) return;

        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        const data = await notificationService.getNotifications(
          20,
          isLoadMore ? lastTimestamp : null,
        );

        if (isLoadMore) {
          setNotifications((prev) => [...prev, ...(data.notifications || [])]);
        } else {
          setNotifications(data.notifications || []);
        }

        setLastTimestamp(data.lastTimestamp);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Failed to load notifications:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [token, lastTimestamp],
  );

  useEffect(() => {
    loadNotifications();
  }, [token]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(false);
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;

    if (isCloseToBottom && hasMore && !isLoadingMore && !isLoading) {
      loadNotifications(true);
    }
  };

  // Handle notification actions
  const handleNotificationAction = async (
    type,
    action,
    relatedId,
    relatedUserId,
    relatedCircleId,
  ) => {
    try {
      if (action === "dismiss") {
        // Remove notification from list
        setNotifications(
          notifications.filter(
            (n) => n.id !== relatedId && n.relatedId !== relatedId,
          ),
        );
        return;
      }

      if (action === "accept_friend") {
        await friendService.acceptRequest(relatedId);
        setNotifications(
          notifications.filter((n) => n.relatedId !== relatedId),
        );
        setSuccessModal({
          visible: true,
          title: "Request Accepted",
          message: "Friend request accepted",
        });
      }

      if (action === "accept_watch") {
        await friendService.acceptWatchRequest(relatedId);
        setNotifications(
          notifications.filter((n) => n.relatedId !== relatedId),
        );
        setSuccessModal({
          visible: true,
          title: "Watch Request Accepted",
          message:
            "They can now see your location status when you enter or leave zones.",
        });
      }

      if (action === "accept_circle_invite") {
        await circleService.acceptInvitation(relatedCircleId);
        setNotifications(
          notifications.filter((n) => n.relatedCircleId !== relatedCircleId),
        );
        setSuccessModal({
          visible: true,
          title: "Invite Accepted",
          message: "Circle invite accepted",
        });
      }
    } catch (err) {
      console.error("Action failed:", err);
      setSuccessModal({ visible: true, title: "Error", message: err.message });
    }
  };

  // Separate notifications
  const priorityAlerts = notifications.filter((n) => n.type === "watch_alert");
  const generalNotifications = notifications.filter(
    (n) => n.type !== "watch_alert",
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "transparent" }}
    >
      <SanctuaryPage>
        {/* Header */}
        <XStack px={24} py={20} ai="center" jc="space-between">
          <XStack ai="center" gap={16}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft color="$onSurface" size={28} />
            </TouchableOpacity>
            <Heading fontSize={24}>Notifications</Heading>
          </XStack>
          <TouchableOpacity
            onPress={() => {
              Alert.alert("Clear Notifications", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete All",
                  style: "destructive",
                  onPress: () => {
                    setNotifications([]);
                    setLastTimestamp(null);
                    setHasMore(false);
                  },
                },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Trash2 color="$onSurfaceVariant" size={22} />
          </TouchableOpacity>
        </XStack>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {isLoading ? (
            <SanctuaryLoader message="Fetching notifications" />
          ) : error ? (
            <YStack ai="center" jc="center" py={40}>
              <BodyText color="#FF453A" textAlign="center">
                {error}
              </BodyText>
            </YStack>
          ) : notifications.length === 0 ? (
            <YStack ai="center" jc="center" py={40}>
              <Bell color="$onSurfaceVariant" size={40} opacity={0.5} />
              <BodyText color="$onSurfaceVariant" mt={16}>
                No notifications yet
              </BodyText>
            </YStack>
          ) : (
            <>
              {/* Priority Alerts Section */}
              {priorityAlerts.length > 0 && (
                <YStack mt={24} mb={40}>
                  <XStack ai="center" gap={10} mb={20}>
                    <Bell color="#FFD700" size={18} fill="#FFD700" />
                    <BodyText
                      fontWeight="800"
                      color="#FFD700"
                      textTransform="uppercase"
                      letterSpacing={1.5}
                      fontSize={13}
                    >
                      Priority Alerts
                    </BodyText>
                  </XStack>

                  {priorityAlerts.map((notification) => (
                    <NotificationRenderer
                      key={notification.id}
                      notification={notification}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </YStack>
              )}

              {/* General Notifications */}
              {generalNotifications.length > 0 && (
                <YStack mb={20}>
                  <BodyText
                    fontWeight="800"
                    color="$onSurfaceVariant"
                    textTransform="uppercase"
                    letterSpacing={1.5}
                    fontSize={13}
                    mb={20}
                  >
                    General
                  </BodyText>
                  {generalNotifications.map((notification) => (
                    <NotificationRenderer
                      key={notification.id}
                      notification={notification}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </YStack>
              )}

              {isLoadingMore && (
                <YStack py={20}>
                  <ActivityIndicator color="#47A1FF" />
                </YStack>
              )}
            </>
          )}
        </ScrollView>
      </SanctuaryPage>

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        onDismiss={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </SafeAreaView>
  );
}
