# Watchlist scouting — test d’intérêt légitime (LIA)

> Document **interne** art. 6.1.f RGPD.  
> Version : **2026-08-01** · Lié à [RGPD_REGISTRE.md](./RGPD_REGISTRE.md) finalité #9 · [RGPD_SCOUTING_CONSENT.md](./RGPD_SCOUTING_CONSENT.md)

## Traitement concerné

**Suivi discret (watchlist)** : une Équipe ajoute un athlète déjà visible / recherchable sur LogiCycle dans un carnet de prospects **interne**, sans notifier l’athlète et **sans** lui partager de données supplémentaires.

Ce n’est **pas** un partage inter-équipes. Le partage de données scopées vers une équipe tierce relève exclusivement du consentement (demande de contact).

## Finalité

Permettre à une Équipe de noter un intérêt de recrutement / suivi sur des profils publics de la plateforme, dans le cadre de son activité sportive légitime.

## Nécessité

Sans carnet interne, l’équipe devrait exporter ou recopier hors plateforme des profils déjà visibles — plus risqué. La watchlist limite le traitement au strict besoin opérationnel côté équipe.

## Intérêts en présence

| Partie | Intérêt |
|--------|---------|
| Équipe (Client) | Recrutement efficace, organisation interne |
| Athlète | Contrôle de son image / données ; pas de spam de contact non sollicité via ce canal |
| LogiCycle | Fourniture d’un outil de recrutement loyal, distinct du partage consenti |

## Mesures de minimisation / garanties

- Uniquement profils **déjà visibles** (`isSearchable` / recherche talents) ou saisie manuelle hors plateforme par l’équipe
- **Pas** de notification athlète (évite pression sociale)
- **Pas** de copie automatique de données art. 9 (santé, allergies), n° sécu, contacts d’urgence
- Accès limité aux membres autorisés de l’équipe (règles Firestore / rôles)
- Distinction produit claire vs demande de contact (consentement)
- Droit d’opposition : privacy@logicycle.app · possibilité de désactiver la visibilité recherche

## Balancing (conclusion)

Le traitement est **proportionné** : intérêt légitime de l’équipe à organiser son recrutement interne, sur données déjà exposées volontairement, sans transfert vers des tiers hors équipe, avec exclusion des données sensibles et alternative consentie pour tout partage élargi.

**Risque résiduel** : sentiment de « surveillance » — atténué par l’absence de notification intrusive et la maîtrise de la visibilité par l’athlète.

À faire valider / amender par avocat RGPD avant scale commercial.
