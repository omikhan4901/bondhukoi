import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, View, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { YStack, XStack } from 'tamagui';
import { Heading, BodyText } from '../../components/SanctuaryComponents';
import { ChevronLeft, GraduationCap, Undo2, Trash2 } from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { locationService } from '../../src/services/api';
import { boundaryToMapCoords, mapCoordToPoint, haversineDistance } from '../../src/utils/locationUtils';
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

const CLOSE_THRESHOLD_METRES = 20;

const UNIVERSITIES = [
  'North South University',
  'BRAC University',
  'Independent University Bangladesh',
  'American Int. University-Bangladesh',
  'University of Dhaka',
];

export default function AdminBoundaryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedUni, setSelectedUni] = useState(UNIVERSITIES[0]);
  const [allBoundaries, setAllBoundaries] = useState({});
  const mapRef = React.useRef(null);
  const [points, setPoints] = useState([]);
  const [closed, setClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'This screen is admin only.');
      router.back();
      return;
    }
    loadBoundaries();
  }, [user]);

  useEffect(() => {
    const existing = allBoundaries[selectedUni];
    setPoints(existing || []);
    setClosed((existing?.length ?? 0) >= 3);
  }, [selectedUni, allBoundaries]);

  const loadBoundaries = async () => {
    setIsLoading(true);
    try {
      const data = await locationService.getAdminUniversities();
      const map = {};
      (data.universities || []).forEach(u => {
        map[u.university_name] = u.boundary;
      });
      setAllBoundaries(map);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapPress = useCallback((e) => {
    if (closed) return;
    const newPoint = mapCoordToPoint(e.nativeEvent.coordinate);

    setPoints(prev => {
      if (prev.length >= 3) {
        const dist = haversineDistance(
          prev[0].lat, prev[0].lng,
          newPoint.lat, newPoint.lng
        );
        if (dist <= CLOSE_THRESHOLD_METRES) {
          setClosed(true);
          return prev;
        }
      }
      return [...prev, newPoint];
    });
  }, [closed]);

  const handleUndo = () => {
    if (closed) { setClosed(false); return; }
    setPoints(p => p.slice(0, -1));
  };

  const handleClear = () => {
    setClosed(false);
    setPoints([]);
  };

  const handleSave = async () => {
    if (!closed || points.length < 3) {
      Alert.alert('Close the polygon first', 'Tap near the first (green) point to close it.');
      return;
    }
    setIsSaving(true);
    try {
      let snapshotBase64 = null;
      if (mapRef.current) {
        // Fit to polygon for snapshot
        mapRef.current.fitToCoordinates(polygonCoords, {
          edgePadding: { top: 250, right: 80, bottom: 250, left: 80 },
          animated: false,
        });
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const snapshotUri = await mapRef.current.takeSnapshot({
          format: 'jpg',
          quality: 0.8,
          result: 'file'
        });

        const manipulated = await manipulateAsync(
          snapshotUri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );

        snapshotBase64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: 'base64',
        });
      }

      await locationService.saveUniversityBoundary(selectedUni, points, snapshotBase64);
      setAllBoundaries(prev => ({ ...prev, [selectedUni]: points }));
      Alert.alert('Saved ✓', `Boundary and snapshot saved for ${selectedUni}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const polygonCoords = boundaryToMapCoords(points);
  const firstCoord = polygonCoords[0] ?? null;

  const statusText = closed
    ? `✓ Closed — ${points.length} points`
    : points.length === 0
      ? 'Tap map to start placing points'
      : points.length < 3
        ? `${points.length} point${points.length !== 1 ? 's' : ''} — keep going`
        : `${points.length} points — tap the green dot to close`;

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#111317', paddingTop: insets.top }}>
      {/* Header */}
      <XStack px={20} py={16} ai="center" gap={16}
        style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <YStack f={1}>
          <XStack ai="center" gap={8}>
            <GraduationCap color="#47A1FF" size={20} />
            <Heading fontSize={18}>University Boundaries</Heading>
          </XStack>
          <BodyText fontSize={12} color={closed ? '#2AE500' : '$onSurfaceVariant'} fontWeight="700">
            {statusText}
          </BodyText>
        </YStack>
        <XStack gap={10}>
          <TouchableOpacity onPress={handleUndo} activeOpacity={0.7}
            style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <Undo2 color="#8A919D" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7}
            style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,69,58,0.1)' }}>
            <Trash2 color="#FF453A" size={20} />
          </TouchableOpacity>
        </XStack>
      </XStack>

      {/* University selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 60 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 10, flexDirection: 'row' }}>
        {UNIVERSITIES.map(uni => (
          <TouchableOpacity key={uni} onPress={() => setSelectedUni(uni)} activeOpacity={0.8}>
            <YStack
              px={16} py={8} borderRadius={999}
              bg={selectedUni === uni ? '#47A1FF' : 'rgba(255,255,255,0.06)'}
              borderWidth={1}
              borderColor={selectedUni === uni ? '#47A1FF' : 'rgba(255,255,255,0.1)'}>
              <BodyText fontSize={12} fontWeight="700"
                color={selectedUni === uni ? '#111317' : '#8A919D'}>
                {uni.split(' ').slice(0, 2).join(' ')}
              </BodyText>
            </YStack>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: 23.8103, longitude: 90.4125, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
        onPress={handleMapPress}
      >
        {/* Polygon fill */}
        {polygonCoords.length >= 3 && (
          <Polygon
            coordinates={polygonCoords}
            strokeColor={closed ? '#2AE500' : '#47A1FF'}
            fillColor={closed ? 'rgba(42,229,0,0.12)' : 'rgba(71,161,255,0.15)'}
            strokeWidth={2.5}
          />
        )}

        {/* First point — green close target */}
        {firstCoord && !closed && (
          <Marker coordinate={firstCoord} pinColor="#2AE500" title="Tap to close" />
        )}

        {/* Remaining points */}
        {polygonCoords.slice(1).map((coord, i) => (
          <Marker key={i + 1} coordinate={coord} pinColor="#47A1FF" />
        ))}
      </MapView>

      {/* Actions */}
      <XStack px={20} py={16} gap={12}
        style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={isSaving || !closed}
          style={{ flex: 1 }}>
          <YStack bg={closed ? '#2AE500' : '#2A2D33'} borderRadius={999}
            py={16} ai="center" opacity={isSaving ? 0.7 : 1}>
            {isSaving
              ? <ActivityIndicator color="#111317" />
              : <BodyText fontWeight="800" color={closed ? '#111317' : '#8A919D'}>
                  {closed ? 'Save Boundary' : 'Close polygon first'}
                </BodyText>}
          </YStack>
        </TouchableOpacity>
      </XStack>
      {/* Bottom Padding for SafeArea */}
      <View style={{ height: insets.bottom, backgroundColor: '#111317' }} />
    </View>
  );
}
