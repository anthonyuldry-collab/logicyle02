# 06 — Ops : backup, monitoring, rollback

Procédure longue : `docs/OPS_RUNBOOK.md`.

## Backup Firestore (obligatoire avant clients payants)

1. Console Firebase → projet `logicycle01` → Firestore → Import/Export.
2. Créer un bucket GCS dédié, ex. `logicycle01-firestore-backups` (même projet GCP).
3. Planifier un export **quotidien** (Cloud Scheduler) ou, au minimum soft-launch, **hebdo manuel**.
4. **Une fois** : restaurer un export vers un projet / base de **test** (jamais la prod pour l’essai).

Restore (référence, destructif) :

```bash
gcloud firestore import gs://logicycle01-firestore-backups/<TIMESTAMP> --project=logicycle01
```

## Monitoring

- [ ] Uptime sur `https://europe-west1-logicycle01.cloudfunctions.net/healthz`
- [ ] Budget GCP / Firebase → e-mail fondateur
- [ ] Sentry : provoquer une erreur test, confirmer l’event **sans** PII client

## Rollback &lt; 15 min

- **Front** : Netlify → dernier deploy vert → Publish deploy
- **Functions** : redeploy depuis un commit connu (`docs/OPS_RUNBOOK.md`)

Smoke après chaque prod :

```bash
./scripts/smoke-production.sh https://logicycle.app
./scripts/preflight-soft-launch.sh
```
