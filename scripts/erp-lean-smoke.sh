#!/usr/bin/env bash
# Smoke ERP lean — devis / facture / SEPA (auto + rappel manuel).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> ERP lean · devis / facture / SEPA smoke"
echo "    Doc : docs/ERP_LEAN_SMOKE.md"
echo

pass=0
fail=0

check() {
  local name="$1"
  local ok="$2"
  local detail="${3:-}"
  if [[ "$ok" == "1" ]]; then
    echo "OK   $name${detail:+ — $detail}"
    pass=$((pass + 1))
  else
    echo "FAIL $name${detail:+ — $detail}"
    fail=$((fail + 1))
  fi
}

[[ -f "$ROOT/docs/ERP_LEAN_SMOKE.md" ]] && check "Doc ERP_LEAN_SMOKE.md" 1 || check "Doc ERP_LEAN_SMOKE.md" 0
[[ -f "$ROOT/utils/__tests__/erpLeanSmoke.test.ts" ]] && check "Test erpLeanSmoke" 1 || check "Test erpLeanSmoke" 0
[[ -f "$ROOT/utils/__tests__/erpLeanContinentalE2e.test.ts" ]] && check "Test E2E Continental P2" 1 || check "Test E2E Continental P2" 0
[[ -f "$ROOT/utils/sepaExport.ts" ]] && grep -q 'generateSepaPain008XmlContent' "$ROOT/utils/sepaExport.ts" \
  && check "generateSepaPain008XmlContent" 1 || check "generateSepaPain008XmlContent" 0
[[ -f "$ROOT/utils/sepaCollectionUtils.ts" ]] && check "sepaCollectionUtils" 1 || check "sepaCollectionUtils" 0

echo
echo "==> Vitest ERP lean (+ E2E P2)"
if npm test -- \
  utils/__tests__/erpLeanSmoke.test.ts \
  utils/__tests__/erpLeanContinentalE2e.test.ts \
  utils/__tests__/erpLeanAuditFixes.test.ts \
  utils/__tests__/quoteUtils.test.ts \
  utils/__tests__/invoiceUtils.test.ts \
  utils/__tests__/invoiceSequenceUtils.test.ts \
  utils/__tests__/sepaExport.test.ts \
  utils/__tests__/sepaUtils.test.ts; then
  check "Suite vitest ERP" 1
else
  check "Suite vitest ERP" 0
fi

echo
echo "E2E dédié : ./scripts/erp-lean-e2e-continental.sh"
echo "Parcours manuel UI (optionnel) — docs/ERP_LEAN_SMOKE.md :"
echo "  A. Client SEPA-ready (IBAN+BIC+mandat)"
echo "  B. Devis lié carnet → Facture → Émettre"
echo "  C. pain.008 (+ 2e export bloqué)"
echo "  D. pain.001 virement"
echo
echo "Gate plan : SEPA dès Compétition · cible = Continental (Élite)."
echo
echo "==> Résumé : $pass OK / $fail FAIL"
[[ "$fail" -eq 0 ]]
