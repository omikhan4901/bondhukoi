import { Platform, Linking, Alert } from 'react-native';

/**
 * Android: Prompt user to disable battery optimization for the app
 * This is critical for background tasks like Geofencing to remain active.
 */
export const requestIgnoreBatteryOptimizations = async () => {
  if (Platform.OS !== 'android') return;

  Alert.alert(
    "Improve Reliability",
    "To ensure your 'Circle Status' updates correctly in the background, please set Bondhu Koi to 'Unrestricted' in battery settings.",
    [
      { text: "Later", style: "cancel" },
      { 
        text: "Open Settings", 
        onPress: async () => {
          try {
            // Lazy load the native module to avoid top-level crashes if sync'd before rebuild
            const IntentLauncher = require('expo-intent-launcher');
            
            if (IntentLauncher && IntentLauncher.startActivityAsync) {
              await IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
              );
            } else {
              Linking.openSettings();
            }
          } catch (err) {
            console.warn('[PermissionUtils] IntentLauncher failed/missing:', err.message);
            Linking.openSettings();
          }
        }
      }
    ]
  );
};
