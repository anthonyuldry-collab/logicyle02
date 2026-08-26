# 02 — Marque rovik & noms de domaine

Le brief avocat historique (`business-plan/dossier-avocat-marque-logicycle.md`) concerne **LogiCycle**.  
Le produit s’appelle désormais **rovik**. Toute recherche d’antériorité est **à refaire**.

## Marque (INPI)

| Item | Valeur |
|------|--------|
| Signe | **rovik** (casse logo : minuscules) + monogramme R |
| Classes | **9** (logiciel) · **42** (SaaS) · **35** (gestion commerciale / pub) |
| Territoire M1 | France (INPI) · EUIPO plus tard si pipeline EN |
| Logo | `public/icons/rovik-lockup.png` · `public/icons/rovik-mark.png` |

1. Recherche [INPI](https://data.inpi.fr) + [TMview](https://www.tmdn.org/tmview/) : rovik, Rovik, ROVIK, proches phonétiques.
2. Envoyer le mail [templates/email-avocat.md](./templates/email-avocat.md) (lot A marque).
3. Dépôt si avis OK — **avant** d’annoncer largement le nom.
4. Conserver le certificat PDF dans ce dossier (ne pas committer de secrets).

Ne pas vendre sous un nom que tu ne peux pas défendre.

## Domainés à verrouiller

Liste d’achat : [templates/domaines-a-acheter.csv](./templates/domaines-a-acheter.csv)

Priorité :

1. `rovik.app` (cible produit, comme logicycle.app aujourd’hui)
2. `rovik.com` / `rovik.fr` / `rovik.eu`
3. Typos : `rovick.com`, `rovic.app` si dispo à bas prix

**Prod actuelle** : `logicycle.app` reste live jusqu’à la bascule DNS (fiche 08).  
Les e-mails code (`contact@logicycle.app`) restent valides tant que MX n’est pas migré.

Après achat `rovik.app` : Cloudflare/Netlify DNS → même site, Auth authorized domains Firebase + `ALLOWED_APP_ORIGINS`.
