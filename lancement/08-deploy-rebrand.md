# 08 — Déployer le rebrand rovik en production

Le code local affiche **rovik**. La prod **logicycle.app** affiche encore l’ancienne identité tant que ce front n’est pas déployé.

## Avant le merge / deploy

- [ ] `npm test` + `npx tsc --noEmit`
- [ ] `.env.production` **sans** `VITE_SKIP_SIGNUP_PAYMENT=true`
- [ ] Firebase Auth → Authorized domains : `logicycle.app` (+ `rovik.app` le jour J)
- [ ] Functions `ALLOWED_APP_ORIGINS` inclut l’URL réelle

## Déployer

```bash
./scripts/complete-production-deploy.sh
./scripts/smoke-production.sh https://logicycle.app
```

Front = Netlify (branche `main`). Vérifier :

- Titre onglet `rovik — Cycling Performance Systems`
- Logo R + wordmark sur landing / login / signup
- Mentions / FAQ : nom **Rovik**
- Favicon / PWA `rovik`

## Bascule domaine (plus tard)

Quand `rovik.app` pointe vers le même site :

1. DNS Netlify / Cloudflare
2. Auth domains + `ALLOWED_APP_ORIGINS` + redeploy functions Stripe
3. Mettre à jour `LEGAL_ENTITY.website` et e-mails **après** MX (fiche 04)

Le projet Firebase reste `logicycle01` (ne pas renommer).
