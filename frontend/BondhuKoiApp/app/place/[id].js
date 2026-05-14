import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../../components/SanctuaryComponents';
import { ChevronLeft, MapPin, UserPlus, Users, Check } from '@tamagui/lucide-icons-2';
import { Switch } from 'react-native';

// Components
import { SectionHeader } from '../../components/ui/SectionHeader';

// Sheets
import { AddMemberSheet } from '../../components/sheets/AddMemberSheet';

export default function PlaceDetailScreen() {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" space={16}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="$onSurface" size={28} />
          </TouchableOpacity>
          <YStack f={1}>
            <Heading fontSize={24}>NSU Library</Heading>
            <BodyText color="$onSurfaceVariant" fontSize={14}>Custom Sanctuary</BodyText>
          </YStack>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Map Placeholder */}
          <YStack h={200} bg="$surfaceContainerLow" borderRadius={24} mb={20} ai="center" jc="center"
            borderWidth={1} borderColor="$outlineVariant">
            <MapPin color="$outlineVariant" size={40} />
            <BodyText color="$onSurfaceVariant" mt={8}>Map Boundary</BodyText>
          </YStack>

          {/* Share Toggle */}
          <XStack bg="$surfaceContainerLow" borderRadius={20} p={16} mb={24} ai="center"
            jc="space-between" borderWidth={1} borderColor="$outlineVariant">
            <YStack f={1} mr={16}>
              <BodyText fontWeight="700">Share Status Here</BodyText>
              <BodyText fontSize={13} color="$onSurfaceVariant" mt={4}>
                Allow friends to see when you enter or leave this zone.
              </BodyText>
            </YStack>
            <Switch value={isSharing} onValueChange={setIsSharing}
              trackColor={{ false: "#1E2024", true: "#47A1FF" }}
              thumbColor={isSharing ? "#FFFFFF" : "#8A919D"} />
          </XStack>

          <SectionHeader
            title="Members Inside"
            actionLabel="Invite"
            onAction={() => setAddMemberOpen(true)}
          />

          {[1, 2].map((i) => (
            <XStack key={i} bg="$surfaceContainerLow" borderRadius={20} p={16} mb={12}
              ai="center" jc="space-between" borderWidth={1} borderColor="$outlineVariant">
              <XStack ai="center" space={12}>
                <YStack w={36} h={36} borderRadius="$full" bg="$surfaceContainerHighest" ai="center" jc="center">
                  <Users color="$onSurfaceVariant" size={18} />
                </YStack>
                <BodyText fontWeight="700">Friend {i}</BodyText>
              </XStack>
              <YStack w={8} h={8} borderRadius="$full" bg="$tertiary"
                style={{ shadowColor: '#2ae500', shadowOpacity: 0.5, shadowRadius: 6 }} />
            </XStack>
          ))}
        </ScrollView>
      </SanctuaryPage>

      <AddMemberSheet visible={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
    </SafeAreaView>
  );
}
