import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Undo2, Trash2, Crosshair } from 'lucide-react-native';
import { Button, Text } from '../ui';
import { useTheme } from '../theme/ThemeProvider';
import { metersBetween } from '../lib/geo';

const DHAKA = { latitude: 23.8151, longitude: 90.4255, latitudeDelta: 0.006, longitudeDelta: 0.006 };
// Tapping this close to the first corner closes the shape.
const CLOSE_METERS = 15;
const MAX_POINTS = 30;

/**
 * Draw a circle's zone on the map, the way the original BondhuKoi editor worked:
 * tap to place corners, tap the first (green) corner again to close the shape, and
 * the closed shape becomes the circle's cover picture. Corners can be dragged to adjust
 * them; Undo reopens a closed shape; Clear starts over.
 *
 * onChange(points, closed). ref.snapshot() fits the map to the zone, hides the corner
 * markers, and returns a JPEG (base64) for the cover.
 */
export const ZoneEditor = forwardRef(function ZoneEditor({ initial, onChange, height = 400 }, ref) {
  const { c, radius, space } = useTheme();
  const map = useRef(null);
  const [points, setPoints] = useState(initial || []);
  const [closed, setClosed] = useState((initial || []).length >= 3);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => onChange?.(points, closed), [points, closed, onChange]);

  useEffect(() => {
    if (initial?.length) {
      setTimeout(() => fitTo(initial, false), 300);
    } else {
      centerOnMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fitTo(list, animated = true) {
    map.current?.fitToCoordinates(
      list.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 56, bottom: 56, left: 56, right: 56 }, animated },
    );
  }

  async function centerOnMe() {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return;
    const pos = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (pos) map.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 300);
  }

  function tap({ latitude, longitude }) {
    if (closed) return;
    const next = { lat: latitude, lng: longitude };
    if (points.length >= 3 && metersBetween(points[0], next) <= CLOSE_METERS) {
      setClosed(true);
      fitTo(points);
      return;
    }
    if (points.length < MAX_POINTS) setPoints([...points, next]);
  }

  function undo() {
    if (closed) return setClosed(false);
    setPoints((p) => p.slice(0, -1));
  }

  useImperativeHandle(ref, () => ({
    async snapshot() {
      if (!closed || points.length < 3) return null;
      setCapturing(true);
      fitTo(points, false);
      // Let the map redraw the fitted area without the markers before capturing it.
      await new Promise((r) => setTimeout(r, 800));
      try {
        return await map.current?.takeSnapshot({ format: 'jpg', quality: 0.75, result: 'base64', width: 800, height: 450 });
      } catch {
        return null;
      } finally {
        setCapturing(false);
      }
    },
  }));

  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const stroke = closed ? c.here : c.brand;
  const hint = closed
    ? `Zone closed · ${points.length} corners. This picture becomes the circle’s cover.`
    : points.length === 0
      ? 'Tap the map to place the first corner.'
      : points.length < 3
        ? `${points.length} corner${points.length === 1 ? '' : 's'}. Keep going.`
        : `${points.length} corners. Tap the green corner to close the zone.`;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <MapView
          ref={map}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
          initialRegion={DHAKA}
          showsUserLocation={!capturing}
          showsMyLocationButton={false}
          showsPointsOfInterest
          toolbarEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          onPress={(e) => tap(e.nativeEvent.coordinate)}
        >
          {coords.length >= 2 ? (
            <Polygon coordinates={coords} strokeColor={stroke} fillColor={`${stroke}${closed ? '33' : '1A'}`} strokeWidth={closed ? 3 : 2} />
          ) : null}
          {capturing
            ? null
            : coords.map((p, i) => {
                const first = i === 0 && !closed && points.length >= 3;
                return (
                  <Marker
                    key={i}
                    coordinate={p}
                    anchor={{ x: 0.5, y: 0.5 }}
                    draggable
                    tracksViewChanges={false}
                    onPress={first ? () => { setClosed(true); fitTo(points); } : undefined}
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setPoints((prev) => prev.map((q, j) => (j === i ? { lat: latitude, lng: longitude } : q)));
                    }}
                  >
                    <View
                      style={{
                        width: first ? 22 : 14,
                        height: first ? 22 : 14,
                        borderRadius: 11,
                        backgroundColor: first ? c.hereDot : c.surface,
                        borderWidth: 3,
                        borderColor: first ? c.surface : stroke,
                      }}
                    />
                  </Marker>
                );
              })}
        </MapView>
      </View>
      <Text variant="secondary" tone={closed ? 'here' : 'muted'}>
        {hint}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title={closed ? 'Reopen' : 'Undo'} icon={Undo2} size="sm" variant="secondary" style={{ flex: 1 }} disabled={!points.length} onPress={undo} />
        <Button
          title="Clear"
          icon={Trash2}
          size="sm"
          variant="secondary"
          style={{ flex: 1 }}
          disabled={!points.length}
          onPress={() => {
            setClosed(false);
            setPoints([]);
          }}
        />
        <Button title="Me" icon={Crosshair} size="sm" variant="secondary" style={{ flex: 1 }} onPress={centerOnMe} accessibilityLabel="Center the map on me" />
      </View>
    </View>
  );
});
