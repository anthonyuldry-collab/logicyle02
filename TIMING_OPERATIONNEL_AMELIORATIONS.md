# Améliorations du Timing Opérationnel

## Résumé des améliorations

Les améliorations apportées au timing opérationnel des événements transforment cet outil en un **guide complet pour le jour J**, permettant de ne plus réfléchir et d'avoir tous les éléments essentiels sous les yeux.

## Fonctionnalités implémentées

### 1. Groupement des départs/arrivées

**Problème résolu :** Quand plusieurs véhicules partent ou arrivent du même endroit à la même heure, ils étaient affichés séparément, créant de la redondance.

**Solution :** Les timings sont maintenant groupés automatiquement quand :
- Plusieurs véhicules partent/arrivent au même endroit
- À la même heure
- Dans la même direction

**Exemple :**
```
Avant :
🚗 Départ ALLER - Minibus 1 (8 places) - Conducteur: Jean Dupont - Passagers: Marie, Pierre, Sophie, etc. - De: Centre d'entraînement
🚗 Départ ALLER - Minibus 2 (8 places) - Conducteur: Paul Martin - Passagers: Julie, Marc, etc. - De: Centre d'entraînement

Après :
🚗 Départ ALLER - Minibus 1 - Conducteur: Jean Dupont - De: Centre d'entraînement
🚗 Départ ALLER - Minibus 2 - Conducteur: Paul Martin - De: Centre d'entraînement

Ou groupé si même heure :
🚗 Départ ALLER - Minibus 1, Minibus 2 - De: Centre d'entraînement
```

### 2. Filtrage intelligent des trajets individuels

**Problème résolu :** Les départs/retours individuels des athlètes (comme les vols d'Axelle) polluaient le timing opérationnel d'équipe, mais il fallait quand même voir les étapes importantes comme les récupérations.

**Solution :** Filtrage intelligent qui distingue les trajets collectifs des étapes individuelles importantes :

#### Critères d'identification des trajets individuels :
- Mode de transport = VOL
- Nombre d'occupants ≤ 1
- Détails contenant "personnel" ou "individuel"

#### Comportement :
- **Timing d'équipe :** 
  - Trajets collectifs : Affichés complètement (départ + arrivée + étapes)
  - Trajets individuels : Seules les étapes importantes sont affichées (ex: "Récupération Axelle à l'aéroport")
- **Back office individuel :** Tous les trajets de la personne sont affichés

#### Exemple d'affichage dans le timing d'équipe :
```
14h30 - 🚗 Départ ALLER - Minibus 1 - De: Centre d'entraînement
15h45 - ✈️ Vol arrive Aéroport CDG - Axelle
16h00 - 👥 Récupération - Minibus 2 - Aéroport CDG - Axelle
```

### 3. Modes d'affichage

Le composant `EventOperationalLogisticsTab` supporte maintenant deux modes :

#### Mode Équipe (par défaut)
```tsx
<EventOperationalLogisticsTab
  event={event}
  updateEvent={updateEvent}
  appState={appState}
  viewMode="team"
/>
```
- Affiche les timings collectifs
- Masque les trajets individuels
- Active le groupement des timings
- Permet l'édition

#### Mode Individuel
```tsx
<EventOperationalLogisticsTab
  event={event}
  updateEvent={updateEvent}
  appState={appState}
  viewMode="individual"
  selectedPersonId="rider-123"
/>
```
- Affiche uniquement les trajets de la personne sélectionnée
- Inclut les trajets individuels (vols, etc.)
- Désactive le groupement
- Mode lecture seule

## Utilisation pratique

### Dans le contexte d'un événement

1. **Timing opérationnel d'équipe :** Utilisé par les directeurs sportifs pour avoir une vue d'ensemble des déplacements collectifs
2. **Back office athlète :** Utilisé dans les profils individuels pour afficher les trajets personnels

### Exemple d'intégration

```tsx
// Dans un composant de profil d'athlète
const RiderProfile = ({ riderId, eventId }) => {
  const event = getEvent(eventId);
  
  return (
    <div>
      <h2>Timing Personnel</h2>
      <EventOperationalLogisticsTab
        event={event}
        updateEvent={() => {}} // Pas d'édition en mode individuel
        appState={appState}
        viewMode="individual"
        selectedPersonId={riderId}
      />
    </div>
  );
};

// Dans l'onglet transport avec synchronisation
const EventTransportSection = ({ event, appState, setEventTransportLegs }) => {
  return (
    <div>
      <EventTransportTab
        event={event}
        appState={appState}
        setEventTransportLegs={setEventTransportLegs}
      />
      
      <EventOperationalLogisticsTab
        event={event}
        updateEvent={updateEvent}
        appState={appState}
        viewMode="team"
        setEventTransportLegs={setEventTransportLegs} // Synchronisation activée
      />
    </div>
  );
};
```

### 4. Simplification de l'affichage

**Problème résolu :** Les descriptions des timings étaient trop verbeuses avec la liste complète des passagers.

**Solution :** Affichage simplifié qui se concentre sur l'essentiel :
- Nom du véhicule et conducteur (sans le nombre de places)
- Lieu de départ/arrivée
- Suppression de la liste des passagers (ils savent déjà dans quel véhicule ils sont)

### 5. Synchronisation bidirectionnelle avec arrondissement automatique

**Problème résolu :** Les modifications d'horaires dans le timing opérationnel ne se répercutaient pas sur les trajets de transport correspondants.

**Solution :** Synchronisation automatique avec arrondissement intelligent :
- Quand vous modifiez une heure dans le timing opérationnel, elle se répercute automatiquement sur le trajet de transport correspondant
- Les heures sont automatiquement arrondies au quart d'heure le plus proche (0, 15, 30, 45 minutes)
- Indication visuelle (⏰) pour les timings modifiés et arrondis
- Synchronisation bidirectionnelle : timing ↔ trajet de transport

**Exemple :**
```
Vous tapez "14h37" dans le timing → Automatiquement arrondi à "14h30" et synchronisé avec le trajet
```

### 6. Affichage des étapes individuelles importantes

**Problème résolu :** Les récupérations/déposes d'athlètes individuels (comme Axelle, Léonie, Anaïs) n'étaient pas visibles dans le timing opérationnel d'équipe.

**Solution :** Affichage sélectif des étapes importantes :
- Les départs/arrivées des trajets individuels sont masqués du timing d'équipe
- Mais les étapes de récupération/dépose sont affichées avec les noms des personnes
- Permet de voir quand récupérer chaque athlète sans polluer le timing

**Exemple concret :**
```
Timing d'équipe affiche :
14h30 - 🚗 Départ ALLER - Minibus 1 - De: Centre d'entraînement → Hôtel
15h45 - ✈️ Vol arrive Aéroport CDG - Axelle
16h00 - 👥 Récupération - Minibus 2 - Aéroport CDG - Axelle
17h30 - 👥 Récupération - Minibus 1 - Gare SNCF - Léonie
18h00 - 🏁 Arrivée ALLER - Minibus 1 - À: Hôtel
```

### 7. Guide complet pour le jour J

**Objectif :** Le timing opérationnel doit servir de guide complet pour ne plus réfléchir le jour J.

**Solution :** Génération automatique de tous les éléments essentiels :

#### Événements de course automatiquement ajoutés :
- 📋 **Permanence** (si définie)
- 👥 **Réunion Directeurs Sportifs** (si définie)
- 🎤 **Présentation des équipes** (si définie)
- 📍 **Arrivée sur site** (30min avant présentation)
- 🚩 **Départ Fictif** (si défini)
- 🏁 **Départ Réel** (si défini)
- 🏆 **Arrivée Prévue** (si définie)

#### Repas automatiquement calculés :
- 🥐 **Petit-déjeuner** (1h30 avant départ hôtel)
- 🍽️ **Repas** (3h avant départ réel)
- 🍽️ **Dîner** (19h30 le soir d'arrivée)

#### Transports simplifiés :
- 🚗 **Départs** : "Départ des véhicules ([véhicules])" (groupés par heure, sauf véhicules personnels)
- 🏁 **Arrivées** : "Arrivée des véhicules à [lieu] ([véhicules])" (groupés par heure et lieu, y compris noms des personnes en véhicule personnel)
- 🏨 **Départ Hôtel** (calculé selon temps de trajet)
- 🚴 **Départ à vélo** (optionnel, ajouté manuellement)
- 👥 **Récupérations** : "[Lieu] - Récupération [personne] par [véhicule]"

#### Exemple de timing complet pour le jour J :
```
07h00 - 🥐 Petit-déjeuner
08h30 - 🏨 Départ Hôtel
08h45 - 🚴 Départ à vélo de l'hôtel
09h00 - 📍 Arrivée sur site
09h30 - 🎤 Présentation des équipes
10h00 - 🍽️ Repas
13h00 - 🏁 Départ Réel
13h30 - Départ des véhicules (Minibus 1)
15h45 - ✈️ Vol arrive Aéroport CDG - Axelle
16h00 - Aéroport CDG - Récupération Axelle par Kia Ceed
18h00 - Arrivée des véhicules à Hôtel (Minibus 1, Aurore)
19h30 - 🍽️ Dîner
```

#### Exemple pour Paris-Bourges :
```
14h30 - Départ des véhicules (Kia Ceed, Camping-car, Camion)
15h45 - ✈️ Vol arrive Aéroport CDG - Axelle
16h00 - Aéroport CDG - Récupération Axelle par Kia Ceed
18h00 - Arrivée des véhicules à Belleville sur Loire (Kia Ceed, Camping-car, Camion, Gladys)
```

#### Exemple d'utilisation des nouvelles fonctionnalités :
**Pour Paris-Bourges, on peut :**
1. **Supprimer** le petit-déjeuner auto-généré (pas nécessaire)
2. **Garder** le repas 3h avant le départ réel (toujours généré automatiquement)
3. **Ajouter** un timing "⏰ Réveil" à 6h30
4. **Ajouter** un "📋 Briefing" à 7h00
5. **Ajouter** un timing libre "🏃 Échauffement" à 7h30
6. **Ajouter** un "🚴 Départ à vélo" à 8h45 (si échauffement à vélo souhaité)

**Résultat personnalisé :**
```
06h30 - ⏰ Réveil
07h00 - 📋 Briefing
07h30 - 🏃 Échauffement
08h30 - 🏨 Départ Hôtel
09h00 - 📍 Arrivée sur site
09h30 - 🎤 Présentation des équipes
10h00 - 🍽️ Repas (3h avant départ réel - automatique)
13h00 - 🏁 Départ Réel
```

**Note importante :** Le repas 3h avant le départ réel est **toujours généré automatiquement** et ne peut pas être supprimé, car il est essentiel pour la performance des athlètes.

## Nouvelles fonctionnalités

### ✅ Suppression de timings
- **Tous les timings peuvent être supprimés** (auto-générés ou manuels)
- Bouton de suppression (🗑️) disponible pour chaque ligne
- Permet de retirer les timings non nécessaires (ex: petit-déjeuner pour Paris-Bourges)
- **Suppression définitive** : Les timings auto-générés supprimés ne sont plus recréés automatiquement
- **Restauration possible** : Bouton "Restaurer tous" pour remettre les timings auto-générés supprimés

### ✅ Sélection par jour
- **Bouton "Sélectionner"** pour chaque jour (Aller, Jour J, Retour)
- **Bouton "Vider"** pour supprimer tous les timings d'un jour
- **Indicateur visuel** : Le jour sélectionné est mis en surbrillance
- **Gestion facilitée** : Sélection/désélection rapide par jour

### ✅ Gestion flexible des passagers
- **Assignation multiple** : Une personne peut être assignée à plusieurs transports
- **Désélection libre** : Possibilité de retirer une personne d'un transport pour l'assigner ailleurs
- **Indicateurs visuels** : Avertissement ⚠️ pour les personnes assignées ailleurs
- **Tooltip informatif** : Survoler l'avertissement pour voir tous les transports où la personne est assignée
- **Flexibilité totale** : Plus de restriction d'assignation unique

### ✅ Timings prédéfinis
- **Menu déroulant** avec timings courants :
  - ⏰ **Réveil** - Pour définir l'heure de réveil
  - 🥐 **Petit-déjeuner** - Repas du matin
  - 🍽️ **Déjeuner** - Repas de midi
  - 🍽️ **Dîner** - Repas du soir
  - 📋 **Briefing** - Réunion d'équipe
  - 👥 **Réunion** - Réunion générale
  - 💆 **Massage** - Séance de massage
  - 🚴 **Départ à vélo** - Échauffement à vélo (optionnel)

### ✅ Timings libres
- **Bouton "Timing Libre"** pour créer des timings personnalisés
- Description et catégorie entièrement personnalisables

## Avantages

1. **Guide complet pour le jour J :** Tous les éléments essentiels sont automatiquement générés
2. **Zéro réflexion requise :** Le timing contient tout ce qu'il faut savoir
3. **Lisibilité améliorée :** Moins de redondance et d'informations superflues
4. **Contexte approprié :** Chaque vue affiche les informations pertinentes
5. **Flexibilité :** Même composant pour différents usages
6. **Maintenance :** Logique centralisée et réutilisable
7. **Simplicité :** Affichage épuré et facile à scanner rapidement
8. **Cohérence :** Synchronisation automatique entre timing et trajets
9. **Précision :** Arrondissement automatique pour des horaires pratiques
10. **Automatisation :** Calculs automatiques des repas et déplacements
11. **Personnalisation facile :** Timings prédéfinis + timings libres pour s'adapter à tous les événements

## Notes techniques

- Les modifications sont rétrocompatibles
- Le mode par défaut reste "team" pour ne pas casser l'existant
- La logique de groupement est désactivée en mode individuel pour plus de clarté
- Les trajets individuels sont toujours visibles dans les convocations personnelles
