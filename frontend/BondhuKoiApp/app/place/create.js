import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../../components/SanctuaryComponents';
import { X, CornerUpLeft, CheckCircle, MapPin } from '@tamagui/lucide-icons-2';

export default function CreatePlaceScreen() {
  const router = useRouter();
  const tags = ["Campus", "Residential", "Event", "Public"];
  const [selectedTag, setSelectedTag] = useState("Campus");

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SanctuaryPage>
        <XStack px={24} py={16} ai="center" jc="space-between">
          <Heading fontSize={22}>Draw Boundary</Heading>
          <TouchableOpacity onPress={() => router.back()}>
            <X color="$onSurface" size={28} />
          </TouchableOpacity>
        </XStack>

        {/* Full-Screen Map Placeholder */}
        <YStack f={1} bg="$surfaceContainerLow" mx={24} mb={16} mt={24} borderRadius={32} ai="center" jc="center" borderWidth={1} borderColor="$outlineVariant">
           <MapPin color="$outlineVariant" size={40} opacity={0.5} mb={8} />
           <BodyText color="$onSurfaceVariant">Tap to drop boundary points</BodyText>
        </YStack>

        {/* Tags Selection */}
        <YStack px={24} mb={16}>
           <BodyText color="$onSurfaceVariant" fontSize={13} mb={8} fontWeight="700" letterSpacing={1} textTransform="uppercase">Zone Category</BodyText>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {tags.map(t => (
                 <TouchableOpacity key={t} onPress={() => setSelectedTag(t)} activeOpacity={0.8}>
                    <YStack 
                      bg={selectedTag === t ? "#47A1FF" : "$surfaceContainerHigh"} 
                      px={16} py={8} 
                      borderRadius={999} 
                      mr={12}
                      borderWidth={1}
                      borderColor={selectedTag === t ? "#47A1FF" : "$outlineVariant"}
                     >
                       <BodyText 
                         fontWeight="700" 
                         fontSize={13} 
                         color={selectedTag === t ? "#111317" : "$onSurfaceVariant"}
                       >
                          {t}
                       </BodyText>
                    </YStack>
                 </TouchableOpacity>
              ))}
           </ScrollView>
        </YStack>

        {/* Toolbar */}
        <XStack px={24} pb={16} ai="center" jc="space-between">
           <TouchableOpacity activeOpacity={0.7}>
             <XStack bg="$surfaceContainerHighest" px={20} py={12} borderRadius={999} ai="center" space={8} borderWidth={1} borderColor="$outlineVariant">
                <CornerUpLeft color="$onSurface" size={20} />
                <BodyText fontWeight="700">Undo</BodyText>
             </XStack>
           </TouchableOpacity>
           
           <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
             <XStack bg="$primaryContainer" px={24} py={12} borderRadius={999} ai="center" space={8}>
                <CheckCircle color="$onPrimary" size={20} />
                <BodyText fontWeight="800" color="$onPrimary">Save Place</BodyText>
             </XStack>
           </TouchableOpacity>
        </XStack>
      </SanctuaryPage>
    </SafeAreaView>
  );
}
