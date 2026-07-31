# Runbook ops LogiCycle (prod)

Domaine : **https://logicycle.app**  
Firebase : `logicycle01` · région Functions : `europe-west1`  
Netlify : site lié au repo (deploy auto sur `main`)

---

## Smoke après chaque deploy

```bash
./scripts/smoke-production.sh https://logicycle.app
```

Attendu : **9 OK / 0 FAIL** (front, version.json, Stripe checkout dans le bundle, healthz, webhook).

Préflight local (sans réseau) :

```bash
./scripts/preflight-soft-launch.sh
```

---

## Rollback &lt; 15 min

### Front (Netlify)
1. [Netlify](https://app.netlify.com) → site LogiCycle → **Deploys**
2. Ouvrir le dernier deploy **vert** connu
3. **Publish deploy** (instantané)
4. Vérifier : `./scripts/smoke-production.sh`

### Functions (Firebase)
```bash
# Lister les versions / redeploy depuis un commit connu
git checkout <commit-stable>
npx firebase-tools@13 deploy --project logicycle01 \
  --only functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook,functions:healthz \
  --force --non-interactive
git checkout main
```

Qui fait quoi : **fondateur** (Netlify + Firebase login). Pas de second on-call pour le soft-launch.

---

## Backup Firestore

Sans `gcloud` CLI installé localement, activer via Console :

1. [Firebase Console](https://console.firebase.google.com/project/logicycle01/firestore) → **Firestore** → **Import/Export**
2. Créer un bucket GCS dédié (ex. `logicycle01-firestore-backups`) dans le même projet GCP
3. Planifier un **export quotidien** (Cloud Scheduler + `gcloud firestore export`, ou export manuel hebdo soft-launch)
4. **Une fois** : restaurer un export vers une base de test / projet secondaire pour valider la procédure

Restore (référence) :
```bash
gcloud firestore import gs://logicycle01-firestore-backups/<TIMESTAMP> --project=logicycle01
```
⚠️ Restore écrase — uniquement sur base de staging ou incident documenté.

---

## Emails `@logicycle.app` (redirection)

Voir [EMAIL_FORWARDING.md](./EMAIL_FORWARDING.md).  
Aliases attendus : `support@`, `contact@`, `privacy@` → boîte fondateur.

---

## Stripe : TEST → Live

Compte MCP actuel : **TEST** (`environnement de test Logicycle SAS`).

Checklist Live :
1. Dashboard Stripe → activer / basculer **Live** (KYC société)
2. Copier `sk_live_…` + créer webhook Live →  
   `https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook`  
   Events : `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
3. Secrets Firebase :
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY --project logicycle01
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project logicycle01
   ```
4. Recréer les **mêmes** produits/prices en Live → coller les Price IDs dans `functions/.env.logicycle01`
5. Redeploy Functions billing + webhook
6. Smoke + 1 paiement carte réelle (montant minimal, rembourser)

Tant que Live n’est pas activé : rester en TEST (`4242…`).

---

## TVA (décision produit soft-launch)

- **Court terme (société en formation / TEST)** : prix affichés HT, pas de Stripe Tax auto.
- **Post K-bis + assujettissement TVA** : activer **Stripe Tax** + enregistrement(s) UE dans le Dashboard, puis `automatic_tax` côté Checkout.
- Ne pas activer `automatic_tax` sans registration Stripe Tax active (sinon 0 € de taxe collectée en silence).

---

## RGPD ops (soft-launch)

| Action | Où |
|--------|----|
| Export JSON | App → Paramètres → compte / panneau RGPD |
| Purge compte | App → demande suppression (+ Functions `purgeUserData`) |
| Registre traitements | [RGPD_REGISTRE.md](./RGPD_REGISTRE.md) (brouillon) |
| Sous-traitants | Firebase/GCP, Stripe, Netlify, Sentry |

Tester **une fois** sur un compte jetable avant ouverture commerciale.
