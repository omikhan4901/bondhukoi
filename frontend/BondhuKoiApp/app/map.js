import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView, TouchableOpacity, Alert, StyleSheet, Platform
} from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { YStack, XStack } from 'tamagui';
import { SanctuaryPage, Heading, BodyText } from '../components/SanctuaryComponents';
import { ChevronLeft, Navigation, MapPin, RefreshCw } from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import * as Location from 'expo-location';
import { locationService } from '../src/services/api';
import { boundaryToMapCoords } from '../src/utils/locationUtils';

export default function MapScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [boundaries, setBoundaries] = useState({ universityBoundary: null, circleBoundaries: [] });
  const [isChecking, setIsChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: 23.8103,
    longitude: 90.4125,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    })();
  }, []);

  useEffect(() => {
    locationService.getBoundaries()
      .then(data => setBoundaries(data))
      .catch(err => console.warn('[MapScreen] Failed to load boundaries:', err.message));
  }, []);

  const handleCheckNow = async () => {
    if (!locationGranted) {
      Alert.alert('Location needed', 'Please grant location permission in Settings.');
      return;
    }
    setIsChecking(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await locationService.checkLocation(pos.coords.latitude, pos.coords.longitude);
      setLastStatus(result);
    } catch (err) {
      Alert.alert('Check failed', err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const uniCoords = boundaryToMapCoords(boundaries.universityBoundary?.boundary);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111317' }}>
      {/* Header */}
      <XStack px={20} py={16} ai="center" gap={16}
        style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <YStack f={1}>
          <Heading fontSize={20}>Zone Map</Heading>
          <BodyText fontSize={12} color="$onSurfaceVariant">{user?.university || 'Your Campus'}</BodyText>
        </YStack>
        <TouchableOpacity onPress={handleCheckNow} activeOpacity={0.8} disabled={isChecking}>
          <XStack bg="rgba(71,161,255,0.12)" px={16} py={10} borderRadius={999}
            ai="center" gap={8} borderWidth={1} borderColor="rgba(71,161,255,0.25)">
            {isChecking
              ? <RefreshCw color="#47A1FF" size={16} />
              : <Navigation color="#47A1FF" size={16} />}
            <BodyText color="#47A1FF" fontWeight="700" fontSize={13}>
              {isChecking ? 'Checking...' : 'Check Now'}
            </BodyText>
          </XStack>
        </TouchableOpacity>
      </XStack>

      {/* Status banner */}
      {lastStatus && (
        <XStack
          bg={lastStatus.isInside ? 'rgba(42,229,0,0.1)' : 'rgba(255,69,58,0.1)'}
          px={20} py={14} ai="center" gap={12}
          style={{ borderBottomWidth: 1, borderBottomColor: lastStatus.isInside ? 'rgba(42,229,0,0.2)' : 'rgba(255,69,58,0.2)' }}>
          <YStack w={10} h={10} borderRadius="$full"
            bg={lastStatus.isInside ? '#2AE500' : '#FF453A'} />
          <BodyText fontWeight="700"
            color={lastStatus.isInside ? '#2AE500' : '#FF453A'}>
            {lastStatus.isInUniversity
              ? `Inside ${user?.university || 'University'}`
              : lastStatus.insideCircleIds?.length > 0
                ? `Inside ${lastStatus.insideCircleIds.length} circle zone${lastStatus.insideCircleIds.length !== 1 ? 's' : ''}`
                : 'Outside all zones'}
          </BodyText>
        </XStack>
      )}

      {/* Map */}
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={currentRegion}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {/* University boundary */}
        {uniCoords.length >= 3 && (
          <Polygon
            coordinates={uniCoords}
            strokeColor="#47A1FF"
            fillColor="rgba(71,161,255,0.1)"
            strokeWidth={2.5}
          />
        )}

        {/* Circle boundaries */}
        {(boundaries.circleBoundaries || []).map((cb) => {
          const coords = boundaryToMapCoords(cb.boundary);
          if (coords.length < 3) return null;
          return (
            <Polygon
              key={cb.circleId}
              coordinates={coords}
              strokeColor="#F59E0B"
              fillColor="rgba(245,158,11,0.08)"
              strokeWidth={2}
            />
          );
        })}
      </MapView>

      {/* Legend */}
      <YStack px={20} py={16} style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
        <XStack gap={24} ai="center">
          <XStack ai="center" gap={8}>
            <YStack w={16} h={3} borderRadius={999} bg="#47A1FF" />
            <BodyText fontSize={12} color="$onSurfaceVariant">University</BodyText>
          </XStack>
          <XStack ai="center" gap={8}>
            <YStack w={16} h={3} borderRadius={999} bg="#F59E0B" />
            <BodyText fontSize={12} color="$onSurfaceVariant">Circle Zone</BodyText>
          </XStack>
        </XStack>
      </YStack>
    </SafeAreaView>
  );
}
