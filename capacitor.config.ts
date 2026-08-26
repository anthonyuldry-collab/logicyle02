import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logicyle.app',
  appName: 'rovik',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B0D10',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'rovik',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'rovik utilise votre position pour partager la localisation du véhicule avec l\'équipe pendant vos trajets.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'rovik continue le suivi GPS en arrière-plan pendant vos trajets, même écran verrouillé, pour la flotte.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    allowMixedContent: false,
    useLegacyBridge: true,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
};

export default config;
