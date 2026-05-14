export default {
  expo: {
    name: "BondhuKoi",
    slug: "BondhuKoiApp",
    version: "1.0.0",
    scheme: "bondhukoi",
    newArchEnabled: true,

    // 🔴 Replace with your actual icon/splash paths
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#111317",
    },

    // Required for EAS OTA updates
    runtimeVersion: {
      policy: "appVersion",
    },

    userInterfaceStyle: "automatic",

    ios: {
      bundleIdentifier: "com.omi.bondhukoi",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "BondhuKoi needs your location to check if you're inside your university or circle zones.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "BondhuKoi needs background location to notify your circle when you enter or leave zones.",
        NSLocationAlwaysUsageDescription:
          "BondhuKoi needs background location to notify your circle when you enter or leave zones.",
      },
    },

    android: {
      package: "com.omi.bondhukoi",
      versionCode: 1,
      compileSdkVersion: 35,
      targetSdkVersion: 35,
      buildToolsVersion: "35.0.0",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      config: {
        googleMaps: {
          // ✅ Key is read from .env — never hardcoded here
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
      ],
    },

    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "BondhuKoi needs location access to check when you enter or leave your university or circle zones.",
          isAndroidBackgroundEnabled: true,
        },
      ],
      "expo-web-browser",
    ],
  },
};
