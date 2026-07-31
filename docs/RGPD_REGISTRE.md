# Registre des traitements — brouillon LogiCycle (RGPD art. 30)

> Document **interne**, non exhaustif. À valider avec un avocat / DPO avant ouverture commerciale large.  
> Version : 2026-07-31 · Responsable : Anthony Uldry (président / fondateur)

## Responsable de traitement

- **Nom commercial** : LogiCycle  
- **Statut** : SASU en cours de constitution (mettre à jour post K-bis)  
- **Contact** : privacy@logicycle.app · contact@logicycle.app  
- **Site** : https://logicycle.app  

## Finalités & bases légales

| # | Finalité | Catégories de données | Base légale | Durée indicative |
|---|----------|----------------------|-------------|------------------|
| 1 | Compte utilisateur & auth | Identité, email, auth Firebase | Contrat / mesures précontractuelles | Durée compte + purge ~30 j |
| 2 | SaaS équipe (roster, logistique, events) | Données pro cyclisme, trajets, hébergements | Contrat | Durée abonnement + export/purge |
| 3 | Facturation & abonnements | Données client Stripe, plans | Contrat + obligation légale (compta) | Délais légaux comptables |
| 4 | Support | Emails, tickets | Intérêt légitime / contrat | Durée traitement + 1–2 ans support |
| 5 | Sécurité & logs | IP, device, diagnostics | Intérêt légitime | Rétention logs courte (fournisseur) |
| 6 | Marketplace matching (sans paiement plateforme) | Profils / annonces | Contrat / intérêt légitime | Durée publication + compte |
| 7 | Observabilité (Sentry) | Erreurs techniques (sans email user si configuré) | Intérêt légitime | Selon rétention Sentry |

## Destinataires / sous-traitants

| Sous-traitant | Rôle | Localisation / transfert |
|---------------|------|--------------------------|
| Google Cloud / Firebase | Hébergement, Auth, Firestore, Functions | UE / transferts CCT / DPF |
| Stripe | Paiements | UE / US (Stripe) |
| Netlify | Front CDN | Selon plan Netlify |
| Sentry | Erreurs client | Selon région projet |
| ImprovMX (ou équivalent) | Redirection email | Selon fournisseur |

## Droits des personnes

Exercice via **privacy@logicycle.app** ou in-app (export JSON / demande de suppression).  
Réclamation : CNIL (France).

## Mesures de sécurité (résumé)

TLS, contrôle d’accès par rôles, cloisonnement par équipe, secrets Functions, backups Firestore (à planifier), procédures incident.

## Mises à jour

| Date | Changement |
|------|------------|
| 2026-07-31 | Création brouillon soft-launch |
