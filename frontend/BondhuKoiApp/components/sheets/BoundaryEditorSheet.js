import React, { useState, useRef, useCallback } from "react";
import {
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { YStack, XStack } from "tamagui";
import { BodyText, Heading } from "../SanctuaryComponents";
import { Trash2, Check, Undo2, X, MapPin } from "@tamagui/lucide-icons-2";
import {
  boundaryToMapCoords,
  mapCoordToPoint,
  haversineDistance,
} from "../../src/utils/locationUtils";
import { locationService } from "../../src/services/api";
import { SanctuaryLoader } from "../SanctuaryComponents";
import { useBackHandler } from "@react-native-community/hooks";
// import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
//
// How far (metres) from the first point counts as "tap to close"
//
const CLOSE_THRESHOLD_METRES = 20;

/**
 * BoundaryEditorSheet
 *
 * Tap to place points → keep tapping to trace the shape →
 * tap near the first point (green) to close and lock the polygon →
 * then Save.
 */
export const BoundaryEditorSheet = ({
  visible,
  onClose,
  circleId,
  entityName = "Zone",
  initialBoundary = [],
  onSaved,
  onBoundarySelected,
}) => {
  const mapRef = useRef(null);
  const [points, setPoints] = useState(() =>
    initialBoundary.length > 0 ? initialBoundary : [],
  );
  const [closed, setClosed] = useState(initialBoundary.length >= 3);
  const [isSaving, setIsSaving] = useState(false);

  // Block back button on Android while saving
  useBackHandler(() => {
    if (isSaving) return true; // Consume event
    return false; // Let it proceed
  });

  const [initialRegion] = useState({
    latitude: 23.8103,
    longitude: 90.4125,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const handleMapPress = useCallback(
    (e) => {
      if (closed) return; // polygon locked — do nothing

      const coord = e.nativeEvent.coordinate;
      const newPoint = mapCoordToPoint(coord);

      setPoints((prev) => {
        // Need at least 3 points before we can attempt to close
        if (prev.length >= 3) {
          const first = prev[0];
          const dist = haversineDistance(
            first.lat,
            first.lng,
            newPoint.lat,
            newPoint.lng,
          );
          if (dist <= CLOSE_THRESHOLD_METRES) {
            // Close the polygon — don't add the tap point
            setClosed(true);
            return prev;
          }
        }
        return [...prev, newPoint];
      });
    },
    [closed],
  );

  const handleUndo = () => {
    if (closed) {
      // Re-open the polygon so they can keep editing
      setClosed(false);
      return;
    }
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setClosed(false);
    setPoints([]);
  };

  const handleSave = async () => {
    if (!closed || points.length < 3) {
      Alert.alert(
        "Close the polygon first",
        "Tap near the first point (green) to close your boundary before saving.",
      );
      return;
    }

    setIsSaving(true);
    try {
      let snapshotBase64 = null;

      // 1. Fit map to polygon and take a snapshot
      if (mapRef.current && polygonCoords.length >= 3) {
        mapRef.current.fitToCoordinates(polygonCoords, {
          edgePadding: { top: 250, right: 80, bottom: 250, left: 80 },
          animated: false,
        });

        // Tiny delay so the map renders the new region
        await new Promise((resolve) => setTimeout(resolve, 300));

        const snapshotUri = await mapRef.current.takeSnapshot({
          format: "jpg",
          quality: 0.9,
          result: "file",
        });

        const manipulated = await manipulateAsync(
          snapshotUri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: SaveFormat.JPEG },
        );

        snapshotBase64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: "base64",
        });

        if (!snapshotBase64)
          throw new Error("Snapshot encoding failed — base64 is empty.");
      }

      if (!circleId && onBoundarySelected) {
        // No circleId — return data to caller (e.g. during circle creation)
        onBoundarySelected(points, snapshotBase64);
        onClose();
        return;
      }

      // 2. Send boundary + base64 snapshot to the backend in one call.
      //    The backend uploads to storage with the service role key,
      //    bypassing Supabase RLS that would block a direct frontend upload.
      if (circleId) {
        const result = await locationService.saveCircleBoundary(
          circleId,
          points,
          snapshotBase64,
        );
        onSaved?.(result?.snapshotUrl ?? null);
        onClose();
      }
    } catch (err) {
      Alert.alert("Save failed", err.message || "Could not save boundary.");
    } finally {
      setIsSaving(false);
    }
  };

  const polygonCoords = boundaryToMapCoords(points);
  const firstCoord = polygonCoords[0] ?? null;

  // Status bar text
  const statusText = (() => {
    if (closed) return `✓ Closed — ${points.length} points. Ready to save.`;
    if (points.length === 0) return "Tap the map to place your first point.";
    if (points.length < 3)
      return `${points.length} point${points.length !== 1 ? "s" : ""} — keep going.`;
    return `${points.length} points — tap the green dot to close.`;
  })();

  const statusColor = closed ? "#2AE500" : "#47A1FF";
  const statusBg = closed ? "rgba(42,229,0,0.1)" : "rgba(71,161,255,0.1)";
  const statusBorder = closed ? "rgba(42,229,0,0.2)" : "rgba(71,161,255,0.2)";

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#111317", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <XStack
          px={20}
          py={16}
          ai="center"
          jc="space-between"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.08)",
          }}
        >
          <XStack ai="center" gap={12}>
            <MapPin color="#47A1FF" size={22} />
            <YStack>
              <Heading fontSize={18}>Draw Zone</Heading>
              <BodyText fontSize={12} color="$onSurfaceVariant">
                {entityName}
              </BodyText>
            </YStack>
          </XStack>
          <XStack ai="center" gap={12}>
            <TouchableOpacity
              onPress={handleUndo}
              activeOpacity={0.7}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Undo2 color="#8A919D" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClear}
              activeOpacity={0.7}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: "rgba(255,69,58,0.1)",
              }}
            >
              <Trash2 color="#FF453A" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{ padding: 8 }}
            >
              <X color="#8A919D" size={24} />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Status bar */}
        <XStack
          bg={statusBg}
          px={20}
          py={12}
          ai="center"
          gap={10}
          style={{ borderBottomWidth: 1, borderBottomColor: statusBorder }}
        >
          <BodyText fontSize={13} color={statusColor} f={1} fontWeight="700">
            {statusText}
          </BodyText>
          {closed && (
            <TouchableOpacity
              onPress={() => setClosed(false)}
              activeOpacity={0.7}
            >
              <BodyText
                fontSize={12}
                color="$onSurfaceVariant"
                fontWeight="600"
              >
                Edit
              </BodyText>
            </TouchableOpacity>
          )}
        </XStack>

        {/* Saving Overlay */}
        {isSaving && (
          <SanctuaryLoader overlay message="Saving Zone..." />
        )}

        {/* Map */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          mapType="standard"
        >
          {/* Polygon fill */}
          {polygonCoords.length >= 3 && (
            <Polygon
              coordinates={polygonCoords}
              strokeColor={closed ? "#2AE500" : "#47A1FF"}
              fillColor={
                closed ? "rgba(42,229,0,0.12)" : "rgba(71,161,255,0.15)"
              }
              strokeWidth={2.5}
            />
          )}

          {/* First point — green "close target" */}
          {firstCoord && !closed && (
            <Marker
              coordinate={firstCoord}
              pinColor="#2AE500"
              title="Tap here to close"
            />
          )}

          {/* Remaining points — blue */}
          {polygonCoords.slice(1).map((coord, i) => (
            <Marker key={i + 1} coordinate={coord} pinColor="#47A1FF" />
          ))}
        </MapView>

        {/* Save button */}
        <YStack
          px={24}
          py={20}
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving || !closed}
          >
            <YStack
              bg={closed ? "#2AE500" : "#2A2D33"}
              borderRadius={999}
              py={18}
              ai="center"
              opacity={isSaving ? 0.7 : 1}
            >
              {isSaving ? (
                <XStack ai="center" gap={10}>
                  <ActivityIndicator color="#111317" />
                  <BodyText fontWeight="800" color="#111317">
                    Saving...
                  </BodyText>
                </XStack>
              ) : (
                <XStack ai="center" gap={10}>
                  <Check color={closed ? "#111317" : "#8A919D"} size={20} />
                  <BodyText
                    fontWeight="800"
                    color={closed ? "#111317" : "#8A919D"}
                  >
                    {closed ? "Save Zone" : "Close polygon to save"}
                  </BodyText>
                </XStack>
              )}
            </YStack>
          </TouchableOpacity>
        </YStack>
      </View>
    </Modal>
  );
};
