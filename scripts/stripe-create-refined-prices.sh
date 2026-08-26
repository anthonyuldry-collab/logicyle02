#!/usr/bin/env bash
# Crée les Prices Stripe de la grille raffinée (TTC) + coupon fondateur −20 %.
# Usage :
#   export STRIPE_SECRET_KEY=sk_test_...   # ou sk_live_...
#   ./scripts/stripe-create-refined-prices.sh
#
# Écrit / met à jour functions/.env.logicycle01 (STRIPE_PRICE_* + STRIPE_COUPON_FOUNDER).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="$ROOT/functions/.env.logicycle01"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_SECRET_KEY manquant. Exporte une clé sk_test_… (recommandé) ou sk_live_…"
  exit 1
fi

if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
  echo "⚠ Mode LIVE — création de Prices sur le compte Live."
elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
  echo "Mode TEST — OK."
else
  echo "Clé Stripe inattendue (préfixe non sk_test_/sk_live_)."
  exit 1
fi

api() {
  local method="$1" path="$2"
  shift 2
  curl -sS -u "${STRIPE_SECRET_KEY}:" \
    -X "$method" "https://api.stripe.com/v1${path}" \
    "$@"
}

upsert_env() {
  local key="$1" val="$2"
  touch "$ENVF"
  if grep -q "^${key}=" "$ENVF" 2>/dev/null; then
    # macOS sed
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENVF"
  else
    echo "${key}=${val}" >> "$ENVF"
  fi
  echo "  $key=$val"
}

find_or_create_product() {
  local plan_id="$1" name="$2" description="$3"
  local existing
  existing="$(api GET "/products/search" -G --data-urlencode "query=metadata['plan_id']:'${plan_id}'" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')" 2>/dev/null || true)"
  if [[ -n "$existing" ]]; then
    api POST "/products/${existing}" \
      -d "name=${name}" \
      -d "description=${description}" \
      -d "metadata[plan_id]=${plan_id}" \
      -d "metadata[brand]=rovik" >/dev/null
    echo "$existing"
    return
  fi
  api POST "/products" \
    -d "name=${name}" \
    -d "description=${description}" \
    -d "metadata[plan_id]=${plan_id}" \
    -d "metadata[brand]=rovik" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
}

create_price() {
  local product_id="$1" amount_cents="$2" interval="$3" plan_id="$4" nickname="$5"
  api POST "/prices" \
    -d "product=${product_id}" \
    -d "currency=eur" \
    -d "unit_amount=${amount_cents}" \
    -d "recurring[interval]=${interval}" \
    -d "nickname=${nickname}" \
    -d "metadata[plan_id]=${plan_id}" \
    -d "metadata[interval]=${interval}" \
    -d "metadata[grid]=2026-08-refined" \
    -d "tax_behavior=inclusive" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
}

echo "==> Produits + Prices grille raffinée Rovik"
declare -a PLANS=(
  "club|Rovik Club|Rampe ops course — effectif & logistique|9900|99000|STRIPE_PRICE_CLUB_MONTH|STRIPE_PRICE_CLUB_YEAR"
  "competition|Rovik Compétition|Pack saison — logistique + performance|24900|249000|STRIPE_PRICE_COMPETITION_MONTH|STRIPE_PRICE_COMPETITION_YEAR"
  "continental|Rovik Élite|Circuits internationaux — scouting & missions|39900|399000|STRIPE_PRICE_CONTINENTAL_MONTH|STRIPE_PRICE_CONTINENTAL_YEAR"
  "pro|Rovik Performance|Wedge Pro / WT — support prioritaire|79000|790000|STRIPE_PRICE_PRO_MONTH|STRIPE_PRICE_PRO_YEAR"
  "independent_rider|Rovik Athlète|Profil athlète indépendant|1200|12000|STRIPE_PRICE_INDEPENDENT_RIDER_MONTH|STRIPE_PRICE_INDEPENDENT_RIDER_YEAR"
  "independent_staff|Rovik Staff|Profil staff indépendant|1500|15000|STRIPE_PRICE_INDEPENDENT_STAFF_MONTH|STRIPE_PRICE_INDEPENDENT_STAFF_YEAR"
)

for row in "${PLANS[@]}"; do
  IFS='|' read -r plan_id name desc month_cents year_cents env_m env_y <<<"$row"
  echo
  echo "-- $name ($plan_id)"
  prod_id="$(find_or_create_product "$plan_id" "$name" "$desc")"
  echo "  product=$prod_id"
  price_m="$(create_price "$prod_id" "$month_cents" "month" "$plan_id" "${plan_id}_month_2026_08")"
  price_y="$(create_price "$prod_id" "$year_cents" "year" "$plan_id" "${plan_id}_year_2026_08")"
  upsert_env "$env_m" "$price_m"
  upsert_env "$env_y" "$price_y"
done

echo
echo "==> Coupon fondateurs −20 % (durée 12 mois / abonnement)"
# duration=repeating, duration_in_months=12 — s’applique 12 mois puis grille publique
coupon_json="$(api POST "/coupons" \
  -d "id=rovik_founder_20_y1" \
  -d "percent_off=20" \
  -d "duration=repeating" \
  -d "duration_in_months=12" \
  -d "name=Rovik fondateurs −20% an 1" \
  -d "metadata[offer]=founder_year1" 2>/dev/null || true)"

coupon_id="$(echo "$coupon_json" | python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
  print(d.get('id') or '')
except Exception:
  print('')" 2>/dev/null || true)"

if [[ -z "$coupon_id" ]]; then
  # déjà existant → retrieve
  coupon_id="rovik_founder_20_y1"
  api GET "/coupons/${coupon_id}" >/dev/null
  echo "  coupon existant: $coupon_id"
else
  echo "  coupon créé: $coupon_id"
fi
upsert_env "STRIPE_COUPON_FOUNDER" "$coupon_id"

echo
echo "OK — Price IDs écrits dans $ENVF"
echo "Ensuite :"
echo "  npx firebase-tools@13 deploy --project logicycle01 --only functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook"
echo "  (et sync secrets Firebase si STRIPE_* y sont aussi)"
