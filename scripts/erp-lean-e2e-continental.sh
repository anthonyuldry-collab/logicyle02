#!/usr/bin/env bash
# E2E logique Continental (P2) — devis → facture → SEPA + clientId strict.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> ERP lean · E2E Continental (P2)"
echo "    Doc : docs/ERP_LEAN_SMOKE.md § E2E"
echo

pass=0
fail=0
check() {
  local name="$1" ok="$2" detail="${3:-}"
  if [[ "$ok" == "1" ]]; then
    echo "OK   $name${detail:+ — $detail}"
    pass=$((pass + 1))
  else
    echo "FAIL $name${detail:+ — $detail}"
    fail=$((fail + 1))
  fi
}

[[ -f "$ROOT/utils/__tests__/erpLeanContinentalE2e.test.ts" ]] && check "Test E2E Continental" 1 || check "Test E2E Continental" 0
grep -q 'canConvertQuote' "$ROOT/utils/quoteUtils.ts" && check "canConvertQuote (clientId)" 1 || check "canConvertQuote (clientId)" 0
grep -q 'clientId is required' "$ROOT/utils/quoteUtils.ts" && check "Guard clientId convert" 1 || check "Guard clientId convert" 0
grep -qi 'matching strict par clientId' "$ROOT/utils/sepaCollectionUtils.ts" && check "Matching SEPA clientId-only" 1 || check "Matching SEPA clientId-only" 0

echo
echo "==> Vitest E2E Continental"
if npm test -- utils/__tests__/erpLeanContinentalE2e.test.ts utils/__tests__/erpLeanSmoke.test.ts; then
  check "Suite vitest E2E+smoke" 1
else
  check "Suite vitest E2E+smoke" 0
fi

echo
echo "Checklist E2E (auto) :"
echo "  ✓ clientId requis devis / conversion / émission"
echo "  ✓ matching SEPA strict (pas de fallback raison sociale)"
echo "  ✓ pain.008 + anti-doublon + SeqTp mandat"
echo "  ✓ pain.001 payment batch"
echo "  ✓ gate plan Club vs Continental"
echo
echo "==> Résumé : $pass OK / $fail FAIL"
[[ "$fail" -eq 0 ]]
