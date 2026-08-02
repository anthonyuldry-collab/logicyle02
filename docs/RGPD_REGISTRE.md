# Registre des traitements — LogiCycle (RGPD art. 30)

> Document **interne**. À valider avec un avocat / DPO avant ouverture commerciale large.  
> Version : **2026-08-01** · Responsable : Anthony Uldry (président / fondateur)  
> Consentement scouting : [RGPD_SCOUTING_CONSENT.md](./RGPD_SCOUTING_CONSENT.md)

## Responsable de traitement

| Champ | Valeur |
|-------|--------|
| Nom commercial | LogiCycle |
| Statut | SASU en cours de constitution (mettre à jour post K-bis) |
| Contact privacy / DPO | privacy@logicycle.app |
| Contact général | contact@logicycle.app |
| Site | https://logicycle.app |

### Double rôle (rappel)

| Qualité | Périmètre |
|---------|-----------|
| **Responsable** | Compte utilisateur, auth, facturation SaaS, sécurité plateforme, scouting marketplace (demandes / consentements) |
| **Sous-traitant** (art. 28) | Données métier configurées par l’Équipe cliente (roster, perf., logistique…) — voir DPA `legal/dpa.ts` |

## Finalités & bases légales

| # | Finalité | Catégories de données | Base légale | Durée indicative |
|---|----------|----------------------|-------------|------------------|
| 1 | Compte utilisateur & auth | Identité, email, auth Firebase, logs consentement CGU/privacy | Contrat / mesures précontractuelles | Durée compte + purge ~30 j |
| 2 | SaaS équipe (roster, logistique, events) | Données pro cyclisme, trajets, hébergements | Contrat (Client = RT pour données métier) | Durée abo + export/purge |
| 3 | Facturation & abonnements | Données client Stripe, plans | Contrat + obligation légale (compta) | Délais légaux comptables |
| **3bis** | **ERP lean équipe (devis / factures / SEPA)** | IBAN/BIC/ICS équipe (`privateConfig/sepa`), IBAN/BIC/mandats clients, lots pain.001/008 | Contrat + obligation légale (compta / prélèvements) ; accès restreint managers & finance | Durée relation client + délais comptables ; pas de log IBAN en clair |
| 4 | Support | Emails, tickets | Intérêt légitime / contrat | Traitement + 1–2 ans |
| 5 | Sécurité & logs | IP, device, diagnostics | Intérêt légitime | Rétention courte (fournisseur) |
| 6 | Marketplace matching (sans paiement plateforme) | Profils / annonces | Contrat / intérêt légitime | Durée publication + compte |
| **6bis** | **Marketplace missions — paiements Connect** *(activé uniquement si flags TEST/prod)* | Compte Connect vacataire (`stripeConnectAccountId`), montants mission, commission, IDs Stripe | Contrat (exécution mission) | Durée relation + délais comptables |
| 7 | Observabilité (Sentry) | Erreurs techniques | Intérêt légitime | Selon rétention Sentry |
| **8** | **Scouting inter-équipes (demande de contact)** | Identité athlète, équipe demandeuse, scopes demandés/accordés, horodatages, version privacy | **Consentement** (art. 6.1.a) — scopes granulaires | Durée du consentement + preuve 3 ans après retrait / fin de relation |
| **9** | **Scouting — suivi discret (watchlist équipe)** | Notes internes équipe, lien profil public limité | Intérêt légitime du Client (RT) / contrat — [RGPD_WATCHLIST_LIA.md](./RGPD_WATCHLIST_LIA.md) ; **pas de partage** vers l’athlète | Durée gestion prospect côté équipe |
| 10 | Export / purge (droits personnes) | Snapshot JSON, journal `gdprAuditLogs` | Obligation légale (art. 15–20) | Journal audit : 3 ans |

## Scouting — détail (finalité 8)

- **Qui consent** : l’athlète (compte utilisateur), via sélection in-app des scopes.
- **Scopes** : `coordination` · `performance_data` · `performance_project` (voir `ScoutingDataScope`).
- **Preuve** : document Firestore `scoutingRequests/{id}` (voir [RGPD_SCOUTING_CONSENT.md](./RGPD_SCOUTING_CONSENT.md)).
- **Retrait** : in-app (statut `Retiré`) ou demande à privacy@logicycle.app — effet immédiat sur l’accès équipe.
- **Watchlist** : ne constitue **pas** un partage de données vers un tiers hors équipe ; l’athlète n’est pas notifié.

## Destinataires / sous-traitants

| Sous-traitant | Rôle | Localisation / transfert | DPA / garanties |
|---------------|------|--------------------------|-----------------|
| Google Cloud / Firebase | Hébergement, Auth, Firestore, Functions, Storage | UE (Functions `europe-west1`) / transferts CCT ou DPF Google | DPA Google Cloud |
| Stripe | Paiements abonnements (+ Connect marketplace missions si flags activés) | UE / US (Stripe) | DPA Stripe |
| Netlify | Front CDN / hébergement static | Selon plan Netlify | DPA Netlify |
| Sentry | Erreurs client (si DSN activé) | Selon région projet | DPA Sentry |
| ImprovMX (ou équivalent) | Redirection email `@logicycle.app` | Selon fournisseur | Contrat fournisseur |

Pas de revente de données. Accès staff LogiCycle limité au support / sécurité / super-admin.

## Droits des personnes

| Droit | Canal |
|-------|--------|
| Accès / portabilité | In-app (Paramètres RGPD → export JSON) ou privacy@logicycle.app |
| Effacement | In-app (purge compte) ou privacy@ · délai cible **30 jours** |
| Rectification | In-app profil / privacy@ |
| Opposition / retrait consentement scouting | In-app (retrait scopes) ou privacy@ |
| Réclamation | CNIL (France) |

Procédure ops export/purge : [OPS_RUNBOOK.md](./OPS_RUNBOOK.md) § RGPD.

## Mesures de sécurité (résumé)

TLS, Auth Firebase, règles Firestore par rôle / équipe, cloisonnement `teams/{id}`, secrets Functions, journal d’audit RGPD, backups Firestore (à planifier — voir runbook), procédures incident.

## Mises à jour

| Date | Changement |
|------|------------|
| 2026-07-31 | Création brouillon soft-launch |
| 2026-08-01 | Finalités scouting (consentement + watchlist) · sous-traitants détaillés · lien procédure consent |
| 2026-08-01 | Preuve art. 7 renforcée (snapshot notice) · mineurs · exclusion art. 9 · LIA watchlist · versions pack alignées |
