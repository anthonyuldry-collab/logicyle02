# LogiCycle — Spécification Application Mobile

> Document de référence pour la création de l'expérience mobile LogiCycle.  
> Complète le plan stratégique 18 mois face à Ippogee.  
> Version : 1.0 — Juillet 2026

---

## 1. Objectif stratégique

### Pourquoi le mobile est P0

| Constats | Impact |
|----------|--------|
| Ippogee propose **2 apps natives** (coureurs/staff + partenaires) | Table stakes sur le segment Continental / DN |
| Les coureurs et staff consultent l'info **en déplacement** (bus, hôtel, parking) | Le web desktop seul = friction d'adoption |
| LogiCycle a déjà les modules « Mon Espace » (calendrier, nutrition, déplacements, profil) | **80 % du MVP mobile existe côté données** |
| Équipe dev limitée (2–3 personnes) | Pas de double codebase native dès le départ |

### Positionnement mobile vs Ippogee

> **LogiCycle Mobile** = l'app du coureur et du staff terrain, orientée **performance + logistique course**, pas un ERP complet.

| Ippogee Mobile | LogiCycle Mobile (cible) |
|----------------|--------------------------|
| ERP opérationnel (stocks, facturation, GPS flotte) | Consultation + saisie légère terrain |
| App partenaires/sponsors séparée | Phase 3 (hors scope initial) |
| Apps natives iOS + Android | **Phase 1 : PWA** → **Phase 2 : stores** via Capacitor |
| Fermé (enterprise) | Installable, notifications push, offline partiel |

---

## 2. Stratégie technique recommandée (3 phases)

### Phase 0 — Préparation web mobile (S1–S4) · ~3 semaines

**Objectif** : rendre l'app web utilisable sur smartphone sans réécrire le métier.

| Action | Fichiers impactés | Effort |
|--------|-------------------|--------|
| Sidebar responsive (drawer + hamburger) | `App.tsx`, `Sidebar.tsx` | S |
| Supprimer `ml-72` fixe sur mobile | `App.tsx`, CSS global | S |
| Touch targets ≥ 44px, tables scrollables | Sections critiques | M |
| Viewport + safe-area iOS | `index.html` | S |
| Manifest PWA + icônes | `public/manifest.json`, `index.html` | S |
| Service Worker (cache shell) | `vite-plugin-pwa` | S |

**Critère de succès** : un coureur peut consulter son calendrier et ses déplacements sur iPhone/Android sans zoom horizontal.

### Phase 1 — PWA « LogiCycle Terrain » (M1–M3) · ~8 semaines

**Objectif** : app installable, notifications push, périmètre coureur/staff restreint.

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Shell | React existant (Vite) | Réutilise 100 % des services Firebase |
| PWA | `vite-plugin-pwa` + Workbox | Pas de nouveau repo, déploiement Netlify/Firebase Hosting |
| Auth | Firebase Auth (existant) | Lien magique invitations déjà en place |
| Push | Firebase Cloud Messaging (FCM) | Gratuit, intégré à l'écosystème |
| Offline | Cache lecture seule (calendrier, convocations) | Firestore persistence + SW cache |

**Ce qu'on NE fait PAS en Phase 1** :
- Pas de React Native / Flutter séparé
- Pas de refonte des 12 onglets événement manager
- Pas d'app sponsors/partenaires
- Pas d'offline write (conflits Firestore)

### Phase 2 — Stores iOS & Android (M4–M6) · ~6 semaines

**Objectif** : présence App Store / Play Store pour crédibilité commerciale face à Ippogee.

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Wrapper | **Capacitor 6** | Emballe la PWA, accès caméra, push natif, biométrie |
| Code partagé | Monorepo `packages/` (optionnel) | `shared/` = types, services, utils |
| CI/CD | Fastlane ou GitHub Actions | Build IPA/AAB automatisé |

**Alternative écartée** : React Native from scratch → double maintenance, 6+ mois de retard pour 2–3 devs.

### Phase 3 — App Partenaires (M12–M18) · optionnel

Réponse à **Ipogee Partner** : dashboard sponsor lecture seule (budget course, visibilité, documents). Web responsive suffit au départ.

---

## 3. Périmètre fonctionnel par persona

### 3.1 Coureur (MVP Phase 1 — P0)

| Écran | Section web source | Fonctions mobile |
|-------|-------------------|------------------|
| Accueil | `myDashboard` | Prochaine course, statut convocation, rappels |
| Mon Calendrier | `MyCalendarSection` | Courses, dispos, statut sélection |
| Mes Déplacements | `MyTripsSection` | Transport, horaires, adresses (liens Maps) |
| Ma Nutrition | `MyNutritionSection` | Allergies, régime, plan jour (lecture) |
| Mon Profil | `MyProfileSection` | Coordonnées, taille maillot, contacts urgence |
| Convocation | `EventDetailView` (sous-ensemble) | Horaires, lieu départ, radio, checklist perso |
| Notifications | — (nouveau) | Convocation, changement horaire, rappel départ |

**Hors scope mobile coureur** : PPR détaillé, scouting, admin, finances.

### 3.2 Staff terrain (MVP Phase 1 — P1)

| Écran | Section web source | Fonctions mobile |
|-------|-------------------|------------------|
| Mes missions | `StaffSection` / sélections | Courses assignées, rôle |
| Checklist course | `EventChecklistTab` | Cocher items, photo preuve |
| Logistique course | `EventOperationalLogisticsTab` (lecture) | Horaires, contacts, hébergement |
| Disponibilités | `StaffSeasonPlanning` | Déclarer dispo / indispo |
| Marketplace | `MissionSearchSection` | Voir / postuler missions (staff indép.) |

### 3.3 Manager / DS (Phase 2 — P2, consultation)

| Écran | Fonctions |
|-------|-----------|
| Dashboard course du jour | Effectif présent, statuts transport |
| Alertes | Retard, blessure signalée, checklist incomplète |
| Validation rapide | Confirmer présence coureur (1 tap) |

**Hors scope mobile manager** : planning saison complet, budgets, scouting, permissions, 12 onglets admin.

### 3.4 Profil indépendant (MVP Phase 1 — P1)

Réutilise `INDEPENDENT_SECTIONS` :
- Mon Espace (`IndependentSpaceSection`)
- Ma Carrière
- Offres & Missions
- Paramètres (+ RGPD)

---

## 4. Architecture technique

### 4.1 Principe : Mobile = vue filtrée du web

```
┌─────────────────────────────────────────────────────┐
│                   Firebase Backend                   │
│  Auth · Firestore · Storage · FCM · Cloud Functions │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │      services/ (partagés)    │
        │  firebaseService · gdprService│
        │  inviteService · storageService│
        └──────────────┬──────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
┌────▼────┐     ┌──────▼──────┐   ┌─────▼─────┐
│ Web App │     │  PWA Shell  │   │ Capacitor │
│ (full)  │     │ (mobile UX) │   │  wrapper  │
└─────────┘     └─────────────┘   └───────────┘
```

### 4.2 Routage mobile

Introduire un mode `?mobile=1` ou détection `useMediaQuery('(max-width: 768px)')` + flag utilisateur `preferMobileShell`.

```typescript
// Proposition : constants/mobileSections.ts
export const MOBILE_SECTIONS_BY_ROLE: Record<UserRole, AppSection[]> = {
  [UserRole.RIDER]: ['myDashboard', 'myCalendar', 'myTrips', 'nutrition', 'myProfile', 'userSettings'],
  [UserRole.STAFF]: ['myDashboard', 'myCalendar', 'myTrips', 'missionSearch', 'userSettings'],
  [UserRole.MANAGER]: ['myDashboard', 'events', 'myCalendar', 'userSettings'],
};
```

### 4.3 Navigation mobile

Remplacer la sidebar fixe (`w-72 fixed`) par :

| Composant | Description |
|-----------|-------------|
| `MobileHeader` | Logo équipe, titre section, menu |
| `BottomTabBar` | 4–5 onglets max (Accueil, Calendrier, Déplacements, Profil, Plus) |
| `MobileDrawer` | Sections secondaires + logout + switch équipe |

### 4.4 Notifications push (FCM)

| Événement | Destinataire | Déclencheur |
|-----------|--------------|-------------|
| Convocation publiée | Coureur | Cloud Function on `riderEventSelections` update |
| Changement horaire | Coureurs + staff course | `raceEvents` update |
| Rappel J-1 | Coureur | Scheduled Function |
| Mission staff ouverte | Staff indép. | `missions` create |
| Invitation équipe | Email invité | `inviteService` (existant) |

**Stockage token** : `users/{userId}/fcmTokens/{tokenId}`

### 4.5 Offline (lecture seule)

| Donnée | Stratégie |
|--------|-----------|
| Calendrier 30 jours | Firestore `enableIndexedDbPersistence` |
| Dernière convocation | SW cache + localStorage fallback |
| Photos profil | Cache Storage via SW |

Pas d'écriture offline en V1 (éviter conflits multi-appareils).

### 4.6 Sécurité & RGPD

Réutiliser l'existant :
- `gdprService.ts` / `gdprCloudService.ts`
- `GdprSettingsPanel.tsx`
- Consentement push = opt-in explicite (RGPD Art. 6)

---

## 5. Design & UX mobile

### Principes

1. **Thumb zone** : actions principales en bas (tab bar, CTA)
2. **1 écran = 1 intention** (pas de tableaux 12 colonnes)
3. **Progressive disclosure** : détail course en cards empilées, pas 12 onglets
4. **Deep links** : `logicycle://event/{eventId}`, `https://app.logicycle.fr/event/{id}`

### Breakpoints

| Nom | Largeur | Layout |
|-----|---------|--------|
| Mobile | < 768px | Bottom tabs + drawer |
| Tablet | 768–1024px | Sidebar collapsible |
| Desktop | > 1024px | Sidebar fixe actuelle |

### Composants à créer

| Composant | Priorité |
|-----------|----------|
| `MobileShell.tsx` | P0 |
| `BottomTabBar.tsx` | P0 |
| `MobileEventCard.tsx` | P0 |
| `MobileDrawer.tsx` | P0 |
| `PushPermissionPrompt.tsx` | P1 |
| `OfflineBanner.tsx` | P1 |
| `InstallPwaPrompt.tsx` | P1 |

---

## 6. Intégration plan stratégique 18 mois

| Trimestre | Livrable mobile | Lié au plan Ippogee |
|-----------|-----------------|---------------------|
| **T1 (M1–M3)** | PWA coureur + web responsive | Comble l'écart « pas d'app mobile » (P0) |
| **T2 (M4–M6)** | Stores + push + staff checklist | Parité terrain avec Ippogee Cycling |
| **T3 (M7–M9)** | Manager alertes + offline convocations | Différenciation UX (notifications intelligentes) |
| **T4 (M10–M12)** | App partenaires lite (web/PWA) | Réponse partielle à Ipogee Partner |

### Argument commercial post-mobile

> « Même expérience terrain qu'Ippogee pour vos coureurs et staff — plus la performance, la nutrition et le scouting, à 1/10 du prix. »

---

## 7. Estimation effort & coûts

### Effort dev (2 devs)

| Phase | Durée | Charge |
|-------|-------|--------|
| Phase 0 — Responsive | 3 semaines | 1 dev front |
| Phase 1 — PWA MVP coureur | 8 semaines | 1 dev front + 0.25 dev back (FCM) |
| Phase 2 — Capacitor stores | 6 semaines | 1 dev front + config CI |
| **Total MVP stores** | **~5 mois** | — |

### Coûts récurrents additionnels

| Poste | Coût mensuel estimé |
|-------|---------------------|
| Apple Developer Program | ~8 €/mois (99 €/an) |
| Google Play Console | ~2 €/mois (25 € one-shot) |
| FCM | Inclus Firebase |
| Fastlane CI (GitHub Actions) | Gratuit tier |

---

## 8. Critères d'acceptation MVP (Phase 1)

- [ ] Installable sur écran d'accueil iOS Safari + Android Chrome
- [ ] Coureur : calendrier, déplacements, nutrition, profil fonctionnels sans scroll horizontal
- [ ] Auth Firebase + invitation email fonctionnelle sur mobile
- [ ] Push : convocation reçue < 30 s après publication
- [ ] Score Lighthouse PWA ≥ 80 (Performance, PWA, Accessibility)
- [ ] RGPD : opt-in push, export/suppression depuis Paramètres mobile
- [ ] Testé sur iPhone 13+ et Samsung Galaxy A série

---

## 9. Ce qu'on n'essaiera pas de rattraper (et c'est OK)

| Fonction Ippogee | Décision LogiCycle | Raison |
|------------------|-------------------|--------|
| GPS flotte temps réel | ❌ Pas mobile V1–V2 | Coût hardware + APIs, hors cœur métier |
| Scan codes-barres stocks | ❌ Web manager only | Cible DS bureau, pas terrain |
| Formulaires UCI auto | ❌ Hors mobile | Workflow admin desktop |
| Facturation / SEPA | ❌ Hors mobile | Module desktop Phase 2+ |
| App sponsors native | ⏳ Phase 3 web | Marché secondaire vs coureurs |

---

## 10. Structure de fichiers proposée

```
logicycle/
├── public/
│   ├── manifest.json
│   ├── icons/           # 192, 512, maskable
│   └── sw.js            # généré par vite-plugin-pwa
├── components/
│   └── mobile/
│       ├── MobileShell.tsx
│       ├── BottomTabBar.tsx
│       ├── MobileDrawer.tsx
│       ├── MobileHeader.tsx
│       └── InstallPwaPrompt.tsx
├── constants/
│   └── mobileSections.ts
├── hooks/
│   ├── useIsMobile.ts
│   └── usePushNotifications.ts
├── services/
│   └── pushService.ts
└── capacitor/             # Phase 2
    ├── ios/
    └── android/
```

---

## 11. Prompt d'implémentation (Phase 0 + 1)

Copier-coller dans un chat Agent pour démarrer le développement :

```
# Contexte
LogiCycle = React + TypeScript + Vite + Firebase + Tailwind.
L'app a une sidebar fixe (w-72, ml-72) non adaptée au mobile.
Services existants : firebaseService, inviteService, gdprService.
Sections coureur : myDashboard, myCalendar, myTrips, nutrition, myProfile.

# Mission
Implémente la Phase 0 + début Phase 1 du document SPEC_APPLICATION_MOBILE.md :

1. Sidebar responsive : drawer sur mobile (< 768px), sidebar fixe sur desktop
2. MobileShell avec BottomTabBar (4 onglets : Accueil, Calendrier, Déplacements, Profil)
3. Supprimer ml-72 sur mobile, padding adapté
4. manifest.json + vite-plugin-pwa (installable)
5. Constante MOBILE_SECTIONS_BY_ROLE pour filtrer la navigation coureur/staff
6. Hook useIsMobile

# Contraintes
- Ne pas réécrire les sections métier, seulement le shell navigation
- Réutiliser les sections existantes (MyCalendarSection, etc.)
- Match le style Tailwind existant
- FR par défaut, support EN via useTranslations
- Pas de React Native, pas de nouveau backend

# Critère de succès
Un coureur sur iPhone peut se connecter, naviguer entre ses 4 écrans principaux,
et installer l'app sur son écran d'accueil.
```

---

## 12. Prochaines étapes immédiates

| # | Action | Responsable | Délai |
|---|--------|-------------|-------|
| 1 | Valider ce document (périmètre MVP coureur) | Produit | Cette semaine |
| 2 | Lancer Phase 0 (responsive + drawer) | Dev front | S1 |
| 3 | Créer assets icônes PWA (512×512) | Design | S1 |
| 4 | Configurer FCM dans Firebase Console | Dev back | S2 |
| 5 | Test utilisateur 5 coureurs pilotes | Produit | Fin M1 |

---

*Document maintenu par l'équipe LogiCycle. Référence : plan stratégique Ippogee, codebase `constants.ts` (SECTIONS), `App.tsx` (layout).*
