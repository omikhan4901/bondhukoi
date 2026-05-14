import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Home, Settings, Users } from "@tamagui/lucide-icons-2";
import { Platform, TouchableOpacity } from "react-native";
import { MotiView } from "moti";
import { useTheme, YStack, XStack } from "tamagui";
import { useLocationStatus } from "../../src/context/LocationStatusContext";
import { PermissionModal } from "../../components/modals/PermissionModal";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BodyText } from "../../components/SanctuaryComponents";

/**
 * LocationPermissionGuard - Monitors perms and provides a warning banner/modal.
 */
function LocationPermissionGuard({ children }) {
  const { 
    permissionStatus, 
    requestLocationPermissions, 
    verifyLocationPermissions,
    refreshStatus 
  } = useLocationStatus();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Initial check on mount
    if (permissionStatus !== 'granted') {
      verifyLocationPermissions().catch(() => {});
    }

    // Periodic check every 30 seconds instead of on every tab switch
    const interval = setInterval(() => {
      console.log('[LocationGuard] 30s periodic check. Current Status:', permissionStatus);
      if (permissionStatus !== 'granted') {
        verifyLocationPermissions().catch(() => {});
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [permissionStatus, verifyLocationPermissions]);

  useEffect(() => {
    // Show modal if perms are missing (status will change via the interval or initial check)
    // Now only triggers for 'denied' because 'partial' is mapped to 'granted' in context.
    if (permissionStatus === 'denied') {
      setShowModal(true);
    } else if (permissionStatus === 'granted') {
      setShowModal(false);
    }
  }, [permissionStatus]);

  return (
    <YStack f={1}>
      {/* Persistent Warning Banner (only if denied) */}
      {permissionStatus === 'denied' && (
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => setShowModal(true)}
          style={{ 
            backgroundColor: '#FF453A', 
            paddingTop: Platform.OS === 'ios' ? 60 : 10,
            paddingBottom: 10,
            paddingHorizontal: 20,
            zIndex: 1000
          }}
        >
          <XStack ai="center" jc="space-between">
            <XStack ai="center" gap={10}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="white" />
              <BodyText color="white" fontSize={13} fontWeight="700">
                Location Disabled
              </BodyText>
            </XStack>
            <YStack bg="rgba(255,255,255,0.2)" px={12} py={4} borderRadius={999}>
              <BodyText color="white" fontSize={11} fontWeight="800">FIX</BodyText>
            </YStack>
          </XStack>
        </TouchableOpacity>
      )}

      {children}

      <PermissionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        isMandatory={false}
        onRetry={async () => {
          const success = await requestLocationPermissions();
          if (success) {
            refreshStatus();
          }
        }}
      />
    </YStack>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <LocationPermissionGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: Platform.OS === "ios" ? 90 : 76,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 24 : 12,
            backgroundColor: theme.surfaceContainerLow.get(),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: theme.outlineVariant.get(),
            elevation: 24,
            shadowColor: "#000",
            shadowOpacity: theme.mode === "dark" ? 0.5 : 0.1,
            shadowRadius: 15,
          },
          tabBarLabelStyle: {
            fontFamily: "Inter",
            fontSize: 11,
            fontWeight: "600",
            marginTop: 6,
          },
          tabBarActiveTintColor: theme.primaryContainer.get(),
          tabBarInactiveTintColor: theme.onSurfaceVariant.get(),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Campus",
            tabBarIcon: ({ color, focused }) => (
              <MotiView
                animate={{
                  scale: focused ? 1.15 : 1,
                }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
              >
                <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
              </MotiView>
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: "Circles",
            tabBarIcon: ({ color, focused }) => (
              <MotiView
                animate={{
                  scale: focused ? 1.15 : 1,
                }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
              >
                <Users color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
              </MotiView>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <MotiView
                animate={{
                  scale: focused ? 1.15 : 1,
                }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
              >
                <Settings color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
              </MotiView>
            ),
          }}
        />
      </Tabs>
    </LocationPermissionGuard>
  );
}
