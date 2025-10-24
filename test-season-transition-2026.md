# Test de Transition de Saison vers 2026

## Objectif
Tester le basculement complet sur 2026 avec :
- Remise à zéro des jours de staff
- Remise à zéro des jours de course pour les coureurs
- Configuration de la projection de performance 2026
- Configuration du calendrier 2026

## Fonctionnalités Implémentées

### 1. Utilitaires de Transition (`utils/seasonTransitionUtils.ts`)
- ✅ `resetRiderRaceDays()` - Remet à zéro les jours de course des coureurs
- ✅ `resetStaffDays()` - Remet à zéro les jours de staff
- ✅ `filterEventsFor2026()` - Filtre les événements pour 2026+
- ✅ `filterPerformanceEntriesFor2026()` - Filtre les performances pour 2026+
- ✅ `performSeasonTransitionTo2026()` - Transition complète
- ✅ `isTransitionTo2026Needed()` - Vérifie si la transition est nécessaire
- ✅ `getTransitionConfirmationMessage()` - Message de confirmation

### 2. Gestionnaire de Transition (`components/SeasonTransitionManager.tsx`)
- ✅ Interface utilisateur pour la transition
- ✅ Confirmation avant transition
- ✅ Barre de progression
- ✅ Gestion des erreurs
- ✅ Sauvegarde automatique des données

### 3. Intégration dans l'Application (`App.tsx`)
- ✅ Import du gestionnaire de transition
- ✅ Fonction `handleSeasonTransitionComplete()`
- ✅ Intégration dans la section `myDashboard`
- ✅ Props passées au gestionnaire

### 4. Configuration des Utilitaires
- ✅ `seasonUtils.ts` - Force 2026 comme année de planification
- ✅ `dateUtils.ts` - Inclut 2026 dans les événements futurs
- ✅ `CalendarTab.tsx` - Utilise déjà `isFutureEvent` mis à jour

## Comment Tester

### 1. Accès à la Transition
1. Se connecter à l'application
2. Aller sur le tableau de bord principal (`myDashboard`)
3. Le gestionnaire de transition devrait apparaître en haut de la page

### 2. Processus de Transition
1. Cliquer sur "Effectuer la transition vers 2026"
2. Lire le message de confirmation
3. Cliquer sur "Confirmer la transition"
4. Observer la barre de progression
5. Vérifier que les données sont mises à jour

### 3. Vérifications Post-Transition
1. **Coureurs** : Vérifier que `raceDays = 0`
2. **Staff** : Vérifier que `totalDaysWorked = 0`
3. **Événements** : Seuls les événements 2026+ sont conservés
4. **Performances** : Seules les performances 2026+ sont conservées
5. **Calendrier** : Affiche les événements 2026+
6. **Projets de performance** : Réinitialisés pour 2026

## Données Testées

### Coureurs
- `raceDays` → 0
- `seasonObjectives` → Réinitialisé
- `globalWishes` → Réinitialisé
- `performanceGoals` → Réinitialisé
- `physiquePerformanceProject` → Réinitialisé
- `techniquePerformanceProject` → Réinitialisé
- `mentalPerformanceProject` → Réinitialisé
- `environnementPerformanceProject` → Réinitialisé
- `tactiquePerformanceProject` → Réinitialisé

### Staff
- `totalDaysWorked` → 0
- `availability` → []
- `performanceNotes` → ""

### Événements
- Seuls les événements avec `date >= 2026-01-01` sont conservés

### Performances
- Seules les entrées avec `date >= 2026-01-01` sont conservées

## Notes Importantes

1. **Irréversible** : La transition ne peut pas être annulée
2. **Sauvegarde automatique** : Toutes les données sont sauvegardées en Firebase
3. **Progression** : Le processus est divisé en étapes avec barre de progression
4. **Gestion d'erreurs** : Les erreurs sont affichées à l'utilisateur
5. **Confirmation** : Double confirmation avant exécution

## Statut
✅ **TERMINÉ** - Toutes les fonctionnalités sont implémentées et prêtes à être testées.

