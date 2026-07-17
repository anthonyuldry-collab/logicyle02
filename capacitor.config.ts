import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logicyle.app',
  appName: 'LogiCycle',
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
      backgroundColor: '#1e293b',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'LogiCycle',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'LogiCycle utilise votre position pour partager la localisation du véhicule avec l\'équipe pendant vos trajets.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'LogiCycle continue le suivi GPS en arrière-plan pendant vos trajets, même écran verrouillé, pour la flotte.',
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
