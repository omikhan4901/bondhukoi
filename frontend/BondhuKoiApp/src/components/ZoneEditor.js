import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Undo2, Trash2, Crosshair } from 'lucide-react-native';
import { Button, Text } from '../ui';
import { useTheme } from '../theme/ThemeProvider';

const DHAKA = { latitude: 23.8151, longitude: 90.4255, latitudeDelta: 0.006, longitudeDelta: 0.006 };

/**
 * Tap the map to place the corners of a zone. `ref.snapshot()` returns a JPEG (base64)
 * of the map fitted to the zone, used as the circle's picture.
 */
export const ZoneEditor = forwardRef(function ZoneEditor({ initial, onChange, height = 380 }, ref) {
  const { c, radius, space } = useTheme();
  const map = useRef(null);
  const [points, setPoints] = useState(initial || []);

  useEffect(() => onChange?.(points), [points, onChange]);

  useEffect(() => {
    if (initial?.length) {
      setTimeout(() => map.current?.fitToCoordinates(initial.map((p) => ({ latitude: p.lat, longitude: p.lng })), { edgePadding: { top: 40, bottom: 40, left: 40, right: 40 }, animated: false }), 300);
    } else {
      centerOnMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function centerOnMe() {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return;
    const pos = await Location.getLastKnownPositionAsync() || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (pos) map.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 300);
  }

  useImperativeHandle(ref, () => ({
    async snapshot() {
      if (points.length < 3) return null;
      map.current?.fitToCoordinates(points.map((p) => ({ latitude: p.lat, longitude: p.lng })), { edgePadding: { top: 48, bottom: 48, left: 48, right: 48 }, animated: false });
      // Give the map a moment to draw the new area before taking the picture.
      await new Promise((r) => setTimeout(r, 700));
      try {
        return await map.current?.takeSnapshot({ format: 'jpg', quality: 0.7, result: 'base64', width: 800, height: 450 });
      } catch {
        return null;
      }
    },
  }));

  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <MapView
          ref={map}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={DHAKA}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPoints((p) => (p.length >= 30 ? p : [...p, { lat: latitude, lng: longitude }]));
          }}
        >
          {coords.length >= 3 ? <Polygon coordinates={coords} strokeColor={c.brand} fillColor={`${c.brand}33`} strokeWidth={2} /> : null}
          {coords.map((p, i) => (
            <Marker key={i} coordinate={p} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.surface, borderWidth: 3, borderColor: c.brand }} />
            </Marker>
          ))}
        </MapView>
      </View>
      <Text variant="secondary" tone="muted">
        {points.length < 3 ? `Tap the map to mark the corners of the place (${points.length} of at least 3).` : `${points.length} corners. Keep it to the building or area you meet in.`}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="Undo" icon={Undo2} size="sm" variant="secondary" style={{ flex: 1 }} disabled={!points.length} onPress={() => setPoints((p) => p.slice(0, -1))} />
        <Button title="Clear" icon={Trash2} size="sm" variant="secondary" style={{ flex: 1 }} disabled={!points.length} onPress={() => setPoints([])} />
        <Button title="Me" icon={Crosshair} size="sm" variant="secondary" style={{ flex: 1 }} onPress={centerOnMe} accessibilityLabel="Center the map on me" />
      </View>
    </View>
  );
});
