# GPS natif Capacitor (App Store / Play Store)

Suivi GPS chauffeur en **arrière-plan** via `@capacitor-community/background-geolocation`, équivalent natif Ippogee pour la flotte mobile.

## Prérequis

- Node 18+
- Xcode (iOS) / Android Studio (Android)
- Compte développeur Apple & Google Play

## Installation des projets natifs

```bash
npm run build
npx cap add ios      # une seule fois
npx cap add android  # une seule fois
npm run cap:sync
```

Les permissions sont injectées via `capacitor.config.ts` :

- **iOS** : `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location`
- **Android** : `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`
- **Android** : `useLegacyBridge: true` (évite l’arrêt du suivi après 5 min)

## Android — notification de suivi

Personnaliser les strings dans `android/app/src/main/res/values/strings.xml` :

```xml
<string name="capacitor_background_geolocation_notification_channel_name">Suivi flotte LogiCycle</string>
```

## Cloud Function (obligatoire en production)

Déployer la fonction sécurisée :

```bash
cd functions && npm install
firebase deploy --only functions:recordDriverGpsPosition
```

La fonction valide :

- Auth Firebase (chauffeur = `staffId === auth.uid`)
- Appartenance à l’équipe
- Assignation véhicule (fiche ou trajet du jour)

En arrière-plan Android, l’envoi utilise **CapacitorHttp** (évite le throttling WebView).

## Test chauffeur

1. Build + sync Capacitor
2. Ouvrir l’app sur device réel (pas simulateur pour GPS fiable)
3. **Mes trajets** → **Activer le suivi GPS**
4. Verrouiller l’écran : la notification Android / barre bleue iOS confirme le suivi actif
5. Vérifier la carte flotte (Véhicules › GPS)

## Stores — mentions App Review

- **iOS** : justifier « Always » location dans App Store Connect (suivi flotte professionnelle, arrêt manuel)
- **Android** : déclarer `FOREGROUND_SERVICE_LOCATION` dans le formulaire Play Console
- RGPD : consentement explicite chauffeur, arrêt en un clic

## Architecture

| Couche | Fichier |
|--------|---------|
| UI chauffeur | `components/DriverGpsSharePanel.tsx` |
| Tracking natif/web | `services/gpsTrackingService.ts` |
| Envoi sécurisé | `services/driverGpsCloudService.ts` |
| Cloud Function | `functions/src/index.js` → `recordDriverGpsPosition` |
| Config Capacitor | `capacitor.config.ts` |

## PWA vs native

| Mode | Comportement |
|------|--------------|
| PWA / navigateur | `navigator.geolocation` — foreground uniquement |
| App Capacitor | Background natif + notification persistante |
