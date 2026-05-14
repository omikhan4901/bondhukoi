import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../components/SanctuaryComponents';
import { ChevronLeft, Ghost, Shield, GraduationCap, Link2, LogOut, MapPin } from '@tamagui/lucide-icons-2';
import { useAuth } from '../src/hooks/useAuth';
import { locationService } from '../src/services/api';
import { BoundaryEditorSheet } from '../components/sheets/BoundaryEditorSheet';
import { ConfirmModal } from '../components/modals/ConfirmModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [ghostMode, setGhostMode] = useState(false);
  const [isBoundaryEditorOpen, setIsBoundaryEditorOpen] = useState(false);
  const [universityBoundary, setUniversityBoundary] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  const isAdmin = user?.role === 'admin';

  const handleSaveBoundary = async (points, snapshotBase64 = null) => {
    if (!user?.university) return;
    try {
      setIsSaving(true);
      await locationService.saveUniversityBoundary(user.university, points, snapshotBase64);
      setUniversityBoundary(points);
      setIsBoundaryEditorOpen(false);
      setSuccessModal({
        visible: true,
        title: "Boundary Saved",
        message: `The boundary for ${user.university} has been updated successfully.`
      });
    } catch (err) {
      console.error('Failed to save university boundary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const openBoundaryEditor = async () => {
    try {
      const data = await locationService.getBoundaries();
      if (data.universityBoundary?.boundary) {
        setUniversityBoundary(data.universityBoundary.boundary);
      }
      setIsBoundaryEditorOpen(true);
    } catch (err) {
      console.error('Failed to fetch boundary:', err);
      setIsBoundaryEditorOpen(true);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" space={16}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="$onSurface" size={28} />
          </TouchableOpacity>
          <YStack f={1}>
            <Heading fontSize={24}>Settings</Heading>
          </YStack>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Ghost Mode Toggle */}
          <XStack bg="$surfaceContainerLow" borderRadius={20} p={20} mb={24} ai="center" jc="space-between" borderWidth={1} borderColor="$outlineVariant">
            <XStack ai="center" f={1} space={16}>
              <Ghost color="$onSurfaceVariant" size={24} />
              <YStack f={1} mr={16}>
                 <BodyText fontWeight="700">Ghost Mode</BodyText>
                 <BodyText fontSize={13} color="$onSurfaceVariant" mt={4}>Instantly pause all location sharing globally. You will appear entirely offline.</BodyText>
              </YStack>
            </XStack>
            <Switch
              value={ghostMode}
              onValueChange={setGhostMode}
              trackColor={{ false: "#1E2024", true: "#47A1FF" }}
              thumbColor={ghostMode ? "#FFFFFF" : "#8A919D"}
            />
          </XStack>

           {isAdmin && (
             <>
               <Heading fontSize={14} color="$onSurfaceVariant" mb={12} ml={8} textTransform="uppercase" letterSpacing={1} mt={8}>Admin Tools</Heading>
               <YStack bg="$surfaceContainerLow" borderRadius={24} mb={24} overflow="hidden" borderWidth={1} borderColor="$outlineVariant">
                 <TouchableOpacity activeOpacity={0.7} onPress={openBoundaryEditor}>
                   <XStack px={20} py={16} ai="center" space={16}>
                     <MapPin color="$primary" size={20} />
                     <YStack f={1}>
                       <BodyText fontWeight="700" fontSize={16}>Campus Boundary</BodyText>
                       <BodyText fontSize={13} color="$onSurfaceVariant">Draw the main geofence for {user?.university}</BodyText>
                     </YStack>
                   </XStack>
                 </TouchableOpacity>
               </YStack>
             </>
           )}

           <Heading fontSize={14} color="$onSurfaceVariant" mb={12} ml={8} textTransform="uppercase" letterSpacing={1}>Account Management</Heading>

          <YStack bg="$surfaceContainerLow" borderRadius={24} mb={24} overflow="hidden" borderWidth={1} borderColor="$outlineVariant">
             <TouchableOpacity activeOpacity={0.7}>
               <XStack px={20} py={16} ai="center" space={16} borderBottomWidth={1} borderColor="$outlineVariant">
                 <GraduationCap color="$onSurfaceVariant" size={20} />
                 <BodyText fontWeight="700" fontSize={16}>Change University</BodyText>
               </XStack>
             </TouchableOpacity>
             <TouchableOpacity activeOpacity={0.7}>
               <XStack px={20} py={16} ai="center" space={16} borderBottomWidth={1} borderColor="$outlineVariant">
                 <Link2 color="$onSurfaceVariant" size={20} />
                 <BodyText fontWeight="700" fontSize={16}>Manage Social Links</BodyText>
               </XStack>
             </TouchableOpacity>
             <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/trust')}>
               <XStack px={20} py={16} ai="center" space={16}>
                 <Shield color="$primary" size={20} />
                 <YStack f={1}>
                   <BodyText fontWeight="700" fontSize={16} color="$primary">Trust & Privacy Center</BodyText>
                   <BodyText fontSize={13} color="$onSurfaceVariant">Learn how we protect your data</BodyText>
                 </YStack>
               </XStack>
             </TouchableOpacity>
          </YStack>

          <TouchableOpacity 
            onPress={async () => {
              await logout();
              // RootAuthGuard in _layout.js handles navigation to login screen
            }} 
            activeOpacity={0.7}
          >
            <XStack bg="$surfaceContainerHighest" px={20} py={16} borderRadius={999} ai="center" jc="center" space={8}>
              <LogOut color="$error" size={20} />
              <BodyText fontWeight="700" color="$error">Log Out</BodyText>
            </XStack>
          </TouchableOpacity>
          
          
        </ScrollView>

        <BoundaryEditorSheet
          visible={isBoundaryEditorOpen}
          onClose={() => setIsBoundaryEditorOpen(false)}
          onBoundarySelected={handleSaveBoundary}
          initialBoundary={universityBoundary}
          title={`Boundary: ${user?.university}`}
        />

        <ConfirmModal
          visible={successModal.visible}
          onClose={() => setSuccessModal({ ...successModal, visible: false })}
          title={successModal.title}
          message={successModal.message}
          confirmLabel="Got it"
          onConfirm={() => setSuccessModal({ ...successModal, visible: false })}
        />
      </SanctuaryPage>
    </SafeAreaView>
  );
}
