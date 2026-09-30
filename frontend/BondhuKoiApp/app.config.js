const LOCATION_WHY =
  'BondhuKoi checks whether you are inside your campus or your circles’ zones, so the friends you choose can see “On campus”. Your exact location is never stored or shown to anyone.';

export default {
  expo: {
    name: 'BondhuKoi',
    slug: 'bondhukoi',
    scheme: 'bondhukoi',
    version: '1.0.0',
    runtimeVersion: { policy: 'appVersion' },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F8FAFC',
      dark: { backgroundColor: '#0B1220' },
    },
    ios: {
      bundleIdentifier: 'com.omi.bondhukoi',
      supportsTablet: false,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: LOCATION_WHY,
        NSLocationAlwaysAndWhenInUseUsageDescription: LOCATION_WHY,
        NSCameraUsageDescription: 'Scan a friend’s BondhuKoi QR code to add them.',
        NSPhotoLibraryUsageDescription: 'Choose a profile photo.',
        UIBackgroundModes: ['location'],
      },
    },
    android: {
      package: 'com.omi.bondhukoi',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      config: {
        // Restricted in Google Cloud to this package and the signing certificate.
        googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'POST_NOTIFICATIONS',
        'CAMERA',
      ],
      blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.READ_CONTACTS'],
      allowBackup: false,
    },
    web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: LOCATION_WHY,
          locationWhenInUsePermission: LOCATION_WHY,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: false,
        },
      ],
      ['expo-notifications', { color: '#C2410C' }],
      ['expo-camera', { cameraPermission: 'Scan a friend’s BondhuKoi QR code to add them.', recordAudioAndroid: false }],
      ['expo-image-picker', { photosPermission: 'Choose a profile photo.', cameraPermission: false, microphonePermission: false }],
      ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#F8FAFC', dark: { backgroundColor: '#0B1220' } }],
    ],
    experiments: { typedRoutes: false },
    extra: {
      eas: { projectId: process.env.EAS_PROJECT_ID },
    },
  },
};
