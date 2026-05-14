import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, TouchableOpacity, Alert, Image, TextInput as RNTextInput } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { YStack, XStack } from "tamagui";
import { SanctuaryPage, Heading, BodyText } from "../../components/SanctuaryComponents";
import {
  Settings as SettingsIcon, Bell, LogOut, Trash2,
  GraduationCap, Map,
  Eye, EyeOff, Lock, History, BellOff, ExternalLink
} from "@tamagui/lucide-icons-2";

// Reusable components
import { SettingsRow }          from "../../components/cards/SettingsRow";
import { PrivacyToggleRow }     from "../../components/ui/PrivacyToggleRow";
import { PlaceToggleRow }       from "../../components/ui/PlaceToggleRow";
import { SocialGatewayGrid }    from "../../components/cards/SocialGatewayGrid";
import { VerifiedUniversityCard } from "../../components/ui/VerifiedUniversityCard";
import { SharingStatusPill }    from "../../components/ui/SharingStatusPill";

// Modals & Sheets
import { BottomSheetModal }    from "../../components/modals/BottomSheetModal";
import { ConfirmModal }        from "../../components/modals/ConfirmModal";
import { PauseSharingSheet }   from "../../components/sheets/PauseSharingSheet";
import { EditSocialSheet }     from "../../components/sheets/EditSocialSheet";
import { ManagePlacesSheet }   from "../../components/sheets/ManagePlacesSheet";
import { AvatarUploadSheet }   from "../../components/sheets/AvatarUploadSheet";
import { TabScreenWrapper }    from "../../src/components/animations/TabScreenWrapper";

// API & Hooks
import { useAuth } from "../../src/hooks/useAuth";
import { circleService, friendService, userService } from "../../src/services/api";

// ─── Local section-heading component ─────────────────────────
const SectionTitle = ({ title, description }) => (
  <YStack mb={16} mt={8}>
    <Heading fontSize={20}>{title}</Heading>
    {description && (
      <BodyText fontSize={13} color="$onSurfaceVariant" mt={6} lineHeight={18}>
        {description}
      </BodyText>
    )}
  </YStack>
);

// ─── Main screen ─────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updatePreferences, updateProfile, refreshUser } = useAuth();
  
  const isPaused = user?.isSharingEnabled === false;

  const [pauseSheetOpen, setPauseSheetOpen] = useState(false);

  // Data
  const [places, setPlaces]       = useState([]);
  const [placesSheetOpen, setPlacesSheetOpen] = useState(false);
  const [circles, setCircles]     = useState([]);
  const [watched, setWatched]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Privacy toggles — sync from user object
  const [autoDelete,  setAutoDelete]  = useState(true);
  const [allowEveningPings, setAllowEveningPings] = useState(false);
  const [trackUniversity, setTrackUniversity] = useState(true);

  // Circle toggles (synced from API)
  const [disabledCircles, setDisabledCircles] = useState({});

  // Socials — initialized from user object
  const [socials, setSocials] = useState({});
  const [editSocialKey, setEditSocialKey] = useState(null);

  // Sheets / modals
  const [accountOpen,    setAccountOpen]    = useState(false);
  const [securityOpen,   setSecurityOpen]   = useState(false);
  const [handbookOpen,   setHandbookOpen]   = useState(false);
  const [switchNetOpen,  setSwitchNetOpen]  = useState(false);
  const [logoutConfirm,  setLogoutConfirm]  = useState(false);
  const [logoutType,     setLogoutType]     = useState(null); // 'basic' or 'all-devices'
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Sync local state from user object whenever it changes
  useEffect(() => {
    if (user) {
      setAutoDelete(user.autoDeleteHistory ?? true);
      setAllowEveningPings(user.allowEveningPings ?? false);
      setTrackUniversity(user.trackUniversity ?? true);
      setSocials({
        facebook: user.facebook || undefined,
        instagram: user.instagram || undefined,
      });
    }
    // NOTE: Logout navigation is handled by RootAuthGuard in _layout.js
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const [circlesData, watchedData] = await Promise.all([
          circleService.getCircles(),
          friendService.getWatchedFriends(),
        ]);
        
        const fetchedCircles = circlesData.circles || [];
        setCircles(fetchedCircles);
        
        // Extract privacy flags from circles
        const disabled = {};
        fetchedCircles.forEach(c => {
          disabled[c.id] = !c.detectionEnabled;
        });
        setDisabledCircles(disabled);

        setWatched(watchedData.watchedFriends || watchedData.watches || []);
        setPlaces([]);
      } catch (err) {
        if (__DEV__) console.error('Failed to load settings data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const togglePlace = async (id) => {
    // This handles "detectionEnabled" for a circle
    const isNowDisabled = !disabledCircles[id];
    setDisabledCircles(prev => ({ ...prev, [id]: isNowDisabled }));
    try {
      await circleService.updateMemberPrivacy(id, { detectionEnabled: !isNowDisabled });
    } catch (err) {
      setDisabledCircles(prev => ({ ...prev, [id]: !isNowDisabled })); // revert
      Alert.alert('Error', err.message || 'Failed to update detection setting');
    }
  };

  const removeWatch = async (w) => {
    try {
      await friendService.removeWatch(w.watchId);
      setWatched(prev => prev.filter(x => x.watchId !== w.watchId));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to remove watch');
    }
  };

  const copyFriendCode = async () => {
    if (user?.friend_code) {
      try {
        await Clipboard.setStringAsync(user.friend_code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy friend code:', err);
      }
    }
  };

  // Toggle auto-delete — call API, optimistic update
  const handleAutoDeleteToggle = async (val) => {
    setAutoDelete(val);
    try {
      await updatePreferences(val, allowEveningPings, trackUniversity);
    } catch (err) {
      setAutoDelete(!val); // revert
      Alert.alert('Error', err.message || 'Failed to update auto-delete setting');
    }
  };

  // Toggle evening pings — allow location tracking after 6pm
  const handleEveningPingsToggle = async (val) => {
    setAllowEveningPings(val);
    try {
      await updatePreferences(autoDelete, val, trackUniversity);
    } catch (err) {
      setAllowEveningPings(!val); // revert
      Alert.alert('Error', err.message || 'Failed to update evening pings setting');
    }
  };

  // Toggle university tracking
  const handleTrackUniversityToggle = async (val) => {
    setTrackUniversity(val);
    try {
      await updatePreferences(autoDelete, allowEveningPings, val);
    } catch (err) {
      setTrackUniversity(!val); // revert
      Alert.alert('Error', err.message || 'Failed to update university tracking setting');
    }
  };

  // Save social handle to API
  const handleSaveSocial = async (key, value) => {
    const newSocials = { ...socials, [key]: value || undefined };
    setSocials(newSocials); // optimistic
    try {
      await updateProfile(
        user?.name || null,
        newSocials.facebook || null,
        newSocials.instagram || null
      );
    } catch (err) {
      setSocials(socials); // revert
      Alert.alert('Error', err.message || 'Failed to save social handle');
    }
  };

  // Remove social handle from API
  const handleRemoveSocial = async (key) => {
    const newSocials = { ...socials };
    delete newSocials[key];
    setSocials(newSocials); // optimistic
    try {
      await updateProfile(
        user?.name || null,
        newSocials.facebook || null,
        newSocials.instagram || null
      );
    } catch (err) {
      setSocials(socials); // revert
      Alert.alert('Error', err.message || 'Failed to remove social handle');
    }
  };

  const handleBasicLogout = async () => { 
    try {
      setLogoutConfirm(false);
      setLogoutType(null);
      await logout();
      // RootAuthGuard in _layout.js handles navigation to login screen
    } catch (err) {
      if (__DEV__) console.error('[Settings] Logout error:', err);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  const handleLogoutAllDevices = async () => { 
    try {
      setLogoutConfirm(false);
      setLogoutType(null);
      await logout();
      // RootAuthGuard in _layout.js handles navigation to login screen
    } catch (err) {
      if (__DEV__) console.error('[Settings] Logout error:', err);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  // Delete account via API
  const handleDeleteAccount = async () => {
    try {
      await userService.deleteAccount();
      setDeleteConfirm(false);
      await logout();
      // RootAuthGuard in _layout.js handles navigation to login screen
    } catch (err) {
      setDeleteConfirm(false);
      Alert.alert('Error', err.message || 'Failed to delete account. Please try again.');
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsSavingName(true);
    try {
      await updateProfile(editName.trim(), socials.facebook || null, socials.instagram || null);
      setAccountOpen(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save name.');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "transparent" }}>
      <TabScreenWrapper index={2}>
        <SanctuaryPage>

        {/* ── Header ── */}
        <XStack px={24} py={20} jc="space-between" ai="center">
          <XStack ai="center" gap={10}>
            <SettingsIcon color="#47A1FF" size={22} />
            <BodyText fontWeight="800" fontSize={18} color="#47A1FF">Settings</BodyText>
          </XStack>
          <SharingStatusPill onPress={() => setPauseSheetOpen(true)} size={14} />
        </XStack>

        {/* ── Scroll content ── */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Pause All Sharing card ── */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setPauseSheetOpen(true)}
            style={{ marginBottom: 36 }}
          >
            <XStack
              bg={isPaused ? "rgba(255,69,58,0.1)" : "$surfaceContainerLow"}
              borderRadius={24} p={24} ai="center" jc="space-between"
              borderWidth={1.5}
              borderColor={isPaused ? "rgba(255,69,58,0.3)" : "$outlineVariant"}
            >
              <XStack ai="center" gap={16} f={1}>
                <YStack
                  w={52} h={52} borderRadius={16}
                  bg={isPaused ? "rgba(255,69,58,0.15)" : "rgba(42,229,0,0.1)"}
                  ai="center" jc="center"
                >
                  {isPaused
                    ? <EyeOff color="#FF453A" size={26} />
                    : <Eye color="#2AE500" size={26} />}
                </YStack>
                <YStack f={1}>
                  <BodyText fontWeight="800" fontSize={17} color={isPaused ? "#FF453A" : "$onSurface"}>
                    {isPaused ? "Sharing Paused" : "Pause All Sharing"}
                  </BodyText>
                  <BodyText fontSize={14} color="$onSurfaceVariant" mt={4}>
                    {isPaused
                      ? "You appear offline to everyone."
                      : "Instantly hide your status everywhere."}
                  </BodyText>
                </YStack>
              </XStack>
              <BodyText color="#47A1FF" fontWeight="700" fontSize={14} ml={8}>
                {isPaused ? "Resume →" : "Pause →"}
              </BodyText>
            </XStack>
          </TouchableOpacity>

          {/* ── Account ── */}
          <SectionTitle title="Account" />
          <YStack
            bg="$surfaceContainerLow" borderRadius={28} p={24} mb={32}
            borderWidth={1} borderColor="$outlineVariant"
          >
            {/* Profile header */}
            <XStack ai="center" gap={16} mb={24} pb={20}
              borderBottomWidth={1} borderBottomColor="$outlineVariant">
              <YStack>
                <TouchableOpacity onPress={() => setAvatarOpen(true)} activeOpacity={0.8}>
                  <YStack w={64} h={64} borderRadius="$full"
                    bg={user?.avatarUrl ? 'transparent' : '#FFCDB2'}
                    ai="center" jc="center" overflow="hidden"
                    borderWidth={2} borderColor="$outlineVariant">
                    {user?.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                    ) : (
                      <BodyText fontWeight="800" fontSize={26} color="#D97B51">{user?.name?.[0] || 'A'}</BodyText>
                    )}
                  </YStack>
                  {/* Camera badge */}
                  <YStack position="absolute" bottom={0} right={-2}
                    w={20} h={20} borderRadius="$full" bg="#47A1FF"
                    ai="center" jc="center" borderWidth={2} borderColor="$surfaceContainerLow">
                    <BodyText fontSize={10} color="#111317">📷</BodyText>
                  </YStack>
                </TouchableOpacity>
                <YStack
                  position="absolute" bottom={0} right={0}
                  w={16} h={16} borderRadius="$full"
                  bg={isPaused ? "#8A919D" : "#2AE500"}
                  borderWidth={2} borderColor="$surfaceContainerLow"
                />
              </YStack>
              <YStack f={1}>
                <BodyText fontWeight="800" fontSize={18}>{user?.name || 'User'}</BodyText>
                <BodyText fontSize={14} color="$onSurfaceVariant" mt={2}>
                  {user?.email || '@user'} · {user?.university || 'University'}
                </BodyText>
              </YStack>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditName(user?.name || ''); setAccountOpen(true); }}>
                <YStack bg="rgba(71,161,255,0.12)" px={14} py={8} borderRadius={999}
                  borderWidth={1} borderColor="rgba(71,161,255,0.25)">
                  <BodyText fontSize={14} color="#47A1FF" fontWeight="700">Edit</BodyText>
                </YStack>
              </TouchableOpacity>
            </XStack>

            <SettingsRow
              Icon={Lock}  label="Security"
              subtitle="2FA & login history"
              onPress={() => setSecurityOpen(true)}
              variant="blue"
            />
            <SettingsRow
              Icon={Bell}  label="Notifications"
              subtitle="Alerts & priorities"
              onPress={() => router.push("/notifications")}
              variant="blue"
            />
            
            {/* Friend Code */}
            <YStack mt={20} pt={20} borderTopWidth={1} borderTopColor="$outlineVariant">
              <BodyText fontWeight="800" fontSize={12} color="$onSurfaceVariant" mb={12}
                textTransform="uppercase" letterSpacing={1.5}>
                Your Friend Code
              </BodyText>
              <XStack
                bg="rgba(71,161,255,0.08)" borderRadius={16} px={16} py={14}
                ai="center" gap={12} borderWidth={1} borderColor="rgba(71,161,255,0.2)"
              >
                <YStack f={1}>
                  <BodyText fontWeight="900" fontSize={20} color="#47A1FF" fontFamily="monospace">
                    {user?.friend_code || 'N/A'}
                  </BodyText>
                  <BodyText fontSize={12} color="$onSurfaceVariant" mt={4}>
                    Share this with anyone to add them as a friend
                  </BodyText>
                </YStack>
                <TouchableOpacity activeOpacity={0.7} onPress={copyFriendCode}>
                  <YStack bg={codeCopied ? "rgba(42,229,0,0.3)" : "#47A1FF"} px={12} py={8} borderRadius={8} ai="center" jc="center">
                    <BodyText fontSize={12} color="#111317" fontWeight="700">
                      {codeCopied ? "Copied!" : "Copy"}
                    </BodyText>
                  </YStack>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </YStack>

          {/* ── Presence Detection ── */}
          <SectionTitle
            title="Presence Detection"
            description="Toggle which circles can detect your presence."
          />
          <YStack
            bg="$surfaceContainerLow" borderRadius={28} p={24} mb={32}
            borderWidth={1} borderColor="$outlineVariant"
          >
            {circles.length === 0 ? (
              <BodyText color="$onSurfaceVariant" fontSize={14}>
                No circles joined yet. Joint or create a circle to enable presence detection.
              </BodyText>
            ) : circles.slice(0, 3).map((circle) => (
              <PlaceToggleRow
                key={circle.id} name={circle.name}
                active={!disabledCircles[circle.id]} 
                onToggle={() => togglePlace(circle.id)}
              />
            ))}
            {circles.length > 3 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setPlacesSheetOpen(true)}
                style={{ marginTop: 16 }}
              >
                <BodyText color="#47A1FF" fontWeight="700" fontSize={15}>
                  Manage All {circles.length} Toggles →
                </BodyText>
              </TouchableOpacity>
            )}
          </YStack>

          {/* ── Privacy Control ── */}
          <SectionTitle
            title="Privacy Control"
            description="Deep-level privacy rules for your presence data."
          />
          <PrivacyToggleRow
            Icon={History} iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.12)"
            title="Auto-delete history every 24h"
            description="Presence logs wiped daily. No server-side trail."
            value={autoDelete} onValueChange={handleAutoDeleteToggle}
          />
          <PrivacyToggleRow
            Icon={BellOff} iconColor="#FF6B6B" iconBg="rgba(255,107,107,0.12)"
            title="Allow pings after 6pm"
            description="6pm-6am. All location pings are strictly blocked during this window by default."
            value={allowEveningPings} onValueChange={handleEveningPingsToggle}
          />

          <YStack mb={16} />

          {/* ── Priority Alerts ── */}
          <SectionTitle
            title="Priority Alerts"
            description="Friends you get notified about when they enter a zone."
          />
          <YStack mb={32}>
            {watched.length === 0 ? (
              <YStack
                bg="$surfaceContainerLow" borderRadius={20} p={20}
                ai="center" borderWidth={1} borderColor="$outlineVariant"
              >
                <BodyText color="$onSurfaceVariant" fontSize={14} ta="center" lineHeight={20}>
                  No watched friends yet.{"\n"}Tap the bell icon on a friend card to add one.
                </BodyText>
              </YStack>
            ) : watched.map((w) => (
              <XStack
                key={w.watchId || w.id}
                ai="center" jc="space-between"
                bg="rgba(255,215,0,0.06)" borderRadius={20}
                p={18} mb={12}
                borderWidth={1} borderColor="rgba(255,215,0,0.18)"
              >
                <XStack ai="center" gap={14} f={1}>
                  <YStack
                    w={44} h={44} borderRadius="$full"
                    bg={w.color || '#47A1FF'} ai="center" jc="center"
                  >
                    <BodyText fontWeight="800" color="#FFF" fontSize={18}>
                      {w.name?.[0] || '?'}
                    </BodyText>
                  </YStack>
                  <YStack>
                    <BodyText fontWeight="700" fontSize={16}>{w.name}</BodyText>
                    <BodyText
                      fontSize={13} fontWeight="700" mt={3}
                      color={w.status === 'pending' ? "#FFA500" : "#FFD700"}
                    >
                      {w.status === 'pending'
                        ? "⏳ Pending acceptance"
                        : "★ " + (w.watchScope === "campus" || w.scope === "campus" ? "Campus Only" : "All Zones")}
                    </BodyText>
                  </YStack>
                </XStack>
                <TouchableOpacity onPress={() => removeWatch(w)} activeOpacity={0.7}>
                  <YStack
                    bg="rgba(255,69,58,0.1)" p={10} borderRadius={999}
                    borderWidth={1} borderColor="rgba(255,69,58,0.2)"
                  >
                    <BellOff color="#FF453A" size={18} />
                  </YStack>
                </TouchableOpacity>
              </XStack>
            ))}
          </YStack>

          {/* ── External Gateways ── */}
          <SectionTitle
            title="External Gateways"
            description="Your linked social IDs shown to verified friends."
          />
          <YStack mb={32}>
            <SocialGatewayGrid
              socials={{
                facebook: !!socials.facebook,
                instagram: !!socials.instagram,
              }}
              onEdit={(key) => setEditSocialKey(key)}
              onAdd={() => setEditSocialKey("facebook")}
            />
          </YStack>

          {/* ── University Network ── */}
          <SectionTitle title="University Network" />
          <YStack mb={32}>
            <VerifiedUniversityCard
              universityName={user?.university || 'Your University'}
              onHandbook={() => setHandbookOpen(true)}
              onSwitch={() => setSwitchNetOpen(true)}
            />
            
            <YStack mt={16}>
              <PrivacyToggleRow
                Icon={Map} iconColor="#47A1FF" iconBg="rgba(71,161,255,0.12)"
                title="Track me on Campus"
                description="Allow automated detection within your university boundaries."
                value={trackUniversity} onValueChange={handleTrackUniversityToggle}
              />
            </YStack>
          </YStack>

          {/* ── Danger Zone ── */}
          <YStack
            mb={8} pt={24}
            borderTopWidth={1} borderTopColor="rgba(255,69,58,0.2)"
          >
            <BodyText
              fontSize={12} fontWeight="800" color="#FF453A" mb={16}
              textTransform="uppercase" letterSpacing={1.5}
            >
              Danger Zone
            </BodyText>

            {/* Admin-only: university boundary editor */}
            {user?.role === 'admin' && (
              <SettingsRow
                Icon={GraduationCap} label="Admin: University Boundaries"
                subtitle="Draw zone boundaries for universities"
                iconColor="#FFAE0B"
                onPress={() => router.push('/admin/boundary')}
              />
            )}

            <SettingsRow
              Icon={LogOut} label="Log Out"
              subtitle="Sign out from this device"
              onPress={() => { setLogoutConfirm(true); setLogoutType('basic'); }} variant="blue"
            />
            <SettingsRow
              Icon={LogOut}  label="Sign Out from All Devices"
              subtitle="Ends all active sessions"
              onPress={() => { setLogoutConfirm(true); setLogoutType('all-devices'); }} variant="red"
              style={{marginTop: 8}}
            />
            <SettingsRow
              Icon={Trash2} label="Delete Account Permanently"
              subtitle="Wipes all data — irreversible"
              onPress={() => setDeleteConfirm(true)} variant="red"
            />
          </YStack>
        </ScrollView>

      {/* Security */}
      <BottomSheetModal visible={securityOpen} onClose={() => setSecurityOpen(false)} title="Security">
        <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={22} mb={20}>
          Two-factor authentication and login history management are coming in the next update. Your account is currently protected by password authentication.
        </BodyText>
        <SettingsRow Icon={Lock} label="Two-Factor Authentication" subtitle="Coming soon" onPress={() => {}} variant="blue" />
        <SettingsRow Icon={History} label="Login History" subtitle="Coming soon" onPress={() => {}} variant="neutral" />
        <TouchableOpacity onPress={() => setSecurityOpen(false)} activeOpacity={0.8} style={{ marginTop: 8 }}>
          <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
            borderWidth={1} borderColor="$outlineVariant">
            <BodyText fontWeight="700">Close</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Handbook */}
      <BottomSheetModal visible={handbookOpen} onClose={() => setHandbookOpen(false)} title="Student Handbook">
        <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={22} mb={20}>
          The Student Handbook contains policies on campus access, group verification requirements, and privacy guidelines for university students using BondhuKoi.
        </BodyText>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setHandbookOpen(false)}>
          <YStack bg="#47A1FF" borderRadius={999} py={15} ai="center" mb={12}>
            <XStack ai="center" gap={8}>
              <ExternalLink color="#111317" size={18} />
              <BodyText fontWeight="800" color="#111317">Open Handbook (Coming Soon)</BodyText>
            </XStack>
          </YStack>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setHandbookOpen(false)} activeOpacity={0.8}>
          <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
            borderWidth={1} borderColor="$outlineVariant">
            <BodyText fontWeight="700">Close</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Switch Network */}
      <BottomSheetModal visible={switchNetOpen} onClose={() => setSwitchNetOpen(false)} title="Switch Network">
        <BodyText color="$onSurfaceVariant" fontSize={14} lineHeight={22} mb={24}>
          Switching your university network requires re-verification with a new institutional email. Your current circles and friends will be preserved.
        </BodyText>
        <TouchableOpacity onPress={() => setSwitchNetOpen(false)} activeOpacity={0.8}>
          <YStack bg="#47A1FF" borderRadius={999} py={15} ai="center" mb={12}>
            <BodyText fontWeight="800" color="#111317">Request Network Switch</BodyText>
          </YStack>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSwitchNetOpen(false)} activeOpacity={0.8}>
          <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
            borderWidth={1} borderColor="$outlineVariant">
            <BodyText fontWeight="700">Cancel</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Places sheet */}
      <ManagePlacesSheet
        visible={placesSheetOpen}
        onClose={() => setPlacesSheetOpen(false)}
        circles={circles}
        disabledCircles={disabledCircles}
        onToggle={togglePlace}
      />

      {/* Social edit sheet */}
      <EditSocialSheet
        visible={!!editSocialKey}
        onClose={() => setEditSocialKey(null)}
        platformKey={editSocialKey}
        currentValue={editSocialKey ? (socials[editSocialKey] || '') : ''}
        onSave={handleSaveSocial}
        onRemove={handleRemoveSocial}
      />

      {/* Pause sheet */}
      <PauseSharingSheet
        visible={pauseSheetOpen}
        onClose={() => setPauseSheetOpen(false)}
        isPaused={isPaused}
        onToggle={() => setPauseSheetOpen(false)}
      />

      <ConfirmModal
        visible={logoutConfirm && logoutType === 'basic'} 
        onClose={() => { setLogoutConfirm(false); setLogoutType(null); }}
        onConfirm={handleBasicLogout}
        title="Log Out?" confirmLabel="Log Out" confirmVariant="blue"
        message="You will be signed out from this device."
      />

      <ConfirmModal
        visible={logoutConfirm && logoutType === 'all-devices'} 
        onClose={() => { setLogoutConfirm(false); setLogoutType(null); }}
        onConfirm={handleLogoutAllDevices}
        title="Sign Out from All Devices?" confirmLabel="Sign Out" confirmVariant="red"
        message="You will be signed out from all devices immediately. Any active sessions will end."
      />

      <ConfirmModal
        visible={deleteConfirm} onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account?" confirmLabel="Delete Forever" confirmVariant="red"
        message="This permanently deletes your account, all circles, and all location history. This cannot be undone."
      />

      {/* Account edit modal */}
      <BottomSheetModal visible={accountOpen} onClose={() => setAccountOpen(false)} title="Edit Profile">
        <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={10}
          textTransform="uppercase" letterSpacing={1}>Display Name</BodyText>
        <XStack bg="$surfaceContainerLow" borderRadius={16} px={16} py={14} mb={24}
          borderWidth={1} borderColor="$outlineVariant" ai="center">
          <RNTextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor="#6C727F"
            style={{ flex: 1, fontFamily: 'Inter', fontSize: 16, color: '#FFFFFF' }}
            autoFocus
          />
        </XStack>
        <TouchableOpacity onPress={handleSaveName} activeOpacity={0.8} disabled={isSavingName}>
          <YStack bg="#47A1FF" borderRadius={999} py={16} ai="center" mb={12}
            opacity={isSavingName ? 0.7 : 1}>
            <BodyText fontWeight="800" color="#111317">
              {isSavingName ? 'Saving...' : 'Save Name'}
            </BodyText>
          </YStack>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAccountOpen(false)} activeOpacity={0.8}>
          <YStack bg="$surfaceContainerHighest" borderRadius={999} py={14} ai="center"
            borderWidth={1} borderColor="$outlineVariant">
            <BodyText fontWeight="700">Cancel</BodyText>
          </YStack>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* Avatar upload sheet */}
      <AvatarUploadSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />

      </SanctuaryPage>
      </TabScreenWrapper>
    </SafeAreaView>
  );
}
