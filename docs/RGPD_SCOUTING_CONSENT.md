# Consentement scouting — preuve & procédure (RGPD)

> Aligné sur [RGPD_REGISTRE.md](./RGPD_REGISTRE.md) finalité **#8**.  
> Watchlist (intérêt légitime) : [RGPD_WATCHLIST_LIA.md](./RGPD_WATCHLIST_LIA.md)  
> Version : **2026-08-01**

## Principe produit

LogiCycle ne partage les données d’un athlète avec une équipe tierce **que** si :

1. l’équipe envoie une **demande de contact** (`ProspectLevel.CONTACT_REQUEST`) avec des scopes demandés ;
2. l’athlète **lit la notice éclairée**, coche l’accusé, et **accepte** un ou plusieurs scopes in-app ;
3. l’accès équipe est limité aux `grantedScopes` tant que le consentement n’est pas retiré ;
4. **aucune donnée art. 9** (santé, allergies, médical), n° sécu ou contact d’urgence n’est incluse dans les scopes.

Le **suivi discret** (`WATCHLIST`) reste interne à l’équipe demandeuse — voir LIA.

## Capacité à consentir (mineurs)

| Situation | Règle produit |
|-----------|---------------|
| Âge ≥ 18 | Consentement athlète OK |
| Âge < 18 + `parentalConsentAcceptedAt` | Consentement OK (autorisation parentale signup) |
| Âge < 18 sans parental / âge inconnue | **Blocage** acceptation + message in-app / privacy@ |

## Flux technique (preuve)

Collection Firestore : `scoutingRequests/{requestId}`

| Champ | Rôle preuve |
|-------|-------------|
| `athleteId` | Personne concernée (UID Auth) |
| `requesterTeamId` | Destinataire du partage |
| `prospectLevel` | `CONTACT_REQUEST` vs `WATCHLIST` |
| `requestedScopes` / `grantedScopes` | Demande / acceptation |
| `status` | `En attente` → `Accepté` / `Refusé` / `Retiré` |
| `requestDate` / `responseDate` | Horodatages |
| `consentRecordedAt` | Horodatage acceptation |
| `consentPrivacyVersion` | Pack privacy (= `LEGAL_VERSIONS.PRIVACY_POLICY_VERSION`) |
| `consentNoticeVersion` | Version notice scouting |
| `consentNoticeSnapshot` | Texte exact montré (finalité, exclusions art. 9, retrait, contact) |
| `consentLocale` | `fr` / `en` |
| `consentMethod` | `in_app_scope_selection` |
| `consentNoticeAcknowledged` | `true` (checkbox) |
| `consentWithdrawnAt` / `consentWithdrawnBy` | Retrait |

Journal : `gdprAuditLogs` actions `scouting_consent_accepted` / `rejected` / `withdrawn`.

## Modalités du consentement (art. 7)

| Critère | Mise en œuvre |
|---------|----------------|
| Libre | Accepter / refuser ; scopes désélectionnables ; pas de conditionnement du compte |
| Spécifique | Scopes nommés ; exclusions art. 9 explicites |
| Éclairé | Notice in-app (destinataire, finalité, durée preuve, retrait, privacy) + checkbox |
| Univoque | « Accepter la sélection » après ack notice |
| Preuve | Document Firestore + snapshot + audit log + export JSON |
| Retrait | Bouton « Retirer mon consentement » |

## Droit de retrait

1. **In-app** → statut `Retiré`, scopes vidés, accès coupé, preuve conservée.  
2. **Email** privacy@logicycle.app — cible **72 h** ouvrées.

## Export

Export utilisateur (art. 20) inclut `scoutingRequests` où `athleteId` = utilisateur.

## Checklist ops

- [ ] Accepter 1 scope → champs preuve + `consentNoticeSnapshot` en Firestore
- [ ] Mineur sans parental → acceptation bloquée
- [ ] Import talent → pas de santé / sécu / urgences dans le profil scouting
- [ ] Retrait → accès coupé
- [ ] Export JSON contient le bloc scouting
- [ ] Rules Firestore redéployées (`gdprAuditLogs` create client limité)

## Références code

| Fichier | Rôle |
|---------|------|
| `utils/scoutingProspectUtils.ts` | Notice, preuve, mineurs, profil public |
| `components/ScoutingRequestResponseCard.tsx` | UI consentement éclairé |
| `services/firebaseService.ts` | Persistance + garde-fou mineur |
| `services/gdprService.ts` | Export + audit log |
| `firebase/firestore.rules` | Champs preuve + audit create |
| `legal/privacy.ts` · `legal/cgu.ts` | Mentions publiques |
