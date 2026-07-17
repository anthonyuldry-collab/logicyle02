#!/usr/bin/env python3
"""
Projections LogiCycle — objectif 15K net/mois + trajectoire 100M€ valorisation.
Inclut : indépendants payants, marketplace, ERP (SEPA/FEC), coûts variables par plan,
impact valorisation des options produit (effet réseau, profondeur ERP).
"""
import csv
import math
from dataclasses import dataclass, field, replace
from typing import Dict, List, Optional, Tuple

# ─── Constantes globales ───────────────────────────────────────────────────
FOUNDER_NET_TARGET = 15000
FOUNDER_EMPLOYER_COST = 28000

# ─── Stratégie fiscale dividendes (SAS président) ───────────────────────────
FOUNDER_SHARE_PCT = 0.60          # parts fondateur
PFU_DIVIDENDE = 0.30              # 12,8 % IR + 17,2 % prélèvements sociaux
IS_TAUX_SIMPLIFIE = 0.25          # impôt sociétés (approx. post-réforme PME)
DIVIDEND_PAYOUT_RATIO = 0.35      # % bénéfice après IS distribué (reste en tréso)
TRESO_MOIS_MIN_DIVIDENDE = 8      # mois de burn en tréso mini avant distribution
SALAIRE_MIN_NET_M13_24 = 1500     # SMIC partiel · cotisations retraite
SALAIRE_MIN_NET_M25_PLUS = 2500   # assiette minimale président SAS
SALAIRE_MIX_M25_PLUS = 5000       # mix salaire + dividendes (retraite confortable)

# Holding SAS mère (régime mère-fille — art. 145 CGI)
HOLDING_START_DEFAULT = 48        # activation fiscale mère-fille (pas avant 24 mois de détention)
HOLDING_MERE_FILLE_DELAY = 24     # délai légal détention ≥ 5 % avant exonération 95 %
HOLDING_SETUP_COST = 6500         # montage avocat + greffe + publication
HOLDING_EC_ANNUAL = 1800          # EC holding + liasse / an
HOLDING_QUOTE_PART_IS = 0.05      # quote-part frais & charges (5 % imposable à l'IS)
HOLDING_PFU_RELIEF = 0.06         # gain effectif post mère-fille + arbitrage barème

# Stratégie optimisée EC / avocat fiscaliste
SALAIRE_OPTIMAL_M1_12 = 2000      # jamais 0 € si président actif (risque URSSAF)
SALAIRE_OPTIMAL_M13_24 = 2500     # ~30 % PASS · justification quote-part
SALAIRE_OPTIMAL_M25_PLUS = 5000   # retraite + confort · reste sous plafond haut
PER_MENSUEL_NET = 500             # épargne retraite dès M30 (équiv. net · déductible IR)
PFU_BAREME_SEUIL_DIV_NET = 77000  # en dessous : comparer PFU 30 % vs barème (souvent −2 à −4 pts)
RESERVE_LEGALE_PCT = 0.05         # 5 % bénéfice jusqu'à 10 % capital
DIVIDEND_PAYOUT_SERIES_A_CAP = 0.25  # plafond prudence M37–M48 (due diligence Series A)
IS_JEI_TAUX = 0.10                # 10 % sur 1er palier si statut JEI obtenu
IS_JEI_PLAFOND = 42500            # plafond bénéfice éligible JEI / an (simplifié)

# ─── Marketplace missions vacataires (commission % sur GMV) ─────────────────
MISSION_TAKE_RATE_STANDARD = 0.12       # 12 % Continental / Compétition
MISSION_TAKE_RATE_PRO = 0.10            # 10 % plan Pro (volume)
MISSION_AVG_DAILY_RATE_EUR = 150
MISSION_AVG_DAYS = 5.5
MISSION_AVG_GMV = MISSION_AVG_DAILY_RATE_EUR * MISSION_AVG_DAYS  # 825 €
MISSIONS_PER_ELIGIBLE_TEAM_YEAR = 6     # équipes Continental+ actives
MISSION_PLATFORM_SHARE = 0.75           # 75 % missions via plateforme vs direct
MISSION_STRIPE_CONNECT_COST_PCT = 0.032   # ~3,2 % du GMV (COGS marketplace)
MISSION_RAMP_MONTHS = 24

IPPOGEE_VAL_MIN = 8_000_000
IPPOGEE_VAL_MAX = 20_000_000
IPPOGEE_VAL_MID = 14_000_000
TARGET_VALUATION = 100_000_000

# ─── TAM réel (sources : UCI · PCS · FFC · FFCT · British Cycling · BDR · tam-marche-reel.md)
TAM_UCI_TEAMS_TOTAL = 180          # WT + Pro + Continental (H+F) · UCI 2026
TAM_UCI_PREMIUM = 48                 # WT + Pro H + WTW + W Pro
TAM_IPPOGEE_CLIENTS = 80
TAM_CLUBS_MONDIAL = 14000            # FFC+FFCT+BC+BDR+AU · hors double comptage
TAM_INDEP_STAFF_SAM = 18000          # Staff/coureurs sans équipe · scouting/marketplace
TAM_ARR_SAM_EUR = 6_900_000          # SAM haut · tam-marche-reel.md
TAM_ARR_SAM_BASE_EUR = 4_300_000     # SAM bas
TAM_ARR_UPSIDE_EUR = 12_000_000      # Upside ES/IT/DE/LatAm élargi

# ─── TAM multisport (triathlon + running · EU élargie) ─────────────────────
TAM_CYCLING_SAM_EUR = 6_900_000
TAM_TRI_CLUBS_SAM = 800              # clubs compétition EU structurés
TAM_TRI_COACHES_SAM = 8000           # coachs indép. tri EU
TAM_TRI_ATHLETES_SAM = 12000         # athlètes solo tri payants EU
TAM_RUN_COACHES_SAM = 12000          # coachs running indép. EU
TAM_RUN_CLUBS_SAM = 300              # gros clubs FFA running structurés
TAM_TRI_ARR_SAM_EUR = 3_200_000      # clubs 0,7M + coachs 1,8M + athlètes 0,7M
TAM_RUN_ARR_SAM_EUR = 2_100_000      # coachs 1,9M + clubs 0,2M
TAM_MULTISPORT_ARR_SAM_EUR = 5_300_000
TAM_COMBINED_ENDURANCE_SAM_EUR = 12_200_000  # cyclisme + tri + run (haut)

# Portail organisateur cyclisme — AVANT triathlon (décision juil. 2026)
TAM_ORG_SOLO_SAM = 400               # 1 épreuve · DN / Coupe / Cont. petites
TAM_ORG_PRO_SAM = 200                # multi-épreuves · UCI 1.x / 2.x / ligues
TAM_ORG_ARR_SAM_EUR = 2_400_000      # solo ~0,8M + pro ~1,6M (EU)

# ─── Calendrier commercial (M1 = lancement payant) ─────────────────────────
LAUNCH_YEAR = 2027
LAUNCH_MONTH = 12  # décembre 2027
LAUNCH_LABEL = "décembre 2027"
PREP_START_LABEL = "septembre 2027"  # J-90 avant go-live


def month_to_calendar(month: int) -> str:
    """Convertit un mois projeté (M1 = déc. 2027) en libellé calendaire."""
    total = LAUNCH_YEAR * 12 + (LAUNCH_MONTH - 1) + (month - 1)
    y, m0 = divmod(total, 12)
    m = m0 + 1
    names = (
        "jan.", "fév.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc.",
    )
    return f"{names[m - 1]} {y}"


def build_calendrier_lancement() -> List[Dict]:
    milestones = [
        (0, "Pré-lancement J-90", "Prep produit · legal · i18n EN · Stripe"),
        (1, "Go-live commercial", "Premiers clients payants · double voie FR+EN"),
        (6, "Fin Y1 partiel", "i18n EN 100 % · 1 Pro/WT wedge"),
        (12, "Fin année 1", "196 K€ ARR · valo ~1,7 M€"),
        (18, "Fin Y1,5", "10 Continental FR · 3 Pro/WT · 15 anglo"),
        (24, "Fin année 2 · Seed", "809 K€ ARR · Seed 750 K€"),
        (37, "Objectif 15 K net", "18 K€/mois · 2,3 M€ ARR"),
        (53, "100 M€ valorisation", "Secondary fondateur possible"),
        (60, "Fin année 5", "7,5 M€ ARR"),
        (84, "Fin année 7", "15 M€ ARR"),
        (120, "Horizon 10 ans", "26 M€ ARR · valo ~522 M€"),
    ]
    return [
        {
            "mois_projete": f"M{m}" if m else "Prep",
            "date_calendrier": month_to_calendar(m) if m else PREP_START_LABEL,
            "jalon": label,
            "detail": detail,
            "lancement_reference": LAUNCH_LABEL,
        }
        for m, label, detail in milestones
    ]

# ─── Unit economics — coûts variables par plan (€/mois / client actif) ─────
# Justification : Stripe ~2%, Firebase/Storage, OCR/Gemini (Compétition+), support amorti
PLAN_UNIT_ECONOMICS = {
    "club": {
        "prix_mensuel": 39,
        "prix_annuel_equiv": 32.5,  # 390/12 mois facturés sur 10
        "cogs_variable": 5.5,  # Stripe 0.8, Firebase 1.5, storage 0.5, support 2.7
        "marge_contribution_pct": 86,
    },
    "competition": {
        "prix_mensuel": 89,
        "prix_annuel_equiv": 74.2,
        "cogs_variable": 13.0,  # + OCR Gemini light 4€, exports 1.5€
        "marge_contribution_pct": 85,
    },
    "continental": {
        "prix_mensuel": 169,
        "prix_annuel_equiv": 140.8,
        "cogs_variable": 22.0,  # + scouting index, marketplace infra
        "marge_contribution_pct": 87,
    },
    "pro": {
        "prix_mensuel": 299,
        "prix_annuel_equiv": 249.2,
        "cogs_variable": 38.0,  # + Gemini nutrition, payroll, support prioritaire
        "marge_contribution_pct": 87,
    },
    "independent_rider": {
        "prix_mensuel": 9,
        "prix_annuel_equiv": 7.5,
        "cogs_variable": 1.2,
        "marge_contribution_pct": 87,
    },
    "independent_staff": {
        "prix_mensuel": 12,
        "prix_annuel_equiv": 10.0,
        "cogs_variable": 1.5,
        "marge_contribution_pct": 88,
    },
    "independent_coach": {
        "prix_mensuel": 29,
        "prix_annuel_equiv": 24.2,
        "cogs_variable": 2.0,
        "marge_contribution_pct": 92,
    },
    "independent_athlete_camp": {
        "prix_mensuel": 19,
        "prix_annuel_equiv": 16.7,
        "cogs_variable": 2.2,
        "marge_contribution_pct": 87,
    },
    "organizer_solo": {
        "prix_mensuel": 49,
        "prix_annuel_equiv": 40.8,  # 490/12
        "cogs_variable": 6.0,
        "marge_contribution_pct": 88,
    },
    "organizer_pro": {
        "prix_mensuel": 149,
        "prix_annuel_equiv": 124.2,  # 1490/12
        "cogs_variable": 18.0,
        "marge_contribution_pct": 88,
    },
}

# Réseau endurance — ordre stratégique : organisateur cyclisme AVANT triathlon
# (réutilise OrganizerContacts + UciForms · effet acquisition équipes)
MULTISPORT_TIERS: List[Dict] = [
    {
        "key": "organisateurs_solo",
        "label": "Organisateurs cyclisme Solo",
        "segment": "organisateur",
        "start_month": 24,
        "cap": TAM_ORG_SOLO_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["organizer_solo"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["organizer_solo"]["cogs_variable"],
        "churn_annual": 0.16,
        "phases": [(24, 36, 4.0), (37, 60, 6.0), (61, 120, 3.0)],
        "roadmap": "M24 — fiche épreuve + candidatures en ligne (après Seed · ≥150 équipes)",
    },
    {
        "key": "organisateurs_pro",
        "label": "Organisateurs cyclisme Pro",
        "segment": "organisateur",
        "start_month": 30,
        "cap": TAM_ORG_PRO_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["organizer_pro"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["organizer_pro"]["cogs_variable"],
        "churn_annual": 0.12,
        "phases": [(30, 48, 2.0), (49, 72, 3.5), (73, 120, 2.0)],
        "roadmap": "M30 — roadbook + startlists UCI/FFC + messagerie équipes",
    },
    {
        "key": "clubs_tri",
        "label": "Clubs triathlon (Compétition)",
        "segment": "equipe",
        "start_month": 36,
        "cap": TAM_TRI_CLUBS_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["competition"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["competition"]["cogs_variable"],
        "churn_annual": 0.11,
        "phases": [(36, 48, 2.0), (49, 72, 3.5), (73, 120, 1.5)],
        "roadmap": "M36 — module tri · après portail organisateur cyclisme",
    },
    {
        "key": "coachs_tri",
        "label": "Coachs indép. triathlon",
        "segment": "coach",
        "start_month": 36,
        "cap": TAM_TRI_COACHES_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["independent_coach"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["independent_coach"]["cogs_variable"],
        "churn_annual": 0.18,
        "phases": [(36, 48, 12), (49, 72, 35), (73, 120, 22)],
        "roadmap": "M36 — Coach 29 € tri · brick · roster",
    },
    {
        "key": "athletes_tri",
        "label": "Athlètes tri solo",
        "segment": "athlete",
        "start_month": 39,
        "cap": TAM_TRI_ATHLETES_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["independent_athlete_camp"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["independent_athlete_camp"]["cogs_variable"],
        "churn_annual": 0.22,
        "phases": [(39, 48, 18), (49, 72, 55), (73, 120, 35)],
        "roadmap": "M39 — athlète + Pass Camp · viral coach→athlète",
    },
    {
        "key": "coachs_running",
        "label": "Coachs indép. running",
        "segment": "coach",
        "start_month": 60,
        "cap": TAM_RUN_COACHES_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["independent_coach"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["independent_coach"]["cogs_variable"],
        "churn_annual": 0.20,
        "phases": [(60, 84, 25), (85, 120, 45)],
        "roadmap": "M60 — module running coach · après traction tri",
    },
    {
        "key": "clubs_running",
        "label": "Clubs running structurés (FFA)",
        "segment": "equipe",
        "start_month": 72,
        "cap": TAM_RUN_CLUBS_SAM,
        "arpu_monthly": PLAN_UNIT_ECONOMICS["club"]["prix_annuel_equiv"],
        "cogs_monthly": PLAN_UNIT_ECONOMICS["club"]["cogs_variable"],
        "churn_annual": 0.14,
        "phases": [(72, 96, 1.5), (97, 120, 2.0)],
        "roadmap": "M72 — clubs N1 running · calendrier · effectifs",
    },
]

# Mix plans équipes (évolue vers le haut avec maturité ERP / upsell)
PLAN_MIX_BY_YEAR = {
    1: {"club": 0.45, "competition": 0.35, "continental": 0.15, "pro": 0.05},
    2: {"club": 0.38, "competition": 0.35, "continental": 0.20, "pro": 0.07},
    3: {"club": 0.30, "competition": 0.32, "continental": 0.28, "pro": 0.10},
    5: {"club": 0.22, "competition": 0.30, "continental": 0.32, "pro": 0.16},
    7: {"club": 0.18, "competition": 0.28, "continental": 0.34, "pro": 0.20},
    10: {"club": 0.12, "competition": 0.22, "continental": 0.36, "pro": 0.30},
}

INDEP_MIX = {"independent_rider": 0.72, "independent_staff": 0.28}


@dataclass
class HireEvent:
    mois_debut: int
    role: str
    type_contrat: str
    cout_employeur_mois: float
    scenario: str


HIRE_PLAN: List[HireEvent] = [
    HireEvent(1, "Fondateur (CEO/Product/Dev)", "Fondateur", 0, "all"),
    HireEvent(3, "Comptable", "Freelance", 250, "all"),
    HireEvent(6, "Designer UI/UX", "Freelance mission", 800, "all"),
    HireEvent(6, "Avocat RGPD / contrats", "Freelance mission", 500, "all"),
    HireEvent(18, "Développeur full-stack", "Freelance 3j/sem", 2500, "accelere"),
    HireEvent(18, "Développeur full-stack", "CDI", 5500, "leader100M"),
    HireEvent(24, "Commercial terrain (commission)", "Freelance", 1500, "accelere"),
    HireEvent(24, "Account Executive", "CDI", 4500, "leader100M"),
    HireEvent(30, "Customer Success", "Mi-temps → CDI", 2800, "accelere"),
    HireEvent(30, "Customer Success Manager", "CDI", 3500, "leader100M"),
    HireEvent(36, "Développeur #2 (mobile/API)", "CDI", 5500, "accelere"),
    HireEvent(36, "Développeur mobile React Native", "CDI", 5800, "leader100M"),
    HireEvent(42, "Sales Manager", "CDI", 5500, "leader100M"),
    HireEvent(48, "Head of Sales", "CDI", 7000, "leader100M"),
    HireEvent(54, "DevOps / Infra", "CDI", 5500, "leader100M"),
    HireEvent(60, "Product Manager", "CDI", 6000, "leader100M"),
    HireEvent(66, "Marketing Manager", "CDI", 5000, "leader100M"),
    HireEvent(72, "Country Manager EU (×2)", "CDI", 9000, "leader100M"),
    HireEvent(18, "Country lead UK/IE", "Commission 15 % ARR", 0, "leaderGlobal"),
    HireEvent(24, "Account Executive France", "CDI", 4500, "leaderGlobal"),
    HireEvent(28, "Country lead US cycling", "Commission 15 % ARR", 0, "leaderGlobal"),
    HireEvent(30, "AE Anglophone (US/AU)", "CDI", 4800, "leaderGlobal"),
    HireEvent(36, "Customer Success Manager", "CDI", 3500, "leaderGlobal"),
    HireEvent(42, "Sales Manager", "CDI", 5500, "leaderGlobal"),
    HireEvent(48, "Head of Sales", "CDI", 7000, "leaderGlobal"),
    HireEvent(60, "Country lead Australie", "Commission 15 % ARR", 0, "leaderGlobal"),
    HireEvent(72, "Country Manager EU (×2)", "CDI", 9000, "leaderGlobal"),
    HireEvent(96, "CRO (Chief Revenue Officer)", "CDI", 10000, "leaderGlobal"),
]


@dataclass
class Scenario:
    name: str
    label: str
    months: int
    new_teams_m1_6: float
    new_teams_m7_18: float
    new_teams_m19_36: float
    new_teams_m37_60: float
    new_teams_m61_plus: float
    # Indépendants payants (nouveau flux MRR)
    new_indep_m1_6: float = 20
    new_indep_m7_18: float = 55
    new_indep_m19_36: float = 110
    new_indep_m37_60: float = 180
    new_indep_m61_plus: float = 250
    churn_indep_annual: float = 0.20
    infra_m1_12: float = 2000
    infra_m13_24: float = 4000
    infra_m25_36: float = 8000
    infra_m37_60: float = 15000
    infra_m61_plus: float = 45000
    salary_phase1: float = 0
    salary_phase2: float = 3000
    salary_phase3: float = 10000
    salary_phase4: float = 18000
    treasury_start: float = 150000
    # Rémunération : "salaire" | "dividendes" | "mix" | "optimal" (recommandé EC)
    remuneration_mode: str = "salaire"
    holding_start_month: int = 0    # création holding · mère-fille active +24 mois
    churn_annual: float = 0.07
    marketplace_start_month: int = 24
    enterprise_mrr_start_month: int = 60
    enterprise_mrr_at_maturity: float = 35000
    fundraising: Dict[int, float] = field(default_factory=dict)
    # Options produit activées (impact multiple valorisation)
    erp_module_live_month: int = 1  # SEPA/FEC/facturation dès Y1
    independents_paid_month: int = 1
    partner_portal_month: int = 18
    gps_fleet_month: int = 24
    camp_monitoring_month: int = 1  # Suivi stage · wellness · tests · altitude
    # Expansion internationale
    eu_start_month: int = 24
    eu_ramp_months: int = 24
    eu_team_boost: float = 0.35       # +35 % acquisition équipes EU cœur
    eu_indep_boost: float = 0.45
    world_start_month: int = 72
    world_ramp_months: int = 36
    world_team_boost: float = 0.50    # +50 % acquisition hors EU à maturité
    world_indep_boost: float = 0.70
    world_arpu_factor: float = 0.88   # pricing PPP zones US/AU/LATAM
    intl_infra_uplift_eu: float = 0.08   # +8 % coûts infra (i18n, support)
    intl_infra_uplift_world: float = 0.12
    # Marché anglophone (UK → US/AU/CA) — 1 langue = 4 marchés, anti-duplication
    anglo_start_month: int = 0
    anglo_ramp_months: int = 24
    anglo_team_boost: float = 0.0
    anglo_indep_boost: float = 0.0
    anglo_arpu_premium: float = 1.0   # US/UK ARPU souvent supérieur au PPP EU
    intl_mrr_share_cap: float = 0.62
    # Plafonds TAM (0 = pas de plafond · scénario upside)
    tam_cap_teams: float = 0
    tam_cap_independents: float = 0
    # Extension triathlon + running (paliers MULTISPORT_TIERS)
    multisport: bool = False
    multisport_infra_uplift: float = 0.06  # +6 % infra max à maturité multisport


SCENARIOS: List[Scenario] = [
    Scenario(
        name="accelere", label="Accéléré (objectif 15K)", months=60,
        new_teams_m1_6=5, new_teams_m7_18=8, new_teams_m19_36=12,
        new_teams_m37_60=15, new_teams_m61_plus=15,
        new_indep_m1_6=15, new_indep_m7_18=40, new_indep_m19_36=80,
        new_indep_m37_60=120, new_indep_m61_plus=150,
        infra_m1_12=1500, infra_m13_24=2500, infra_m25_36=4000,
        infra_m37_60=8000, infra_m61_plus=18000,
        salary_phase1=0, salary_phase2=2000, salary_phase3=7000, salary_phase4=15000,
        treasury_start=40000, churn_annual=0.10, marketplace_start_month=30,
        churn_indep_annual=0.22,
    ),
    Scenario(
        name="leader100M", label="Leader Europe (objectif 100M€)", months=120,
        new_teams_m1_6=6, new_teams_m7_18=10, new_teams_m19_36=14,
        new_teams_m37_60=24, new_teams_m61_plus=36,
        new_indep_m1_6=25, new_indep_m7_18=60, new_indep_m19_36=120,
        new_indep_m37_60=200, new_indep_m61_plus=280,
        infra_m1_12=2000, infra_m13_24=4000, infra_m25_36=8000,
        infra_m37_60=15000, infra_m61_plus=45000,
        salary_phase1=0, salary_phase2=3000, salary_phase3=10000, salary_phase4=18000,
        treasury_start=150000, churn_annual=0.07, marketplace_start_month=24,
        enterprise_mrr_start_month=60, enterprise_mrr_at_maturity=48000,
        fundraising={24: 500_000, 48: 2_000_000, 72: 5_000_000, 96: 3_000_000},
        churn_indep_annual=0.18,
        eu_start_month=24, eu_team_boost=0.35, eu_indep_boost=0.45,
        world_start_month=72, world_team_boost=0.50, world_indep_boost=0.70,
    ),
    Scenario(
        name="leaderGlobal", label="Leader Dual-Track (FR + EN/WT)", months=120,
        new_teams_m1_6=4, new_teams_m7_18=7, new_teams_m19_36=10,
        new_teams_m37_60=14, new_teams_m61_plus=10,
        new_indep_m1_6=22, new_indep_m7_18=55, new_indep_m19_36=82,
        new_indep_m37_60=110, new_indep_m61_plus=68,
        infra_m1_12=2200, infra_m13_24=4800, infra_m25_36=8500,
        infra_m37_60=14000, infra_m61_plus=32000,
        remuneration_mode="optimal",
        salary_phase1=SALAIRE_OPTIMAL_M1_12,
        salary_phase2=SALAIRE_OPTIMAL_M13_24,
        salary_phase3=SALAIRE_OPTIMAL_M25_PLUS,
        salary_phase4=SALAIRE_OPTIMAL_M25_PLUS,
        holding_start_month=24,
        treasury_start=120000, churn_annual=0.063, marketplace_start_month=18,
        enterprise_mrr_start_month=36, enterprise_mrr_at_maturity=48000,
        fundraising={24: 750_000, 48: 2_000_000},
        churn_indep_annual=0.14,
        eu_start_month=18, eu_team_boost=0.30, eu_indep_boost=0.38,
        anglo_start_month=3, anglo_ramp_months=24,
        anglo_team_boost=0.38, anglo_indep_boost=0.58, anglo_arpu_premium=1.08,
        world_start_month=48, world_ramp_months=36,
        world_team_boost=0.42, world_indep_boost=0.52,
        world_arpu_factor=0.95,
        intl_mrr_share_cap=0.58,
        intl_infra_uplift_eu=0.08, intl_infra_uplift_world=0.10,
        tam_cap_teams=2200,
        tam_cap_independents=16000,
    ),
    Scenario(
        name="leaderUpside", label="Upside international (stretch)", months=120,
        new_teams_m1_6=5, new_teams_m7_18=8, new_teams_m19_36=12,
        new_teams_m37_60=18, new_teams_m61_plus=22,
        new_indep_m1_6=22, new_indep_m7_18=55, new_indep_m19_36=95,
        new_indep_m37_60=120, new_indep_m61_plus=140,
        infra_m1_12=2500, infra_m13_24=5500, infra_m25_36=11000,
        infra_m37_60=20000, infra_m61_plus=50000,
        remuneration_mode="optimal",
        salary_phase1=SALAIRE_OPTIMAL_M1_12,
        salary_phase2=SALAIRE_OPTIMAL_M13_24,
        salary_phase3=SALAIRE_OPTIMAL_M25_PLUS,
        salary_phase4=SALAIRE_OPTIMAL_M25_PLUS,
        holding_start_month=24,
        treasury_start=180000, churn_annual=0.065, marketplace_start_month=18,
        enterprise_mrr_start_month=30, enterprise_mrr_at_maturity=45000,
        fundraising={24: 750_000, 42: 2_500_000, 66: 5_000_000},
        churn_indep_annual=0.14,
        eu_start_month=12, eu_team_boost=0.45, eu_indep_boost=0.55,
        anglo_start_month=3, anglo_ramp_months=18,
        anglo_team_boost=0.55, anglo_indep_boost=0.85, anglo_arpu_premium=1.10,
        world_start_month=24, world_ramp_months=24,
        world_team_boost=0.70, world_indep_boost=0.90,
        world_arpu_factor=0.95,
        intl_mrr_share_cap=0.68,
        intl_infra_uplift_eu=0.10, intl_infra_uplift_world=0.14,
        tam_cap_teams=4500,
        tam_cap_independents=35000,
    ),
    Scenario(
        name="leaderMultisport", label="Leader Multisport (cyclisme + tri + run)", months=120,
        new_teams_m1_6=4, new_teams_m7_18=7, new_teams_m19_36=10,
        new_teams_m37_60=14, new_teams_m61_plus=10,
        new_indep_m1_6=22, new_indep_m7_18=55, new_indep_m19_36=82,
        new_indep_m37_60=110, new_indep_m61_plus=68,
        infra_m1_12=2200, infra_m13_24=4800, infra_m25_36=9000,
        infra_m37_60=15000, infra_m61_plus=35000,
        remuneration_mode="optimal",
        salary_phase1=SALAIRE_OPTIMAL_M1_12,
        salary_phase2=SALAIRE_OPTIMAL_M13_24,
        salary_phase3=SALAIRE_OPTIMAL_M25_PLUS,
        salary_phase4=SALAIRE_OPTIMAL_M25_PLUS,
        holding_start_month=24,
        treasury_start=120000, churn_annual=0.063, marketplace_start_month=18,
        enterprise_mrr_start_month=36, enterprise_mrr_at_maturity=48000,
        fundraising={24: 750_000, 48: 2_000_000},
        churn_indep_annual=0.14,
        eu_start_month=18, eu_team_boost=0.30, eu_indep_boost=0.38,
        anglo_start_month=3, anglo_ramp_months=24,
        anglo_team_boost=0.38, anglo_indep_boost=0.58, anglo_arpu_premium=1.08,
        world_start_month=48, world_ramp_months=36,
        world_team_boost=0.42, world_indep_boost=0.52,
        world_arpu_factor=0.95,
        intl_mrr_share_cap=0.58,
        intl_infra_uplift_eu=0.08, intl_infra_uplift_world=0.10,
        tam_cap_teams=2200,
        tam_cap_independents=16000,
        multisport=True,
        multisport_infra_uplift=0.06,
    ),
    Scenario(
        name="bootstrap", label="Bootstrap solo", months=60,
        new_teams_m1_6=4, new_teams_m7_18=6, new_teams_m19_36=9,
        new_teams_m37_60=12, new_teams_m61_plus=12,
        new_indep_m1_6=10, new_indep_m7_18=25, new_indep_m19_36=50,
        new_indep_m37_60=70, new_indep_m61_plus=90,
        infra_m1_12=1000, infra_m13_24=1500, infra_m25_36=3000,
        infra_m37_60=5000, infra_m61_plus=12000,
        salary_phase1=0, salary_phase2=1000, salary_phase3=4000, salary_phase4=15000,
        treasury_start=15000, churn_annual=0.14, marketplace_start_month=36,
        churn_indep_annual=0.25,
    ),
    Scenario(
        name="optimiste", label="Optimiste", months=60,
        new_teams_m1_6=6, new_teams_m7_18=10, new_teams_m19_36=16,
        new_teams_m37_60=24, new_teams_m61_plus=24,
        new_indep_m1_6=20, new_indep_m7_18=50, new_indep_m19_36=100,
        new_indep_m37_60=160, new_indep_m61_plus=200,
        infra_m1_12=2500, infra_m13_24=6000, infra_m25_36=12000,
        infra_m37_60=22000, infra_m61_plus=45000,
        salary_phase1=0, salary_phase2=2000, salary_phase3=8000, salary_phase4=15000,
        treasury_start=100000, churn_annual=0.08, marketplace_start_month=24,
        fundraising={18: 300_000},
        churn_indep_annual=0.18,
    ),
]


def apply_tam_cap(current: float, incoming: float, cap: float) -> float:
    """Réduit les acquisitions nettes quand le plafond TAM est proche."""
    if not cap or cap <= 0:
        return incoming
    room = max(0.0, cap - current)
    return min(incoming, room)


def get_multisport_acquisition(tier: Dict, month: int) -> float:
    """Nouveaux clients/mois pour un palier multisport selon la phase."""
    if month < tier["start_month"]:
        return 0.0
    for start, end, rate in tier["phases"]:
        if start <= month <= end:
            return rate
    return 0.0


def init_multisport_counters() -> Dict[str, float]:
    return {tier["key"]: 0.0 for tier in MULTISPORT_TIERS}


def step_multisport(
    month: int, counters: Dict[str, float]
) -> Tuple[Dict[str, float], float, float]:
    """Avance d'un mois les compteurs multisport · retourne (counters, mrr, cogs)."""
    mrr = 0.0
    cogs = 0.0
    for tier in MULTISPORT_TIERS:
        key = tier["key"]
        if month < tier["start_month"]:
            continue
        churn_m = monthly_churn(tier["churn_annual"])
        after_churn = counters[key] * (1 - churn_m)
        new = apply_tam_cap(after_churn, get_multisport_acquisition(tier, month), tier["cap"])
        counters[key] = after_churn + new
        mrr += counters[key] * tier["arpu_monthly"]
        cogs += counters[key] * tier["cogs_monthly"]
    return counters, mrr, cogs


def scenario_hiring_matches(hire_scenario: str, scenario_name: str) -> bool:
    if hire_scenario == "all":
        return True
    if hire_scenario == scenario_name:
        return True
    # leaderMultisport hérite du plan d'embauches leaderGlobal
    if scenario_name == "leaderMultisport" and hire_scenario == "leaderGlobal":
        return True
    return False


def monthly_churn(annual: float) -> float:
    return 1 - (1 - annual) ** (1 / 12)


def get_new_teams(s: Scenario, month: int) -> float:
    if month <= 6:
        base = s.new_teams_m1_6
    elif month <= 18:
        base = s.new_teams_m7_18
    elif month <= 36:
        base = s.new_teams_m19_36
    elif month <= 60:
        base = s.new_teams_m37_60
    else:
        base = s.new_teams_m61_plus
    boost, _, _, _ = international_factors(s, month)
    return base * boost


def get_new_independents(s: Scenario, month: int) -> float:
    if month < s.independents_paid_month:
        return 0
    if month <= 6:
        base = s.new_indep_m1_6
    elif month <= 18:
        base = s.new_indep_m7_18
    elif month <= 36:
        base = s.new_indep_m19_36
    elif month <= 60:
        base = s.new_indep_m37_60
    else:
        base = s.new_indep_m61_plus
    _, indep_boost, _, _ = international_factors(s, month)
    return base * indep_boost


def international_factors(s: Scenario, month: int) -> Tuple[float, float, float, float]:
    """Retourne (team_boost, indep_boost, arpu_factor, part_mrr_hors_france)."""
    eu_ramp = 0.0
    world_ramp = 0.0
    anglo_ramp = 0.0
    if month >= s.eu_start_month:
        eu_ramp = min(1.0, (month - s.eu_start_month) / max(1, s.eu_ramp_months))
    if month >= s.world_start_month:
        world_ramp = min(1.0, (month - s.world_start_month) / max(1, s.world_ramp_months))
    if s.anglo_start_month and month >= s.anglo_start_month:
        anglo_ramp = min(1.0, (month - s.anglo_start_month) / max(1, s.anglo_ramp_months))

    team_boost = (
        1.0
        + s.eu_team_boost * eu_ramp
        + s.world_team_boost * world_ramp
        + s.anglo_team_boost * anglo_ramp
    )
    indep_boost = (
        1.0
        + s.eu_indep_boost * eu_ramp
        + s.world_indep_boost * world_ramp
        + s.anglo_indep_boost * anglo_ramp
    )
    arpu_factor = 1.0 - (1.0 - s.world_arpu_factor) * world_ramp * 0.45
    if s.anglo_arpu_premium > 1.0:
        arpu_factor *= 1.0 + (s.anglo_arpu_premium - 1.0) * anglo_ramp * 0.65
    cap = getattr(s, "intl_mrr_share_cap", 0.62)
    intl_share = min(cap, eu_ramp * 0.22 + world_ramp * 0.32 + anglo_ramp * 0.28)
    return team_boost, indep_boost, arpu_factor, intl_share


def get_plan_mix(year: float) -> Dict[str, float]:
    keys = sorted(PLAN_MIX_BY_YEAR.keys())
    y = min(max(1, year), 10)
    lower = max(k for k in keys if k <= y)
    upper = min(k for k in keys if k >= y)
    if lower == upper:
        return PLAN_MIX_BY_YEAR[lower]
    t = (y - lower) / (upper - lower)
    mix = {}
    for plan in PLAN_MIX_BY_YEAR[lower]:
        mix[plan] = PLAN_MIX_BY_YEAR[lower][plan] * (1 - t) + PLAN_MIX_BY_YEAR[upper][plan] * t
    return mix


def blended_team_arpu(month: int, arpu_factor: float = 1.0) -> Tuple[float, float]:
    """Retourne (ARPU mensuel équivalent, COGS variable moyen par équipe)."""
    year = month / 12
    mix = get_plan_mix(year)
    arpu = sum(mix[p] * PLAN_UNIT_ECONOMICS[p]["prix_annuel_equiv"] for p in mix) * arpu_factor
    cogs = sum(mix[p] * PLAN_UNIT_ECONOMICS[p]["cogs_variable"] for p in mix)
    return arpu, cogs


def blended_indep_arpu() -> Tuple[float, float]:
    arpu = sum(
        INDEP_MIX[p] * PLAN_UNIT_ECONOMICS[p]["prix_annuel_equiv"] for p in INDEP_MIX
    )
    cogs = sum(INDEP_MIX[p] * PLAN_UNIT_ECONOMICS[p]["cogs_variable"] for p in INDEP_MIX)
    return arpu, cogs


def get_infra_cost(s: Scenario, month: int) -> float:
    if month <= 12:
        base = s.infra_m1_12
    elif month <= 24:
        base = s.infra_m13_24
    elif month <= 36:
        base = s.infra_m25_36
    elif month <= 60:
        base = s.infra_m37_60
    else:
        base = s.infra_m61_plus
    _, _, _, intl_share = international_factors(s, month)
    eu_ramp = min(1.0, max(0, (month - s.eu_start_month) / max(1, s.eu_ramp_months))) if month >= s.eu_start_month else 0
    world_ramp = min(1.0, max(0, (month - s.world_start_month) / max(1, s.world_ramp_months))) if month >= s.world_start_month else 0
    uplift = 1.0 + s.intl_infra_uplift_eu * eu_ramp + s.intl_infra_uplift_world * world_ramp
    if getattr(s, "multisport", False) and month >= 24:
        ms_ramp = min(1.0, (month - 24) / 36)
        uplift *= 1.0 + getattr(s, "multisport_infra_uplift", 0.06) * ms_ramp
    return base * uplift


def get_hiring_cost(scenario_name: str, month: int) -> Tuple[float, List[str]]:
    active_roles: List[str] = []
    total = 0.0
    for h in HIRE_PLAN:
        if h.mois_debut > month:
            continue
        if not scenario_hiring_matches(h.scenario, scenario_name):
            continue
        if h.cout_employeur_mois > 0:
            total += h.cout_employeur_mois
            active_roles.append(h.role)
    return total, active_roles


def net_to_employer(net: float) -> float:
    return FOUNDER_EMPLOYER_COST * (net / FOUNDER_NET_TARGET)


def effective_is_rate(month: int, taxable_profit: float) -> float:
    """IS simplifié · taux JEI 10 % sur 1er palier si M1–M36 et bénéfice positif."""
    if month <= 36 and taxable_profit > 0:
        jei_base = min(taxable_profit, IS_JEI_PLAFOND)
        jei_part = jei_base / taxable_profit if taxable_profit else 0
        return IS_JEI_TAUX * jei_part + IS_TAUX_SIMPLIFIE * (1 - jei_part)
    return IS_TAUX_SIMPLIFIE


def effective_pfu_on_dividends(
    month: int,
    holding_from: int,
    annual_div_net_run_rate: float,
) -> float:
    """
    PFU 30 % ou barème si plus favorable · mère-fille après 24 mois de détention holding.
    """
    mere_fille = (
        holding_from > 0
        and month >= holding_from + HOLDING_MERE_FILLE_DELAY
    )
    if mere_fille:
        return max(0.12, PFU_DIVIDENDE - HOLDING_PFU_RELIEF)
    if annual_div_net_run_rate < PFU_BAREME_SEUIL_DIV_NET:
        return 0.27  # barème progressif souvent ~27 % effectif sous TMI 30 %
    return PFU_DIVIDENDE


def founder_salary(s: Scenario, month: int, gross_profit: float, treasury: float) -> float:
    mode = getattr(s, "remuneration_mode", "salaire")
    if mode in ("dividendes", "optimal"):
        if mode == "optimal":
            if month <= 12:
                target = SALAIRE_OPTIMAL_M1_12
            elif month <= 24:
                target = SALAIRE_OPTIMAL_M13_24
            else:
                target = SALAIRE_OPTIMAL_M25_PLUS
        elif month <= 12:
            target = s.salary_phase1
        elif month <= 24:
            target = SALAIRE_MIN_NET_M13_24
        else:
            target = SALAIRE_MIN_NET_M25_PLUS
    elif mode == "mix":
        if month <= 12:
            target = s.salary_phase1
        elif month <= 24:
            target = SALAIRE_MIN_NET_M13_24
        else:
            target = SALAIRE_MIX_M25_PLUS
    elif month <= 12:
        target = s.salary_phase1
    elif month <= 24:
        target = s.salary_phase2
    elif month <= 36:
        target = s.salary_phase3
    else:
        target = s.salary_phase4

    fixed = get_infra_cost(s, month) + get_hiring_cost(s.name, month)[0]
    burn = fixed + net_to_employer(target)

    if treasury < burn * 2:
        caps = [s.salary_phase1, s.salary_phase2, s.salary_phase3, s.salary_phase3]
        idx = min(3, (month - 1) // 12)
        target = min(target, caps[idx])

    affordable = max(0, (gross_profit - fixed) / FOUNDER_EMPLOYER_COST * FOUNDER_NET_TARGET)
    return min(target, affordable)


def founder_dividend_quarterly(
    s: Scenario,
    month: int,
    quarter_profit: float,
    treasury: float,
    burn_mensuel: float,
) -> Tuple[float, float]:
    """
    Dividendes trimestriels SAS → PFU net perso (holding optionnelle dès holding_start_month).
    Retourne (dividende_brut_société, dividende_net_fondateur).
    """
    mode = getattr(s, "remuneration_mode", "salaire")
    if mode not in ("dividendes", "mix", "optimal"):
        return 0.0, 0.0
    if month < 24 or month % 3 != 0 or quarter_profit <= 0:
        return 0.0, 0.0
    if treasury < burn_mensuel * TRESO_MOIS_MIN_DIVIDENDE:
        return 0.0, 0.0

    # Réserve légale · bénéfice distribuable
    after_reserve = quarter_profit * (1 - RESERVE_LEGALE_PCT)
    is_rate = effective_is_rate(month, after_reserve * 4)
    after_is = after_reserve * (1 - is_rate)

    payout = DIVIDEND_PAYOUT_RATIO
    if 37 <= month <= 48:
        payout = min(payout, DIVIDEND_PAYOUT_SERIES_A_CAP)

    distrib_brut = after_is * payout * FOUNDER_SHARE_PCT
    holding_from = getattr(s, "holding_start_month", 0) or 0
    mere_fille = holding_from and month >= holding_from + HOLDING_MERE_FILLE_DELAY

    if mere_fille:
        distrib_brut *= 1 - HOLDING_QUOTE_PART_IS * IS_TAUX_SIMPLIFIE

    annual_div_net_est = distrib_brut * (1 - PFU_DIVIDENDE) * 4
    pfu = effective_pfu_on_dividends(month, holding_from, annual_div_net_est)
    distrib_net = distrib_brut * (1 - pfu)

    if mode == "optimal" and month >= 30:
        distrib_net = max(0.0, distrib_net - PER_MENSUEL_NET * 3)

    return distrib_brut, distrib_net


def marketplace_commission(s: Scenario, teams: float, month: int) -> Tuple[float, float, float, float]:
    """
    Commission missions vacataires basée sur GMV réel.
    Retourne (mrr_commission_net, gmv_mensuel, missions_mois, taux_commission_moyen).
    """
    if s.marketplace_start_month == 0 or month < s.marketplace_start_month:
        return 0.0, 0.0, 0.0, 0.0

    year = month / 12
    mix = get_plan_mix(year)
    eligible_share = mix["continental"] + mix["pro"]
    # Taux blended : majorité 12 %, part Pro 10 %
    pro_share = mix["pro"] / max(eligible_share, 0.01)
    avg_take_rate = MISSION_TAKE_RATE_STANDARD * (1 - pro_share) + MISSION_TAKE_RATE_PRO * pro_share

    ramp = min(1.0, (month - s.marketplace_start_month) / MISSION_RAMP_MONTHS)
    missions_per_eligible_team_month = (
        MISSIONS_PER_ELIGIBLE_TEAM_YEAR * MISSION_PLATFORM_SHARE * ramp / 12
    )
    eligible_teams = teams * eligible_share
    missions_month = eligible_teams * missions_per_eligible_team_month
    gmv_monthly = missions_month * MISSION_AVG_GMV
    commission_gross = gmv_monthly * avg_take_rate
    stripe_cost = gmv_monthly * MISSION_STRIPE_CONNECT_COST_PCT
    commission_net = max(0, commission_gross - stripe_cost * 0.45)

    return commission_net, gmv_monthly, missions_month, avg_take_rate * 100


def enterprise_mrr(s: Scenario, month: int) -> float:
    if s.enterprise_mrr_start_month == 0 or month < s.enterprise_mrr_start_month:
        return 0
    ramp = min(1.0, (month - s.enterprise_mrr_start_month) / 36)
    return s.enterprise_mrr_at_maturity * ramp


def compute_gross_profit(
    teams: float,
    independents: float,
    mrr_marketplace: float,
    mrr_enterprise: float,
    month: int,
    arpu_factor: float = 1.0,
) -> Tuple[float, float, float, float, float, float]:
    """Retourne MRR détail + marge brute après COGS variables."""
    team_arpu, team_cogs = blended_team_arpu(month, arpu_factor)
    indep_arpu, indep_cogs = blended_indep_arpu()

    mrr_teams = teams * team_arpu
    mrr_indep = independents * indep_arpu
    mrr_subscriptions = mrr_teams + mrr_indep

    cogs_teams = teams * team_cogs
    cogs_indep = independents * indep_cogs
    cogs_marketplace = mrr_marketplace * 0.06  # ops matching, litiges (net déjà hors Stripe)
    cogs_enterprise = mrr_enterprise * 0.05

    mrr_total = mrr_subscriptions + mrr_marketplace + mrr_enterprise
    cogs_total = cogs_teams + cogs_indep + cogs_marketplace + cogs_enterprise
    gross_profit = mrr_total - cogs_total

    return (
        mrr_subscriptions,
        mrr_teams,
        mrr_indep,
        team_arpu,
        mrr_total,
        gross_profit,
    )


def valuation_multiple(
    arr: float,
    growth_yoy: float,
    churn_annual: float,
    s: Scenario,
    month: int,
    independents: float,
    teams: float,
) -> float:
    """Multiple ARR dynamique — bonus options produit (ERP, réseau, marketplace)."""
    if arr < 100_000:
        base = 3.5
    elif arr < 500_000:
        base = 5.5
    elif arr < 1_500_000:
        base = 7.5
    elif arr < 5_000_000:
        base = 9.5
    elif arr < 10_000_000:
        base = 11.5
    elif arr < 15_000_000:
        base = 14.0
    elif arr < 25_000_000:
        base = 16.0
    else:
        base = 17.0

    if growth_yoy > 1.0:
        base += 1.5
    elif growth_yoy > 0.6:
        base += 0.8
    elif growth_yoy > 0.3:
        base += 0.3

    if churn_annual < 0.08:
        base += 1.0
    elif churn_annual < 0.12:
        base += 0.5
    elif churn_annual > 0.18:
        base -= 1.0

    # Bonus options produit (impact valorisation)
    if month >= s.erp_module_live_month:
        base += 0.8  # mini-ERP SEPA/FEC/facturation → TAM Continental/Pro élargi
    if s.marketplace_start_month and month >= s.marketplace_start_month:
        base += 1.4  # marketplace GMV + commission vacataires (effet réseau bilateral)
    if month >= getattr(s, "world_start_month", 999) and month >= s.world_start_month:
        base += 0.5  # TAM mondial vs Ippogee FR-centric
    if month >= s.independents_paid_month and independents > 50:
        base += 0.6  # réseau B2C talents
    if month >= s.independents_paid_month and independents > 2000:
        base += 0.5  # effet réseau à scale
    if month >= s.partner_portal_month:
        base += 0.3  # portail sponsors
    if month >= s.gps_fleet_month:
        base += 0.2  # complétude logistique
    if month >= getattr(s, "camp_monitoring_month", 1):
        base += 0.4  # suivi stage / wellness / altitude — stickiness perf vs Ippogee

    # Réseau endurance : organisateur cyclisme (M24+) puis multisport (M36+)
    if getattr(s, "multisport", False):
        if month >= 24:
            base += 0.25  # portail organisateur — place de marché bilatérale
        if month >= 36:
            base += 0.25  # triathlon
        if month >= 60:
            base += 0.15  # running

    # Ratio indépendants/équipes = effet réseau scouting
    if teams > 0 and independents / teams > 2:
        base += 0.4

    return min(base, 20.0)


def simulate(s: Scenario) -> Tuple[List[Dict], Optional[int], Optional[int]]:
    churn_m = monthly_churn(s.churn_annual)
    churn_indep_m = monthly_churn(s.churn_indep_annual)
    teams = 0.0
    independents = 0.0
    treasury = s.treasury_start
    rows = []
    month_15k: Optional[int] = None
    month_100m: Optional[int] = None
    prev_arr = 0.0
    quarter_profit = 0.0
    cumul_dividendes_net = 0.0
    cumul_salaire_net = 0.0
    multisport_counters = init_multisport_counters() if getattr(s, "multisport", False) else None

    for m in range(1, s.months + 1):
        teams_after_churn = teams * (1 - churn_m)
        indep_after_churn = independents * (1 - churn_indep_m)
        new_teams = apply_tam_cap(
            teams_after_churn, get_new_teams(s, m), getattr(s, "tam_cap_teams", 0) or 0
        )
        new_indep = apply_tam_cap(
            indep_after_churn,
            get_new_independents(s, m),
            getattr(s, "tam_cap_independents", 0) or 0,
        )
        teams = teams_after_churn + new_teams
        independents = indep_after_churn + new_indep
        _, _, arpu_factor, intl_share = international_factors(s, m)

        mrr_marketplace, gmv_marketplace, missions_mois, commission_pct = marketplace_commission(
            s, teams, m
        )
        mrr_enterprise = enterprise_mrr(s, m)

        (
            mrr_subscriptions,
            mrr_teams,
            mrr_indep,
            team_arpu,
            mrr,
            gross_profit,
        ) = compute_gross_profit(
            teams, independents, mrr_marketplace, mrr_enterprise, m, arpu_factor
        )

        mrr_multisport = 0.0
        cogs_multisport = 0.0
        ms = {tier["key"]: 0.0 for tier in MULTISPORT_TIERS}
        if multisport_counters is not None:
            multisport_counters, mrr_multisport, cogs_multisport = step_multisport(
                m, multisport_counters
            )
            ms = dict(multisport_counters)
            gross_profit += mrr_multisport - cogs_multisport
            mrr += mrr_multisport

        ms_clients = sum(ms.values())
        ms_org = ms.get("organisateurs_solo", 0) + ms.get("organisateurs_pro", 0)

        arr = mrr * 12
        gross_margin_pct = (gross_profit / mrr * 100) if mrr > 0 else 0

        growth_yoy = (arr - prev_arr) / prev_arr if prev_arr > 0 and m % 12 == 0 else 0.3
        if m % 12 == 0:
            prev_arr = arr

        infra = get_infra_cost(s, m)
        hiring, roles = get_hiring_cost(s.name, m)
        holding_from = getattr(s, "holding_start_month", 0) or 0
        holding_ec = (HOLDING_EC_ANNUAL / 12) if holding_from and m >= holding_from else 0.0
        if m == holding_from and holding_from:
            treasury -= HOLDING_SETUP_COST

        salary_net = founder_salary(s, m, gross_profit, treasury)
        salary_cost = net_to_employer(salary_net)
        fixed_total = infra + hiring + holding_ec
        total_cost = fixed_total + salary_cost

        if m in s.fundraising:
            treasury += s.fundraising[m]

        net = gross_profit - total_cost
        treasury += net
        quarter_profit += net

        dividend_brut, dividend_net = founder_dividend_quarterly(
            s, m, quarter_profit, treasury, total_cost
        )
        if dividend_brut > 0:
            treasury -= dividend_brut
            quarter_profit = 0.0

        cumul_salaire_net += salary_net
        cumul_dividendes_net += dividend_net

        remuneration_net = salary_net + dividend_net
        remuneration_annuelle_lissée = (cumul_salaire_net + cumul_dividendes_net) / m * 12

        mult = valuation_multiple(
            arr, growth_yoy if m >= 24 else 0.5, s.churn_annual, s, m, independents, teams
        )
        val = arr * mult

        if month_15k is None and (
            remuneration_net >= FOUNDER_NET_TARGET * 0.95
            or remuneration_annuelle_lissée >= FOUNDER_NET_TARGET * 12 * 0.95
        ):
            month_15k = m
        if month_100m is None and val >= TARGET_VALUATION:
            month_100m = m

        headcount = len(set(roles)) + 1

        rows.append({
            "scenario": s.label,
            "mois": m,
            "date_calendrier": month_to_calendar(m),
            "annee": f"Y{(m - 1) // 12 + 1}",
            "equipes": round(teams, 1),
            "independants": round(independents, 0),
            "organisateurs": round(ms_org, 0),
            "organisateurs_solo": round(ms.get("organisateurs_solo", 0), 0),
            "organisateurs_pro": round(ms.get("organisateurs_pro", 0), 0),
            "clubs_tri": round(ms.get("clubs_tri", 0), 0),
            "coachs_tri": round(ms.get("coachs_tri", 0), 0),
            "athletes_tri": round(ms.get("athletes_tri", 0), 0),
            "coachs_running": round(ms.get("coachs_running", 0), 0),
            "clubs_running": round(ms.get("clubs_running", 0), 0),
            "clients_multisport": round(ms_clients, 0),
            "clients_total_endurance": round(teams + independents + ms_clients, 0),
            "mrr_multisport": round(mrr_multisport, 0),
            "part_mrr_multisport_pct": round((mrr_multisport / mrr * 100) if mrr > 0 else 0, 1),
            "arpu_equipe": round(team_arpu, 0),
            "mrr_equipes": round(mrr_teams, 0),
            "mrr_independants": round(mrr_indep, 0),
            "mrr_abonnements": round(mrr_subscriptions, 0),
            "mrr_marketplace": round(mrr_marketplace, 0),
            "gmv_marketplace_mois": round(gmv_marketplace, 0),
            "missions_vacataires_mois": round(missions_mois, 1),
            "commission_missions_pct": round(commission_pct, 1),
            "part_mrr_international_pct": round(intl_share * 100, 1),
            "mrr_enterprise": round(mrr_enterprise, 0),
            "mrr_total": round(mrr, 0),
            "arr": round(arr, 0),
            "marge_brute_pct": round(gross_margin_pct, 1),
            "marge_brute_eur": round(gross_profit, 0),
            "cogs_variables": round(mrr - gross_profit, 0),
            "couts_infra_outils": round(infra, 0),
            "couts_rh_equipe": round(hiring, 0),
            "effectif_etp": headcount,
            "salaire_fondateur_net": round(salary_net, 0),
            "dividendes_fondateur_net": round(dividend_net, 0),
            "remuneration_totale_net": round(remuneration_net, 0),
            "remuneration_lissee_annuelle": round(remuneration_annuelle_lissée, 0),
            "mode_remuneration": getattr(s, "remuneration_mode", "salaire"),
            "cout_total_mensuel": round(total_cost, 0),
            "resultat_net": round(net, 0),
            "tresorerie": round(treasury, 0),
            "multiple_valorisation": round(mult, 1),
            "valorisation_eur": round(val, 0),
            "vs_ippogee": "DÉPASSÉ" if val > IPPOGEE_VAL_MID else "En cours",
            "objectif_15k": "OUI" if salary_net >= FOUNDER_NET_TARGET * 0.95 else "",
            "objectif_100M": "OUI" if val >= TARGET_VALUATION else "",
        })

    return rows, month_15k, month_100m


def build_unit_economics_sheet() -> List[Dict]:
    rows = []
    for plan_id, data in PLAN_UNIT_ECONOMICS.items():
        prix = data["prix_mensuel"]
        cogs = data["cogs_variable"]
        contrib = prix - cogs
        rows.append({
            "plan": plan_id,
            "prix_mensuel_eur": prix,
            "prix_annuel_equiv_mois": data["prix_annuel_equiv"],
            "cogs_variable_mois": cogs,
            "marge_contribution_eur": round(contrib, 2),
            "marge_contribution_pct": round(contrib / prix * 100, 1),
            "seuil_equipes_seules": math.ceil(3550 / contrib) if contrib > 0 else "",
            "note_cogs": (
                "Firebase, Stripe, storage, support"
                if "club" in plan_id or "competition" in plan_id
                else "Idem + OCR/Gemini/scouting" if "continental" in plan_id or "pro" in plan_id
                else "Stripe, Firebase, support léger"
            ),
        })
    return rows


def build_pricing_justification() -> List[Dict]:
    """Justification prix vs coûts fixes — seuils rentabilité (scénario leaderGlobal)."""
    s = next(sc for sc in SCENARIOS if sc.name == "leaderGlobal")
    checkpoints = [
        ("Y1 solo (M6)", 6),
        ("Y1 fin (M12)", 12),
        ("Y2 lean (M18)", 18),
        ("Y2 Seed (M24)", 24),
        ("Y3 équipe (M30)", 30),
        ("Y3 scale (M36)", 36),
        ("Y4 Series A (M48)", 48),
        ("Y5 leader (M60)", 60),
    ]
    indep_arpu, indep_cogs = blended_indep_arpu()
    indep_contrib = indep_arpu - indep_cogs
    rows = []
    for label, month in checkpoints:
        fixed = get_infra_cost(s, month) + get_hiring_cost(s.name, month)[0]
        arpu, cogs = blended_team_arpu(month)
        contrib = arpu - cogs
        teams_be = math.ceil(fixed / contrib) if contrib > 0 else 0
        blended_contrib = 0.65 * contrib + 0.35 * indep_contrib
        mixed_be = math.ceil(fixed / blended_contrib) if blended_contrib > 0 else 0
        founder_net = SALAIRE_OPTIMAL_M13_24 if month <= 24 else SALAIRE_OPTIMAL_M25_PLUS
        founder_cost = net_to_employer(founder_net)
        fixed_with_founder = fixed + founder_cost
        teams_be_founder = math.ceil(fixed_with_founder / contrib) if contrib > 0 else 0
        mixed_be_founder = math.ceil(fixed_with_founder / blended_contrib) if blended_contrib > 0 else 0
        rows.append({
            "phase": label,
            "mois": month,
            "couts_fixes_hors_fondateur": round(fixed, 0),
            "cout_fondateur_employeur": round(founder_cost, 0),
            "couts_fixes_total": round(fixed_with_founder, 0),
            "arpu_equipe_blended": round(arpu, 0),
            "cogs_variable_equipe": round(cogs, 0),
            "contribution_marge_equipe": round(contrib, 0),
            "contribution_marge_indep": round(indep_contrib, 1),
            "seuil_equipes_seules": teams_be,
            "seuil_mixte_65_35": mixed_be,
            "seuil_equipes_avec_fondateur": teams_be_founder,
            "seuil_mixte_avec_fondateur": mixed_be_founder,
            "mrr_seuil_point_mort": round(fixed_with_founder / 0.86, 0),
            "commentaire": (
                f"Point mort opérationnel ~{mixed_be_founder} clients mixtes · "
                f"15K net réel M45 (dividendes)"
            ),
        })
    return rows


def build_catalogue_charges() -> List[Dict]:
    """Catalogue exhaustif des charges possibles LogiCycle (SAS · cyclisme SaaS)."""
    rows = [
        # COGS variables
        {"categorie": "COGS variable", "poste": "Stripe abonnements (~2 % + 0,25 €/tx)", "type": "variable", "base_calcul": "% MRR équipes/indép.", "montant_indicatif_eur": "1–6 €/client/mois", "phase": "M1+", "obligatoire": "OUI", "notes": "Inclus dans COGS par plan"},
        {"categorie": "COGS variable", "poste": "Firebase Blaze (Firestore, Auth, Functions, FCM)", "type": "variable", "base_calcul": "€/client actif", "montant_indicatif_eur": "1,5–4 €/client/mois", "phase": "M1+", "obligatoire": "OUI", "notes": "Scale avec usage · index scouting"},
        {"categorie": "COGS variable", "poste": "Cloud Storage (photos, justificatifs, exports)", "type": "variable", "base_calcul": "€/client actif", "montant_indicatif_eur": "0,5–3 €/client/mois", "phase": "M1+", "obligatoire": "OUI", "notes": "Pro/Continental plus lourd"},
        {"categorie": "COGS variable", "poste": "Google Gemini / OCR (factures, nutrition)", "type": "variable", "base_calcul": "€/client Compétition+", "montant_indicatif_eur": "4–12 €/client/mois", "phase": "M1+", "obligatoire": "NON", "notes": "Compétition+ uniquement"},
        {"categorie": "COGS variable", "poste": "Support client amorti (email, onboarding)", "type": "variable", "base_calcul": "€/client actif", "montant_indicatif_eur": "2,5–5 €/client/mois", "phase": "M1+", "obligatoire": "OUI", "notes": "CSM réduit le coût unitaire"},
        {"categorie": "COGS variable", "poste": "Stripe Connect marketplace (~3,2 % GMV)", "type": "variable", "base_calcul": "% GMV missions", "montant_indicatif_eur": "26 €/mission moy.", "phase": "M18+", "obligatoire": "OUI", "notes": "Déduit avant commission nette 12 %"},
        {"categorie": "COGS variable", "poste": "Ops marketplace (litiges, matching, modération)", "type": "variable", "base_calcul": "6 % MRR marketplace", "montant_indicatif_eur": "variable", "phase": "M18+", "obligatoire": "OUI", "notes": "Dans compute_gross_profit"},
        {"categorie": "COGS variable", "poste": "Enterprise support & SLA (5 % MRR enterprise)", "type": "variable", "base_calcul": "% MRR enterprise", "montant_indicatif_eur": "variable", "phase": "M36+", "obligatoire": "NON", "notes": "WT / fédérations"},
        # Infra & outils fixes
        {"categorie": "Infra & outils", "poste": "Firebase plan minimum / monitoring", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "200–400", "phase": "M1–M12", "obligatoire": "OUI", "notes": "Inclus dans infra_m1_12"},
        {"categorie": "Infra & outils", "poste": "Domaines, DNS, email pro (Google Workspace)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "50–120", "phase": "M1+", "obligatoire": "OUI", "notes": ""},
        {"categorie": "Infra & outils", "poste": "GitHub, CI/CD, Sentry, analytics", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "100–300", "phase": "M1+", "obligatoire": "OUI", "notes": ""},
        {"categorie": "Infra & outils", "poste": "Figma, Notion, outils design/PM", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "80–200", "phase": "M1+", "obligatoire": "OUI", "notes": ""},
        {"categorie": "Infra & outils", "poste": "Traccar GPS / serveur flotte (optionnel)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "50–150", "phase": "M12+", "obligatoire": "NON", "notes": "Upsell Pro"},
        {"categorie": "Infra & outils", "poste": "Conformité RGPD (audit, DPO externalisé)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "150–400", "phase": "M1+", "obligatoire": "OUI", "notes": "Panel GDPR · exports"},
        {"categorie": "Infra & outils", "poste": "i18n / support multilingue (+8–14 % infra)", "type": "fixe", "base_calcul": "uplift % infra", "montant_indicatif_eur": "8–14 %", "phase": "M18+", "obligatoire": "OUI", "notes": "EU + monde anglophone"},
        {"categorie": "Infra & outils", "poste": "Scale infra (M25–M60)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "8 500–15 000", "phase": "M25–M60", "obligatoire": "OUI", "notes": "Firestore, CDN, backups"},
        {"categorie": "Infra & outils", "poste": "Scale infra mature (M61+)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "32 000+", "phase": "M61+", "obligatoire": "OUI", "notes": "10 K+ indép. · multi-région"},
        # RH & prestations
        {"categorie": "RH & prestations", "poste": "Comptable / expert-comptable", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "250", "phase": "M3+", "obligatoire": "OUI", "notes": "Freelance · liasse SAS"},
        {"categorie": "RH & prestations", "poste": "Designer UI/UX (mission)", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "800", "phase": "M6+", "obligatoire": "NON", "notes": "Freelance"},
        {"categorie": "RH & prestations", "poste": "Avocat RGPD / contrats SaaS", "type": "fixe", "base_calcul": "€/mois", "montant_indicatif_eur": "500", "phase": "M6+", "obligatoire": "OUI", "notes": "CGU · DPA · marketplace"},
        {"categorie": "RH & prestations", "poste": "Account Executive France", "type": "fixe", "base_calcul": "€/mois employeur", "montant_indicatif_eur": "4 500", "phase": "M24+", "obligatoire": "NON", "notes": "CDI · leaderGlobal"},
        {"categorie": "RH & prestations", "poste": "AE Anglophone (US/AU)", "type": "fixe", "base_calcul": "€/mois employeur", "montant_indicatif_eur": "4 800", "phase": "M30+", "obligatoire": "NON", "notes": "CDI"},
        {"categorie": "RH & prestations", "poste": "Customer Success Manager", "type": "fixe", "base_calcul": "€/mois employeur", "montant_indicatif_eur": "3 500", "phase": "M36+", "obligatoire": "NON", "notes": "CDI · churn ↓"},
        {"categorie": "RH & prestations", "poste": "Sales Manager / Head of Sales", "type": "fixe", "base_calcul": "€/mois employeur", "montant_indicatif_eur": "5 500–7 000", "phase": "M42–M48", "obligatoire": "NON", "notes": "Post-Series A"},
        {"categorie": "RH & prestations", "poste": "Country lead (UK/US/AU) — commission", "type": "variable", "base_calcul": "15 % ARR pays", "montant_indicatif_eur": "variable", "phase": "M18+", "obligatoire": "NON", "notes": "Pas de salaire fixe · modèle Bourbon"},
        {"categorie": "RH & prestations", "poste": "Dev full-stack / mobile / DevOps", "type": "fixe", "base_calcul": "€/mois employeur", "montant_indicatif_eur": "5 500–5 800", "phase": "M18+", "obligatoire": "NON", "notes": "Selon scénario"},
        # Fondateur & holding
        {"categorie": "Fondateur", "poste": "Salaire net président SAS (optimal M1–12)", "type": "fixe", "base_calcul": "€ net/mois", "montant_indicatif_eur": "2 000", "phase": "M1–M12", "obligatoire": "OUI", "notes": "Évite requalification URSSAF"},
        {"categorie": "Fondateur", "poste": "Salaire net président (M13–24)", "type": "fixe", "base_calcul": "€ net/mois", "montant_indicatif_eur": "2 500", "phase": "M13–M24", "obligatoire": "OUI", "notes": "~30 % PASS"},
        {"categorie": "Fondateur", "poste": "Salaire net président (M25+)", "type": "fixe", "base_calcul": "€ net/mois", "montant_indicatif_eur": "5 000", "phase": "M25+", "obligatoire": "OUI", "notes": "Plafond volontaire · reste en dividendes"},
        {"categorie": "Fondateur", "poste": "Charges patronales salaire fondateur", "type": "fixe", "base_calcul": "×1,87 du net (28K/15K)", "montant_indicatif_eur": "3 730–9 330", "phase": "M1+", "obligatoire": "OUI", "notes": "net_to_employer()"},
        {"categorie": "Fondateur", "poste": "PER épargne retraite (optimal M30+)", "type": "fixe", "base_calcul": "€ net/mois", "montant_indicatif_eur": "500", "phase": "M30+", "obligatoire": "NON", "notes": "Déduit des dividendes distribuables"},
        {"categorie": "Fondateur", "poste": "PFU dividendes (30 % ou barème)", "type": "variable", "base_calcul": "% dividende brut", "montant_indicatif_eur": "27–30 %", "phase": "M24+", "obligatoire": "NON", "notes": "Charge perso · pas société"},
        {"categorie": "Fondateur", "poste": "Holding SAS mère — montage", "type": "ponctuel", "base_calcul": "one-off", "montant_indicatif_eur": "6 500", "phase": "M24", "obligatoire": "NON", "notes": "Avocat + greffe"},
        {"categorie": "Fondateur", "poste": "Holding — EC annuel", "type": "fixe", "base_calcul": "€/an", "montant_indicatif_eur": "1 800", "phase": "M24+", "obligatoire": "NON", "notes": "150 €/mois"},
        # Fiscalité société
        {"categorie": "Fiscalité société", "poste": "Impôt sur les sociétés (IS 25 % · JEI 10 % M1–36)", "type": "variable", "base_calcul": "% bénéfice", "montant_indicatif_eur": "10–25 %", "phase": "M1+", "obligatoire": "OUI", "notes": "Avant dividendes"},
        {"categorie": "Fiscalité société", "poste": "Réserve légale (5 % bénéfice)", "type": "variable", "base_calcul": "% bénéfice", "montant_indicatif_eur": "5 %", "phase": "M1+", "obligatoire": "OUI", "notes": "Jusqu'à 10 % capital"},
        {"categorie": "Fiscalité société", "poste": "CFE / CVAE / taxes locales", "type": "fixe", "base_calcul": "€/an", "montant_indicatif_eur": "500–2 000", "phase": "M1+", "obligatoire": "OUI", "notes": "Faible early stage"},
        {"categorie": "Fiscalité société", "poste": "TVA (collectée / déductible)", "type": "neutre", "base_calcul": "flux", "montant_indicatif_eur": "20 %", "phase": "M1+", "obligatoire": "OUI", "notes": "Neutre trésorerie si B2B"},
        # Commercial & marketing
        {"categorie": "Commercial", "poste": "CAC paid (Meta, Google, LinkedIn)", "type": "variable", "base_calcul": "€/équipe acquise", "montant_indicatif_eur": "400–1 200", "phase": "M1+", "obligatoire": "NON", "notes": "Continental+ · pas clubs"},
        {"categorie": "Commercial", "poste": "Parrainage (-10 % filleul + 1 mois parrain)", "type": "variable", "base_calcul": "€/conversion", "montant_indicatif_eur": "50–300", "phase": "M1+", "obligatoire": "NON", "notes": "CAC organique maîtrisé"},
        {"categorie": "Commercial", "poste": "Advisor WT (intro DS) — commission Y1", "type": "variable", "base_calcul": "10 % ARR Y1", "montant_indicatif_eur": "variable", "phase": "M1+", "obligatoire": "NON", "notes": "Voie EN"},
        {"categorie": "Commercial", "poste": "Salon / événement cyclisme (Eurobike, etc.)", "type": "ponctuel", "base_calcul": "€/an", "montant_indicatif_eur": "3 000–8 000", "phase": "M12+", "obligatoire": "NON", "notes": ""},
        {"categorie": "Commercial", "poste": "Stripe Billing / Connect setup prod", "type": "ponctuel", "base_calcul": "one-off", "montant_indicatif_eur": "0–500", "phase": "M1", "obligatoire": "OUI", "notes": "Config · pas dev"},
        # Juridique & one-off
        {"categorie": "Juridique", "poste": "Création SAS + statuts", "type": "ponctuel", "base_calcul": "one-off", "montant_indicatif_eur": "1 500–3 000", "phase": "Pré-M1", "obligatoire": "OUI", "notes": ""},
        {"categorie": "Juridique", "poste": "PI / marque LogiCycle (INPI)", "type": "ponctuel", "base_calcul": "one-off", "montant_indicatif_eur": "500–1 500", "phase": "M1–M6", "obligatoire": "NON", "notes": ""},
        {"categorie": "Juridique", "poste": "Assurance RC Pro / cyber", "type": "fixe", "base_calcul": "€/an", "montant_indicatif_eur": "800–2 500", "phase": "M1+", "obligatoire": "OUI", "notes": "WT exigent parfois"},
        {"categorie": "Juridique", "poste": "Due diligence juridique (Seed/Series A)", "type": "ponctuel", "base_calcul": "one-off", "montant_indicatif_eur": "5 000–15 000", "phase": "M24/M48", "obligatoire": "NON", "notes": "Levée"},
    ]
    return rows


def build_seuils_rentabilite() -> List[Dict]:
    """Seuils de rentabilité — théoriques + simulés (leaderGlobal)."""
    s = next(sc for sc in SCENARIOS if sc.name == "leaderGlobal")
    rows_sim, _, _ = simulate(s)
    indep_arpu, indep_cogs = blended_indep_arpu()
    indep_contrib = indep_arpu - indep_cogs

    def find_month(predicate):
        for r in rows_sim:
            if predicate(r):
                return r
        return None

    thresholds = [
        ("Niveau 1 — Marge brute ≥ fixes (infra + RH, hors fondateur)", lambda r: float(r["marge_brute_eur"]) >= float(r["couts_infra_outils"]) + float(r["couts_rh_equipe"])),
        ("Niveau 2 — Point mort opérationnel (résultat net ≥ 0)", lambda r: float(r["resultat_net"]) >= 0),
        ("Niveau 3 — Trésorerie ≥ 6 mois de burn", lambda r: float(r["tresorerie"]) >= abs(min(0, float(r["resultat_net"]))) * 6 or float(r["resultat_net"]) > 0),
        ("Niveau 4 — Rémunération fondateur ≥ 15 K€ net/mois", lambda r: float(r["remuneration_totale_net"]) >= FOUNDER_NET_TARGET * 0.95),
        ("Niveau 5 — Marge nette ≥ 20 % du MRR", lambda r: float(r["mrr_total"]) > 0 and float(r["resultat_net"]) / float(r["mrr_total"]) >= 0.20),
    ]

    sim_rows = []
    for name, pred in thresholds:
        hit = find_month(pred)
        sim_rows.append({
            "type": "simule",
            "niveau": name,
            "mois": hit["mois"] if hit else "",
            "date_calendrier": hit["date_calendrier"] if hit else ">horizon",
            "mrr_total": hit["mrr_total"] if hit else "",
            "arr": hit["arr"] if hit else "",
            "equipes": hit["equipes"] if hit else "",
            "independants": hit["independants"] if hit else "",
            "cout_total_mensuel": hit["cout_total_mensuel"] if hit else "",
            "resultat_net": hit["resultat_net"] if hit else "",
            "remuneration_fondateur_net": hit["remuneration_totale_net"] if hit else "",
        })

    # Sensibilité théorique M18
    month = 18
    fixed = get_infra_cost(s, month) + get_hiring_cost(s.name, month)[0]
    arpu, cogs = blended_team_arpu(month)
    contrib = arpu - cogs
    founder_cost = net_to_employer(SALAIRE_OPTIMAL_M13_24)
    for pct_indep, label in [(0, "100 % équipes"), (0.35, "65 % équipes / 35 % indép."), (0.50, "50 / 50")]:
        if pct_indep == 0:
            blended = contrib
        else:
            blended = (1 - pct_indep) * contrib + pct_indep * indep_contrib
        for niveau, extra in [
            ("Point mort hors fondateur", 0),
            ("Point mort avec salaire fondateur 2,5 K€", founder_cost),
            ("Point mort avec salaire 5 K€ + charges", net_to_employer(SALAIRE_OPTIMAL_M25_PLUS)),
        ]:
            need = fixed + extra
            clients = math.ceil(need / blended) if blended > 0 else 0
            mrr_need = need / 0.86  # marge brute ~86 %
            sim_rows.append({
                "type": "theorique",
                "niveau": f"M18 · {niveau} · {label}",
                "mois": month,
                "date_calendrier": month_to_calendar(month),
                "mrr_total": round(mrr_need, 0),
                "arr": round(mrr_need * 12, 0),
                "equipes": round(clients * (1 - pct_indep), 0) if pct_indep else clients,
                "independants": round(clients * pct_indep / indep_contrib * contrib, 0) if pct_indep else 0,
                "cout_total_mensuel": round(need, 0),
                "resultat_net": 0,
                "remuneration_fondateur_net": "",
            })
    return sim_rows


def build_decomposition_charges_mensuelles(scenario_name: str = "leaderGlobal") -> List[Dict]:
    """Décomposition mensuelle P&L — scénario phare."""
    s = next(sc for sc in SCENARIOS if sc.name == scenario_name)
    rows, _, _ = simulate(s)
    out = []
    for r in rows:
        fixed_hors_fondateur = float(r["couts_infra_outils"]) + float(r["couts_rh_equipe"])
        salaire_net = float(r["salaire_fondateur_net"])
        salaire_employeur = net_to_employer(salaire_net) if salaire_net else 0
        mrr = float(r["mrr_total"])
        marge = float(r["marge_brute_eur"])
        resultat = float(r["resultat_net"])
        out.append({
            "scenario": r["scenario"],
            "mois": r["mois"],
            "date_calendrier": r["date_calendrier"],
            "annee": r["annee"],
            "mrr_total": r["mrr_total"],
            "arr": r["arr"],
            "cogs_variables": r["cogs_variables"],
            "marge_brute_eur": r["marge_brute_eur"],
            "marge_brute_pct": r["marge_brute_pct"],
            "couts_infra_outils": r["couts_infra_outils"],
            "couts_rh_equipe": r["couts_rh_equipe"],
            "couts_fixes_hors_fondateur": round(fixed_hors_fondateur, 0),
            "salaire_fondateur_net": r["salaire_fondateur_net"],
            "cout_fondateur_employeur": round(salaire_employeur, 0),
            "dividendes_fondateur_net": r["dividendes_fondateur_net"],
            "cout_total_mensuel": r["cout_total_mensuel"],
            "resultat_net": r["resultat_net"],
            "marge_nette_pct_mrr": round(resultat / mrr * 100, 1) if mrr > 0 else 0,
            "taux_couverture_fixes": round(marge / fixed_hors_fondateur * 100, 1) if fixed_hors_fondateur > 0 else 0,
            "equipes": r["equipes"],
            "independants": r["independants"],
            "point_mort": "OUI" if resultat >= 0 else "",
        })
    return out


def build_sensibilite_rentabilite() -> List[Dict]:
    """Analyse sensibilité — impact ±20 % sur le seuil de rentabilité."""
    s = next(sc for sc in SCENARIOS if sc.name == "leaderGlobal")
    month = 24
    fixed = get_infra_cost(s, month) + get_hiring_cost(s.name, month)[0] + net_to_employer(SALAIRE_OPTIMAL_M13_24)
    arpu, cogs = blended_team_arpu(month)
    contrib = arpu - cogs
    base_clients = math.ceil(fixed / contrib) if contrib > 0 else 0
    rows = []
    for factor, label in [
        (0.80, "ARPU −20 % (discount / mix Club)"),
        (1.20, "ARPU +20 % (upsell Pro)"),
        (0.80, "COGS −20 % (optimisation infra)"),
        (1.20, "COGS +20 % (usage Gemini ↑)"),
        (0.80, "Fixes −20 % (bootstrap)"),
        (1.20, "Fixes +20 % (embauche anticipée)"),
        (1.15, "Churn +15 % (rétention ↓)"),
    ]:
        if "ARPU" in label:
            c = math.ceil(fixed / (contrib * factor)) if contrib * factor > 0 else 0
        elif "COGS" in label and "−" in label:
            c = math.ceil(fixed / (arpu - cogs * factor)) if arpu - cogs * factor > 0 else 0
        elif "COGS" in label:
            c = math.ceil(fixed / (arpu - cogs * factor)) if arpu - cogs * factor > 0 else 0
        elif "Fixes" in label and "−" in label:
            c = math.ceil(fixed * factor / contrib) if contrib > 0 else 0
        elif "Fixes" in label:
            c = math.ceil(fixed * factor / contrib) if contrib > 0 else 0
        else:
            c = math.ceil(base_clients * factor)
        rows.append({
            "hypothese": label,
            "mois_reference": month,
            "seuil_equipes_base": base_clients,
            "seuil_equipes_stresse": c,
            "delta_equipes": c - base_clients,
            "delta_pct": round((c - base_clients) / base_clients * 100, 0) if base_clients else 0,
        })
    return rows


def build_valuation_impact_options() -> List[Dict]:
    """Impact valorisation des options produit — base ARR Y5 Dual-Track ~2,4 M€."""
    base_arr = 2_400_000  # Y5 phare recalibré TAM
    base_mult = 11.5
    options = [
        ("Base SaaS équipes seul (sans options)", 0, "Scénario sans ERP ni réseau"),
        ("+ Module ERP (SEPA, FEC, facturation)", 0.8, "TAM Continental/Pro, churn ↓, ARPU +15%"),
        ("+ Indépendants payants (9-12€/mois)", 0.6, "+MRR B2C, effet réseau scouting"),
        ("+ Marketplace missions vacataires (12 % GMV)", 1.4, "Revenus transactionnels bilatéraux"),
        ("+ Suivi stage / wellness / altitude", 0.4, "Stickiness perf · wedge DN/WT vs Ippogee"),
        ("+ Expansion EU + Monde", 0.5, "TAM élargi · multiple global SaaS"),
        ("+ Portail partenaires web", 0.3, "Rétention sponsors"),
        ("+ GPS flotte (Traccar)", 0.2, "Complétude logistique"),
        ("+ PWA + push FCM", 0.2, "Rétention coureurs/staff"),
        ("+ Nutrition IA + OCR", 0.3, "Stickiness Pro"),
        ("Effet réseau (ratio indép./équipes > 2)", 0.4, "Barrière concurrentielle"),
    ]
    rows = []
    cumulative = base_mult
    for name, delta, note in options:
        cumulative += delta
        rows.append({
            "option_produit": name,
            "bonus_multiple_arr": delta,
            "multiple_cumule": round(cumulative, 1),
            "valorisation_indicative_eur": round(base_arr * cumulative, 0),
            "vs_ippogee_14M": f"+{round((base_arr * cumulative / IPPOGEE_VAL_MID - 1) * 100, 0)}%",
            "commentaire": note,
        })
    return rows


def build_marketplace_commissions_sheet() -> List[Dict]:
    """Unit economics commission missions vacataires."""
    gmv = MISSION_AVG_GMV
    rows = []
    for label, rate in [
        ("Continental / Compétition", MISSION_TAKE_RATE_STANDARD),
        ("Pro", MISSION_TAKE_RATE_PRO),
    ]:
        commission = gmv * rate
        stripe = gmv * MISSION_STRIPE_CONNECT_COST_PCT
        net = commission - stripe * 0.45
        rows.append({
            "segment": label,
            "taux_commission_pct": round(rate * 100, 1),
            "gmv_moyen_mission_eur": round(gmv, 0),
            "commission_brute_eur": round(commission, 2),
            "cout_stripe_connect_eur": round(stripe, 2),
            "commission_nette_eur": round(net, 2),
            "marge_nette_pct_gmv": round(net / gmv * 100, 1),
            "missions_an_equipe_maturite": MISSIONS_PER_ELIGIBLE_TEAM_YEAR,
            "mrr_equivalent_par_equipe_eligible": round(
                MISSIONS_PER_ELIGIBLE_TEAM_YEAR * MISSION_PLATFORM_SHARE * net / 12, 0
            ),
        })
    return rows


def build_expansion_internationale_sheet() -> List[Dict]:
    phases = [
        ("Phase 1 — France + i18n EN", 1, 12, "FR + prep EN", "0–5 %", "UI EN M6 · PMF FR", "93 équipes Y1"),
        ("Phase 2a — Anglo pilote", 2, 24, "UK, IE, BE, NL", "15–25 %", "1 langue = 4 marchés · country lead UK M18", "180 équipes Y2"),
        ("Phase 2b — Anglo scale", 2, 36, "+ US, AU, CA", "35–45 %", "Stripe Connect US · anti-duplication", "420 équipes Y3"),
        ("Phase 3 — EU romane + DE", 3, 60, "ES, IT, DE, CH", "50–58 %", "Series A · ES/IT après traction EN", "950 équipes Y5"),
        ("Phase 4 — Monde", 5, 120, "LATAM, ZA, Nordics", "68–74 %", "Effet réseau global · M&A", "3 200+ équipes Y10"),
    ]
    rows = []
    for phase, start_y, end_y, markets, mrr_share, levers, kpi in phases:
        rows.append({
            "phase": phase,
            "annee_debut": f"Y{start_y}",
            "annee_fin": f"Y{end_y}",
            "marches": markets,
            "part_mrr_hors_france_cible": mrr_share,
            "leviers": levers,
            "kpi_equipes": kpi,
            "pricing_note": "USD/AUD parité ~€169 · UK £149 · ES/IT après cluster EN",
        })
    return rows


def build_expansion_anglophone_sheet() -> List[Dict]:
    """TAM anglophone + calendrier go-to-market — 1 i18n EN = UK+IE+US+AU+CA."""
    markets = [
        ("UK + Ireland", 18, 150, 8000, 180000, 149, "British Cycling · first mover EN"),
        ("Belgique (EN ops)", 18, 45, 3500, 95000, 169, "UCI Continental · sidecar FR"),
        ("Pays-Bas (EN ops)", 18, 55, 4200, 110000, 169, "NL cycling dense"),
        ("États-Unis", 28, 850, 45000, 1200000, 179, "USA Cycling · no Ippogee · TrainingPeaks gap"),
        ("Canada", 30, 90, 5500, 155000, 179, "Cycling Canada · EN/FR"),
        ("Australie", 32, 110, 6200, 175000, 179, "AusCycling · contractor marketplace"),
    ]
    rows = []
    for market, live_m, teams_tam, indep_tam, arr_potential, price_usd, note in markets:
        rows.append({
            "marche": market,
            "live_mois": live_m,
            "equipes_structurees_tam": teams_tam,
            "independants_tam": indep_tam,
            "arr_potentiel_eur": arr_potential,
            "prix_continental_usd_mois": price_usd,
            "note_strategique": note,
        })
    rows.append({
        "marche": "TOTAL cluster anglophone",
        "live_mois": 18,
        "equipes_structurees_tam": 1300,
        "independants_tam": 72400,
        "arr_potentiel_eur": 1915000,
        "prix_continental_usd_mois": "—",
        "note_strategique": "×6,4 TAM vs France seule · barrière copie si first mover EN",
    })
    return rows


def build_hiring_sheet() -> List[Dict]:
    rows = []
    for h in HIRE_PLAN:
        rows.append({
            "mois_debut": h.mois_debut,
            "annee": f"Y{(h.mois_debut - 1) // 12 + 1}",
            "role": h.role,
            "type_contrat": h.type_contrat,
            "cout_employeur_mois": h.cout_employeur_mois,
            "cout_annuel": h.cout_employeur_mois * 12,
            "scenario_cible": h.scenario,
            "phase": (
                "Phase 0 — Solo" if h.mois_debut <= 12 else
                "Phase 1 — Renfort" if h.mois_debut <= 24 else
                "Phase 2 — Équipe cœur" if h.mois_debut <= 42 else
                "Phase 3 — Scale" if h.mois_debut <= 72 else
                "Phase 4 — Leader EU"
            ),
        })
    return rows


def build_valuation_timeline(rows: List[Dict], scenario_label: str) -> List[Dict]:
    milestones = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120]
    out = []
    for m in milestones:
        r = next((x for x in rows if x["mois"] == m), None)
        if not r:
            continue
        out.append({
            "scenario": scenario_label,
            "mois": m,
            "annee": r["annee"],
            "arr": r["arr"],
            "equipes": r["equipes"],
            "independants": r["independants"],
            "mrr_total": r["mrr_total"],
            "mrr_independants": r["mrr_independants"],
            "marge_brute_pct": r["marge_brute_pct"],
            "effectif": r["effectif_etp"],
            "multiple": r["multiple_valorisation"],
            "valorisation_logicycle": r["valorisation_eur"],
            "ippogee_estime_min": IPPOGEE_VAL_MIN,
            "ippogee_estime_max": IPPOGEE_VAL_MAX,
            "ecart_vs_ippogee_pct": round((r["valorisation_eur"] / IPPOGEE_VAL_MID - 1) * 100, 0),
            "objectif_100M": "ATTEINT" if r["valorisation_eur"] >= TARGET_VALUATION else f"{round(r['valorisation_eur'] / TARGET_VALUATION * 100, 0)}%",
        })
    return out


def build_comparaison_salaire_dividendes() -> List[Dict]:
    """Comparatif fiscal simplifié — 15 K€ net/mois cible."""
    cible_annuelle = FOUNDER_NET_TARGET * 12
    cout_societe_salaire = cible_annuelle * 2.35
    net_via_dividende = (1 - IS_TAUX_SIMPLIFIE) * (1 - PFU_DIVIDENDE) * FOUNDER_SHARE_PCT
    net_via_holding = (
        (1 - IS_TAUX_SIMPLIFIE)
        * (1 - HOLDING_QUOTE_PART_IS * IS_TAUX_SIMPLIFIE)
        * (1 - (PFU_DIVIDENDE - HOLDING_PFU_RELIEF))
        * FOUNDER_SHARE_PCT
    )
    benefice_requis = cible_annuelle / net_via_dividende
    benefice_holding = cible_annuelle / net_via_holding
    salaire_min_annuel = SALAIRE_MIN_NET_M25_PLUS * 12
    salaire_mix_annuel = SALAIRE_MIX_M25_PLUS * 12
    return [
        {
            "mode": "Salaire fixe 15 K net/mois",
            "net_fondateur_annuel": cible_annuelle,
            "cout_societe_annuel": round(cout_societe_salaire, 0),
            "taux_effectif_global": "55–62 %",
            "note": "Charges assimilé-salarié · déductible IS",
        },
        {
            "mode": "Salaire min 2,5 K + dividendes (recommandé)",
            "net_fondateur_annuel": cible_annuelle,
            "cout_societe_annuel": round(salaire_min_annuel * 2.35 + benefice_requis, 0),
            "taux_effectif_global": "38–45 %",
            "note": f"Bénéfice ~{round(benefice_requis, 0):,.0f} €/an avant IS · PFU 30 %",
        },
        {
            "mode": "Mix 5 K€ salaire + dividendes",
            "net_fondateur_annuel": cible_annuelle,
            "cout_societe_annuel": round(salaire_mix_annuel * 2.35 + benefice_requis * 0.92, 0),
            "taux_effectif_global": "42–48 %",
            "note": "Retraite confortable · −8 % dividendes vs min 2,5 K",
        },
        {
            "mode": "Holding SAS mère dès M24",
            "net_fondateur_annuel": cible_annuelle,
            "cout_societe_annuel": round(benefice_holding + salaire_min_annuel * 2.35 + HOLDING_EC_ANNUAL, 0),
            "taux_effectif_global": "32–38 %",
            "note": f"Régime mère-fille · montage {HOLDING_SETUP_COST} € · EC {HOLDING_EC_ANNUAL} €/an",
        },
        {
            "mode": "Holding SAS mère (M48+ classique)",
            "net_fondateur_annuel": cible_annuelle,
            "cout_societe_annuel": round(benefice_holding * 1.02, 0),
            "taux_effectif_global": "32–40 %",
            "note": "Report montage post-Series A · optimal patrimoine long terme",
        },
    ]


def get_fiscal_variants(base: Scenario) -> List[Tuple[str, str, Scenario]]:
    """Variantes fiscales sur la même trajectoire commerciale Leader Dual-Track."""
    return [
        (
            "dividendes_min",
            "Salaire min 2,5 K + dividendes (phare)",
            replace(
                base,
                remuneration_mode="dividendes",
                holding_start_month=0,
                salary_phase3=SALAIRE_MIN_NET_M25_PLUS,
                salary_phase4=SALAIRE_MIN_NET_M25_PLUS,
            ),
        ),
        (
            "mix_5k",
            "Mix 5 K€ salaire + dividendes",
            replace(
                base,
                remuneration_mode="mix",
                holding_start_month=0,
                salary_phase3=SALAIRE_MIX_M25_PLUS,
                salary_phase4=SALAIRE_MIX_M25_PLUS,
            ),
        ),
        (
            "holding_m24",
            "Holding créée M24 · mère-fille M48",
            replace(
                base,
                remuneration_mode="dividendes",
                holding_start_month=24,
                salary_phase1=SALAIRE_OPTIMAL_M1_12,
                salary_phase3=SALAIRE_MIN_NET_M25_PLUS,
                salary_phase4=SALAIRE_MIN_NET_M25_PLUS,
            ),
        ),
        (
            "optimal_ec",
            "Stratégie optimisée EC + avocat (recommandée)",
            replace(
                base,
                remuneration_mode="optimal",
                holding_start_month=24,
                salary_phase1=SALAIRE_OPTIMAL_M1_12,
                salary_phase2=SALAIRE_OPTIMAL_M13_24,
                salary_phase3=SALAIRE_OPTIMAL_M25_PLUS,
                salary_phase4=SALAIRE_OPTIMAL_M25_PLUS,
            ),
        ),
    ]


def build_fiscal_strategie_optimisee() -> List[Dict]:
    """Plan d'action EC + avocat fiscaliste — stratégie optimisée."""
    return [
        {"phase": "M1", "date": month_to_calendar(1), "action": "Création SAS · statuts (IP, dividendes, président)", "acteur": "Avocat", "cout_eur": 2500, "priorite": "P0", "risque_si_omis": "IP perso · requalification"},
        {"phase": "M1", "date": month_to_calendar(1), "action": "Salaire président 2 000 € net min. (jamais 0 € si actif)", "acteur": "EC", "cout_eur": 0, "priorite": "P0", "risque_si_omis": "Redressement URSSAF"},
        {"phase": "M1", "date": month_to_calendar(1), "action": "Demande statut JEI (si éligible R&D · < 8 ans · indépendant)", "acteur": "EC", "cout_eur": 500, "priorite": "P1", "risque_si_omis": "IS 25 % vs 10 % sur 1er palier"},
        {"phase": "M1", "date": month_to_calendar(1), "action": "Pacte d'associés · vesting · clause IP", "acteur": "Avocat", "cout_eur": 1500, "priorite": "P0", "risque_si_omis": "Due diligence Seed bloquée"},
        {"phase": "M6", "date": month_to_calendar(6), "action": "Compte courant associé documenté si apports perso", "acteur": "EC", "cout_eur": 0, "priorite": "P1", "risque_si_omis": "Abus de biens sociaux"},
        {"phase": "M12", "date": month_to_calendar(12), "action": "1ère liasse · report déficit · revue PFU vs barème", "acteur": "EC", "cout_eur": 1200, "priorite": "P1", "risque_si_omis": "Sur-impôt dividendes"},
        {"phase": "M24", "date": month_to_calendar(24), "action": "Seed closée · 1ère AG dividendes · PV + 2777-SD", "acteur": "EC", "cout_eur": 800, "priorite": "P0", "risque_si_omis": "Distribution illégale"},
        {"phase": "M24", "date": month_to_calendar(24), "action": "Création SAS holding · apport titres LogiCycle (115-0 si éligible)", "acteur": "Avocat", "cout_eur": 6500, "priorite": "P0", "risque_si_omis": "Plus-value immédiate mal optimisée"},
        {"phase": "M24", "date": month_to_calendar(24), "action": "Dividendes SAS → perso direct (pas via holding avant M48)", "acteur": "EC", "cout_eur": 0, "priorite": "P0", "risque_si_omis": "Double imposition holding < 24 mois"},
        {"phase": "M25", "date": month_to_calendar(25), "action": "Salaire 5 000 € net · DSN · justification quote-part", "acteur": "EC", "cout_eur": 0, "priorite": "P0", "risque_si_omis": "Retraite insuffisante"},
        {"phase": "M30", "date": month_to_calendar(30), "action": "PER 500 €/mois (holding ou perso) · déduction IR", "acteur": "EC", "cout_eur": 0, "priorite": "P1", "risque_si_omis": "Retraite · pression fiscale"},
        {"phase": "M36", "date": month_to_calendar(36), "action": "BSPCE pool 10 % · attribution fondateurs/clés", "acteur": "Avocat", "cout_eur": 2000, "priorite": "P1", "risque_si_omis": "Rémunération non optimisée post-Seed"},
        {"phase": "M42", "date": month_to_calendar(42), "action": "Series A · plafond distribution 25 % · pacte investisseurs", "acteur": "Avocat", "cout_eur": 5000, "priorite": "P0", "risque_si_omis": "Blocage levée"},
        {"phase": "M48", "date": month_to_calendar(48), "action": "Activation mère-fille · dividendes via holding (24 mois détention OK)", "acteur": "EC", "cout_eur": 1800, "priorite": "P0", "risque_si_omis": "Surcoût fiscal ~8 pts"},
        {"phase": "M48", "date": month_to_calendar(48), "action": "Étude Dutreil / Pacte Dutreil si transmission familiale", "acteur": "Avocat fiscaliste", "cout_eur": 4000, "priorite": "P2", "risque_si_omis": "Droits succession 75 %"},
        {"phase": "M53", "date": month_to_calendar(53), "action": "Secondary · cession parts holding (150-0 B ter si éligible)", "acteur": "Avocat", "cout_eur": 3000, "priorite": "P1", "risque_si_omis": "PV immobilière 30 %+"},
        {"phase": "Annuel", "date": "Chaque déc.", "action": "Arbitrage PFU 30 % vs barème · CEHR si > 250 K€ RFR", "acteur": "EC", "cout_eur": 500, "priorite": "P1", "risque_si_omis": "2–4 pts impôt en trop"},
    ]


def build_fiscal_scenarios_comparatif(base: Scenario) -> Tuple[List[Dict], List[Dict]]:
    """Timeline Y1–Y10 et synthèse pour chaque variante fiscale."""
    summary: List[Dict] = []
    timeline: List[Dict] = []

    for variant_id, label, scenario in get_fiscal_variants(base):
        rows, m15, _ = simulate(scenario)
        salaire_y10 = sum(float(r["salaire_fondateur_net"]) for r in rows)
        div_y10 = sum(float(r.get("dividendes_fondateur_net", 0) or 0) for r in rows)
        total_y10 = salaire_y10 + div_y10

        y5_rows = [r for r in rows if int(r["mois"]) <= 60]
        salaire_y5 = sum(float(r["salaire_fondateur_net"]) for r in y5_rows)
        div_y5 = sum(float(r.get("dividendes_fondateur_net", 0) or 0) for r in y5_rows)

        m15_lisse = next(
            (int(r["mois"]) for r in rows if float(r.get("remuneration_lissee_annuelle", 0) or 0) >= FOUNDER_NET_TARGET * 12 * 0.95),
            None,
        )

        summary.append({
            "variante_id": variant_id,
            "variante": label,
            "mois_15k_lisse": m15_lisse or ">120",
            "date_15k_lisse": month_to_calendar(m15_lisse) if m15_lisse else ">horizon",
            "mois_15k_mois": m15 or ">120",
            "date_15k_mois": month_to_calendar(m15) if m15 else ">horizon",
            "total_net_y5": round(salaire_y5 + div_y5, 0),
            "equivalent_mensuel_y5": round((salaire_y5 + div_y5) / 60, 0),
            "salaire_cumul_y10": round(salaire_y10, 0),
            "dividendes_cumul_y10": round(div_y10, 0),
            "total_net_y10": round(total_y10, 0),
            "equivalent_mensuel_y10": round(total_y10 / 120, 0),
            "tresorerie_finale": round(float(rows[-1]["tresorerie"]), 0),
            "recommandation": (
                "Phare historique"
                if variant_id == "dividendes_min"
                else "Retraite renforcée"
                if variant_id == "mix_5k"
                else "Holding · mère-fille différée M48"
                if variant_id == "holding_m24"
                else "★ Recommandée EC + avocat"
            ),
        })

        for y in range(1, 11):
            year_rows = [x for x in rows if (int(x["mois"]) - 1) // 12 + 1 == y]
            if not year_rows:
                continue
            salaire_cumul = sum(float(x["salaire_fondateur_net"]) for x in year_rows)
            div_cumul = sum(float(x.get("dividendes_fondateur_net", 0) or 0) for x in year_rows)
            timeline.append({
                "variante_id": variant_id,
                "variante": label,
                "annee": f"Y{y}",
                "date_fin": month_to_calendar(y * 12),
                "salaire_net_annuel": round(salaire_cumul, 0),
                "dividendes_net_annuel": round(div_cumul, 0),
                "total_net_fondateur": round(salaire_cumul + div_cumul, 0),
                "equivalent_mensuel": round((salaire_cumul + div_cumul) / 12, 0),
                "mode_remuneration": year_rows[-1].get("mode_remuneration", ""),
            })

    return summary, timeline


def build_remuneration_fondateur_timeline(leader_rows: List[Dict]) -> List[Dict]:
    out = []
    for y in range(1, 11):
        m = y * 12
        year_rows = [x for x in leader_rows if (int(x["mois"]) - 1) // 12 + 1 == y]
        if not year_rows:
            continue
        salaire_cumul = sum(float(x["salaire_fondateur_net"]) for x in year_rows)
        div_cumul = sum(float(x.get("dividendes_fondateur_net", 0) or 0) for x in year_rows)
        out.append({
            "annee": f"Y{y}",
            "date_fin": month_to_calendar(m),
            "salaire_net_annuel": round(salaire_cumul, 0),
            "dividendes_net_annuel": round(div_cumul, 0),
            "total_net_fondateur": round(salaire_cumul + div_cumul, 0),
            "equivalent_mensuel": round((salaire_cumul + div_cumul) / 12, 0),
            "arr_societe": year_rows[-1]["arr"],
        })
    return out


def build_comparaison_fonctionnelle() -> List[Dict]:
    """Matrice fonctionnelle LogiCycle vs Ippogee — juillet 2026."""
    rows = [
        ("Planning saison", "Multi-équipes, congés", "Season planning + holding + archives", "LogiCycle", "Haute"),
        ("Convocations", "Digitales + suivi", "PDF + push FCM + accepter/refuser", "LogiCycle", "Haute"),
        ("Logistique course", "Summons + transport", "12 onglets événement", "LogiCycle", "Haute"),
        ("RH / contrats / paie", "Profond WT · contrats · SEPA", "Contrats + paie + OCR + SEPA pain.001/008", "Égal", "Haute"),
        ("Facturation ERP", "Devis, factures, prélèvements", "Devis → facture → FEC → rapprochement", "LogiCycle", "Haute"),
        ("Performance / PPR", "Basique", "PPR, peer review, spider, fatigue/durabilité", "LogiCycle", "Critique WT"),
        ("Suivi stage / camp", "Basique ou absent", "Wellness 1–5 · urine/USG · SpO2 · tests PMA · altitude", "LogiCycle", "Unique"),
        ("Scouting inter-équipes", "Non", "Demandes consent-based · profils indép.", "LogiCycle", "Unique"),
        ("Profils indépendants", "Non", "Coureur 9 € · Staff 12 €/mois", "LogiCycle", "Unique"),
        ("Marketplace vacataires", "Non", "12 % GMV · Stripe Connect", "LogiCycle", "Unique"),
        ("Flotte / GPS", "GPS natif intégré WT", "GPS mobile + Traccar webhook + carte live", "Ippogee", "Moyenne"),
        ("Stocks / matériel", "Codes-barres · multi-entrepôts WT", "Scan web + transferts + bike fit UCI", "Égal", "Moyenne"),
        ("Formulaires UCI", "Workflows WT intégrés", "Workflow 5 étapes + PDF J-20/J-3", "Égal", "Moyenne"),
        ("App mobile", "Native iOS / Android", "PWA + FCM · Capacitor stores T2 2026", "Ippogee", "Moyenne"),
        ("Portail partenaires", "Ipogee Partner app", "Portail web 3 onglets + PDF sponsor", "LogiCycle", "Moyenne"),
        ("Multi-équipes / holding", "Holding intégré WT", "Vue holding + conflits sélections", "LogiCycle", "Haute"),
        ("RGPD", "Partiel", "Export · purge · audit cloud · GDPR panel", "LogiCycle", "Haute"),
        ("International / EN", "FR uniquement", "UI EN · double voie FR+WT · UK/US/AU", "LogiCycle", "Critique WT"),
        ("Prix / self-serve", "12–50 K€/an · devis", "390–2 990 €/an · Stripe · essai 14 j", "LogiCycle", "Critique"),
    ]
    return [
        {
            "domaine": d,
            "ippogee": ip,
            "logicycle": lc,
            "verdict": v,
            "priorite_commerciale": p,
        }
        for d, ip, lc, v, p in rows
    ]


def build_ippogee_comparison(leader_rows: List[Dict]) -> List[Dict]:
    """Comparaison valo/ARR · notes alignées scénario Dual-Track recalibré TAM."""
    ippogee_trajectory = [
        (12, 0, 500_000, "Ippogee mature · LC : go-live FR+EN · ~70 équipes"),
        (24, 1_200_000, 3_000_000, "LC : Seed · wedge WT · val > Ippogee"),
        (36, 2_500_000, 8_000_000, "LC : marketplace mature · ARR < Ippogee · val >"),
        (48, 3_500_000, 12_000_000, "LC : Series A · val ~2× Ippogee · ARR encore <"),
        (60, 4_500_000, 16_000_000, "LC : ~2,4 M€ ARR · ~38 M€ val · Ippogee leader ARR WT"),
        (72, 5_500_000, 18_000_000, "LC : rattrapage ARR via clubs+indép. · val ×2,5"),
        (84, 6_000_000, 20_000_000, "Ippogee plafond ~6 M€ · LC ~3,5 M€ ARR · ~53 M€ val"),
        (120, 6_000_000, 20_000_000, "Y10 : LC ~5 M€ ARR + camp/wellness · ~78–80 M€ val"),
    ]
    out = []
    for m, ippogee_arr, ippogee_val, note in ippogee_trajectory:
        lc = next((r for r in leader_rows if r["mois"] == m), None)
        out.append({
            "mois": m,
            "annee": f"Y{(m - 1) // 12 + 1}",
            "ippogee_arr_estime": ippogee_arr,
            "ippogee_valorisation_estime": ippogee_val,
            "logicycle_arr": lc["arr"] if lc else "",
            "logicycle_valorisation": lc["valorisation_eur"] if lc else "",
            "logicycle_equipes": lc["equipes"] if lc else "",
            "logicycle_independants": lc["independants"] if lc else "",
            "leader_valorisation": "LogiCycle" if lc and lc["valorisation_eur"] > ippogee_val else "Ippogee",
            "leader_arr": (
                "LogiCycle" if lc and lc["arr"] > ippogee_arr
                else "Ippogee" if lc else ""
            ),
            "notes": note,
        })
    return out


def build_roadmap_100m() -> List[Dict]:
    return [
        {"phase": "M1-M18", "objectif": "PMF FR + UI EN prête", "kpi": "10 Continental FR · 3 Pro/WT wedge · i18n EN M6", "levier": "Double voie dès M1", "valorisation_cible": "0,5–1M"},
        {"phase": "M19-M28", "objectif": "Cluster anglophone UK+US", "kpi": "80 équipes · 35 % MRR hors FR · ARR ~550K", "levier": "Country lead UK M18 · advisor WT", "valorisation_cible": "3–5M"},
        {"phase": "M29-M42", "objectif": "AU/CA + marketplace EN scale", "kpi": "200 équipes · GMV 120K€/an · Seed M24", "levier": "AE anglophone · anti-duplication", "valorisation_cible": "8–15M"},
        {"phase": "M43-M60", "objectif": "Series A · ES/IT/DE sélectif", "kpi": "450 équipes · 55 % MRR intl. · ARR ~2,4M", "levier": "Effet réseau scouting global", "valorisation_cible": "25–40M"},
        {"phase": "M61-M79", "objectif": "Leader SAM cyclisme structuré", "kpi": "900 équipes · 58 % MRR intl. · ARR ~3,5M", "levier": "Series A déployée · Head of Sales", "valorisation_cible": "45–65M"},
        {"phase": "M80-M120", "objectif": "Saturation SAM + patrimoine", "kpi": "1 650 équipes · 72 % SAM (~5M ARR) · GMV 1,2M€/an", "levier": "Upside ES/LatAm · secondary fondateur", "valorisation_cible": "70–90M"},
    ]


def build_worldtour_pipeline() -> List[Dict]:
    """Pipeline WT — tiers de priorité commerciale voie EN."""
    teams = [
        ("Tier A — Staff international / EN native", "UAE Team Emirates", "Pro wedge", "EN native · scouting + PPR"),
        ("Tier A", "Israel-Premier Tech", "Pro wedge", "EN ops · marketplace staff"),
        ("Tier A", "EF Education-EasyPost", "Pro wedge", "US-owned · EN first"),
        ("Tier A", "Lidl-Trek", "Pro wedge", "US/German · EN staff"),
        ("Tier B — FR sur Ippogee · wedge", "TotalEnergies", "Pro → Enterprise", "Staff EN · coexistence Ippogee"),
        ("Tier B", "Groupama-FDJ", "Pro → Enterprise", "Wedge PPR M6 · migration M18"),
        ("Tier B", "Decathlon AG2R", "Pro → Enterprise", "Scouting cross-border"),
        ("Tier B", "Cofidis", "Pro wedge", "Performance module"),
        ("Tier C — Continental WT feeder", "Uno-X Mobility", "Continental $179", "ProTeam path"),
        ("Tier C", "Q36.5 Pro Cycling", "Continental", "EN · talent marketplace"),
        ("Tier D — Lock-in Ippogee fort", "Ineos Grenadiers", "Enterprise M24+", "Long cycle · références requises"),
        ("Tier D", "Visma-Lease a Bike", "Enterprise M24+", "Idem"),
    ]
    return [
        {
            "tier": tier,
            "equipe": team,
            "plan_cible": plan,
            "angle_commercial": angle,
            "voie": "EN",
            "langue_pitch": "EN",
        }
        for tier, team, plan, angle in teams
    ]


def build_plan_commercial_phases() -> List[Dict]:
    """Calendrier double voie FR + EN/WT — recalibré TAM réel (tam-marche-reel.md)."""
    return [
        {"phase": "0", "periode": "M1-M6", "periode_calendrier": f"{month_to_calendar(1)} – {month_to_calendar(6)}", "focus": "Double voie lancée", "kpi_equipes_fr": 5, "kpi_pro_wt": 1, "kpi_equipes_en": 3, "kpi_arr_eur": 45000, "remuneration_fondateur_net": 0, "equipe": "Fondateur 50/50 FR·EN", "investissement": "0 levée"},
        {"phase": "0", "periode": "M7-M12", "periode_calendrier": f"{month_to_calendar(7)} – {month_to_calendar(12)}", "focus": "1 WT + 8 Continental FR", "kpi_equipes_fr": 12, "kpi_pro_wt": 2, "kpi_equipes_en": 8, "kpi_arr_eur": 120000, "remuneration_fondateur_net": 0, "equipe": "Fondateur + advisor WT", "investissement": "0 levée"},
        {"phase": "0", "periode": "M13-M18", "periode_calendrier": f"{month_to_calendar(13)} – {month_to_calendar(18)}", "focus": "3 WT + 10 Continental FR", "kpi_equipes_fr": 22, "kpi_pro_wt": 3, "kpi_equipes_en": 15, "kpi_arr_eur": 250000, "remuneration_fondateur_net": 2500, "equipe": "Fondateur + UK lead M6", "investissement": "0 levée"},
        {"phase": "1", "periode": "M19-M24", "periode_calendrier": f"{month_to_calendar(19)} – {month_to_calendar(24)}", "focus": "Seed · scale WT", "kpi_equipes_fr": 45, "kpi_pro_wt": 5, "kpi_equipes_en": 30, "kpi_arr_eur": 360000, "remuneration_fondateur_net": 8000, "equipe": "AE anglophone M12", "investissement": f"Seed 750K {month_to_calendar(24)}"},
        {"phase": "1", "periode": "M25-M36", "periode_calendrier": f"{month_to_calendar(25)} – {month_to_calendar(36)}", "focus": "8 WT · US scale", "kpi_equipes_fr": 85, "kpi_pro_wt": 8, "kpi_equipes_en": 55, "kpi_arr_eur": 770000, "remuneration_fondateur_net": 11000, "equipe": "Sales team 3 AE", "investissement": "Seed déployé"},
        {"phase": "2", "periode": "M37-M48", "periode_calendrier": f"{month_to_calendar(37)} – {month_to_calendar(48)}", "focus": "Series A · ES/IT", "kpi_equipes_fr": 140, "kpi_pro_wt": 12, "kpi_equipes_en": 95, "kpi_arr_eur": 1600000, "remuneration_fondateur_net": 18000, "equipe": "Sales Manager", "investissement": f"Series A 2M {month_to_calendar(48)}"},
        {"phase": "2", "periode": "M49-M60", "periode_calendrier": f"{month_to_calendar(49)} – {month_to_calendar(60)}", "focus": "Domination WT+EN", "kpi_equipes_fr": 220, "kpi_pro_wt": 16, "kpi_equipes_en": 150, "kpi_arr_eur": 2400000, "remuneration_fondateur_net": 43000, "equipe": "Head of Sales", "investissement": "Series A déployé"},
        {"phase": "3", "periode": "M61-M79", "periode_calendrier": f"{month_to_calendar(61)} – {month_to_calendar(79)}", "focus": "Leader SAM", "kpi_equipes_fr": 380, "kpi_pro_wt": 22, "kpi_equipes_en": 280, "kpi_arr_eur": 3800000, "remuneration_fondateur_net": 55000, "equipe": "CRO prep", "investissement": "Réinvestissement"},
        {"phase": "3", "periode": "M80-M120", "periode_calendrier": f"{month_to_calendar(80)} – {month_to_calendar(120)}", "focus": "Saturation SAM · patrimoine", "kpi_equipes_fr": 650, "kpi_pro_wt": 30, "kpi_equipes_en": 500, "kpi_arr_eur": 5000000, "remuneration_fondateur_net": 92000, "equipe": "12 ETP", "investissement": "Secondary optionnel"},
    ]


def build_kpi_commerciaux_hebdo() -> List[Dict]:
    return [
        {"horizon": "M6", "equipes_nouvelles_mois": 2, "missions_publiees_mois": 5, "missions_payees_mois": 2, "gmv_marketplace_mois_eur": 1500, "independants_net_new_mois": 25, "churn_equipes_pct": 1.0, "pipeline_arr_90j_eur": 30000},
        {"horizon": "M18", "equipes_nouvelles_mois": 3, "missions_publiees_mois": 20, "missions_payees_mois": 15, "gmv_marketplace_mois_eur": 12000, "independants_net_new_mois": 45, "churn_equipes_pct": 0.8, "pipeline_arr_90j_eur": 150000},
        {"horizon": "M36", "equipes_nouvelles_mois": 5, "missions_publiees_mois": 80, "missions_payees_mois": 60, "gmv_marketplace_mois_eur": 50000, "independants_net_new_mois": 70, "churn_equipes_pct": 0.6, "pipeline_arr_90j_eur": 400000},
        {"horizon": "M60", "equipes_nouvelles_mois": 6, "missions_publiees_mois": 200, "missions_payees_mois": 150, "gmv_marketplace_mois_eur": 100000, "independants_net_new_mois": 90, "churn_equipes_pct": 0.5, "pipeline_arr_90j_eur": 800000},
    ]


def build_expansion_multisport_sheet() -> List[Dict]:
    """TAM et paliers — organisateur cyclisme AVANT triathlon + running."""
    rows = [
        {
            "segment": "Cyclisme équipes (base)",
            "unites_sam": "173 UCI + ~2 200 clubs + 16 K indép.",
            "arpu_annuel_eur": "390–2 990",
            "arr_sam_eur": TAM_CYCLING_SAM_EUR,
            "lancement_produit": "M1 déc. 2027",
            "priorite": "1 — cœur",
        },
        {
            "segment": "Organisateurs Solo (cyclisme)",
            "unites_sam": TAM_ORG_SOLO_SAM,
            "arpu_annuel_eur": 490,
            "arr_sam_eur": round(TAM_ORG_SOLO_SAM * 490 * 0.55),
            "lancement_produit": "M24",
            "priorite": "2 — AVANT triathlon · candidatures + fiche",
        },
        {
            "segment": "Organisateurs Pro (cyclisme)",
            "unites_sam": TAM_ORG_PRO_SAM,
            "arpu_annuel_eur": 1490,
            "arr_sam_eur": round(TAM_ORG_PRO_SAM * 1490 * 0.55),
            "lancement_produit": "M30",
            "priorite": "2 — roadbook · startlists · messagerie",
        },
        {
            "segment": "TOTAL portail organisateur",
            "unites_sam": TAM_ORG_SOLO_SAM + TAM_ORG_PRO_SAM,
            "arpu_annuel_eur": "490–1 490",
            "arr_sam_eur": TAM_ORG_ARR_SAM_EUR,
            "lancement_produit": "M24–M30",
            "priorite": "Effet réseau équipes ↔ organisateurs",
        },
        {
            "segment": "Clubs triathlon",
            "unites_sam": TAM_TRI_CLUBS_SAM,
            "arpu_annuel_eur": 890,
            "arr_sam_eur": round(TAM_TRI_CLUBS_SAM * 890 * 0.55),
            "lancement_produit": "M36",
            "priorite": "3 — après organisateur cyclisme",
        },
        {
            "segment": "Coachs indép. triathlon",
            "unites_sam": TAM_TRI_COACHES_SAM,
            "arpu_annuel_eur": 290,
            "arr_sam_eur": round(TAM_TRI_COACHES_SAM * 290 * 0.75),
            "lancement_produit": "M36",
            "priorite": "3 — viral coach→athlète",
        },
        {
            "segment": "Athlètes tri solo",
            "unites_sam": TAM_TRI_ATHLETES_SAM,
            "arpu_annuel_eur": 200,
            "arr_sam_eur": round(TAM_TRI_ATHLETES_SAM * 200 * 0.35),
            "lancement_produit": "M39",
            "priorite": "3 — add-on Pass Camp",
        },
        {
            "segment": "Coachs indép. running",
            "unites_sam": TAM_RUN_COACHES_SAM,
            "arpu_annuel_eur": 290,
            "arr_sam_eur": round(TAM_RUN_COACHES_SAM * 290 * 0.55),
            "lancement_produit": "M60",
            "priorite": "4 — après traction tri",
        },
        {
            "segment": "Clubs running structurés",
            "unites_sam": TAM_RUN_CLUBS_SAM,
            "arpu_annuel_eur": 390,
            "arr_sam_eur": round(TAM_RUN_CLUBS_SAM * 390 * 0.45),
            "lancement_produit": "M72",
            "priorite": "5 — fit moyen",
        },
        {
            "segment": "TOTAL multisport (tri + run)",
            "unites_sam": "—",
            "arpu_annuel_eur": "—",
            "arr_sam_eur": TAM_MULTISPORT_ARR_SAM_EUR,
            "lancement_produit": "M36–M72",
            "priorite": "Après portail organisateur",
        },
        {
            "segment": "TOTAL endurance combiné",
            "unites_sam": "—",
            "arpu_annuel_eur": "—",
            "arr_sam_eur": TAM_COMBINED_ENDURANCE_SAM_EUR + TAM_ORG_ARR_SAM_EUR,
            "lancement_produit": "—",
            "priorite": "Plafond Y10 leaderMultisport",
        },
    ]
    for tier in MULTISPORT_TIERS:
        rows.append({
            "segment": f"Palier · {tier['label']}",
            "unites_sam": tier["cap"],
            "arpu_annuel_eur": round(tier["arpu_monthly"] * 12, 0),
            "arr_sam_eur": round(tier["cap"] * tier["arpu_monthly"] * 12 * 0.5),
            "lancement_produit": f"M{tier['start_month']}",
            "priorite": tier.get("roadmap", ""),
        })
    return rows


def build_multisport_comparison(
    rows_global: List[Dict], rows_multisport: List[Dict]
) -> List[Dict]:
    """Comparaison annuelle leaderGlobal vs leaderMultisport (org + tri + run)."""
    out = []
    for y in range(1, 11):
        rg = rows_global[y * 12 - 1]
        rm = rows_multisport[y * 12 - 1]
        delta_arr = rm["arr"] - rg["arr"]
        out.append({
            "annee": f"Y{y}",
            "date_fin": rm["date_calendrier"],
            "arr_cyclisme_seul": rg["arr"],
            "arr_multisport": rm["arr"],
            "delta_arr_eur": round(delta_arr, 0),
            "delta_arr_pct": round(delta_arr / rg["arr"] * 100, 1) if rg["arr"] else 0,
            "equipes_cyclisme": rg["equipes"],
            "organisateurs": rm.get("organisateurs", 0),
            "clients_multisport": rm["clients_multisport"],
            "coachs_tri": rm["coachs_tri"],
            "coachs_running": rm["coachs_running"],
            "clubs_tri": rm["clubs_tri"],
            "athletes_tri": rm["athletes_tri"],
            "part_mrr_multisport_pct": rm["part_mrr_multisport_pct"],
            "valorisation_cyclisme": rg["valorisation_eur"],
            "valorisation_multisport": rm["valorisation_eur"],
            "remuneration_fondateur_mois": rm["remuneration_totale_net"],
        })
    return out


def build_multisport_roadmap() -> List[Dict]:
    """Roadmap produit — organisateur cyclisme AVANT triathlon."""
    return [
        {
            "phase": "P0",
            "periode": "M1–M23",
            "focus": "Cyclisme équipes · camp/wellness · dossier candidatures (côté équipe)",
            "modules": "Stages · SpO₂ · OrganizerContacts · UCI forms · Coach 29 € cyclisme",
            "clients_cibles": "Équipes UCI · clubs FFC · indép. cyclisme",
        },
        {
            "phase": "P1",
            "periode": "M24–M29",
            "focus": "Portail organisateur Solo — AVANT triathlon",
            "modules": "Fiche épreuve publique · candidatures en ligne · statuts",
            "clients_cibles": f"~{TAM_ORG_SOLO_SAM} organisateurs Solo · condition ≥150 équipes",
        },
        {
            "phase": "P2",
            "periode": "M30–M35",
            "focus": "Portail organisateur Pro — roadbook · startlists",
            "modules": "Roadbook structuré · startlists UCI/FFC · messagerie DS",
            "clients_cibles": f"~{TAM_ORG_PRO_SAM} organisateurs Pro · ligues",
        },
        {
            "phase": "P3",
            "periode": "M36–M48",
            "focus": "Triathlon — coachs + clubs (+ athlètes M39)",
            "modules": "Calendrier 3 disciplines · brick · roster tri · Pass Camp",
            "clients_cibles": f"~{TAM_TRI_COACHES_SAM} coachs · ~{TAM_TRI_CLUBS_SAM} clubs",
        },
        {
            "phase": "P4",
            "periode": "M60–M71",
            "focus": "Running — coachs indépendants",
            "modules": "Zones allure · charge km · séances piste",
            "clients_cibles": f"~{TAM_RUN_COACHES_SAM} coachs running EU",
        },
        {
            "phase": "P5",
            "periode": "M72+",
            "focus": "Running — clubs structurés",
            "modules": "Calendrier FFA · effectifs · classement clubs",
            "clients_cibles": f"~{TAM_RUN_CLUBS_SAM} gros clubs FFA",
        },
    ]


def write_csv(path: str, rows: List[Dict]) -> None:
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def main():
    all_monthly: List[Dict] = []
    all_valuation: List[Dict] = []
    summary = []

    for s in SCENARIOS:
        rows, m15, m100 = simulate(s)
        all_monthly.extend(rows)
        all_valuation.extend(build_valuation_timeline(rows, s.label))
        last = rows[-1]
        summary.append({
            "scenario": s.label,
            "lancement": LAUNCH_LABEL,
            "horizon_mois": s.months,
            "mois_objectif_15k": m15 or ">horizon",
            "date_objectif_15k": month_to_calendar(m15) if m15 else ">horizon",
            "mois_objectif_100M": m100 or ">horizon",
            "date_objectif_100M": month_to_calendar(m100) if m100 else ">horizon",
            "arr_final": last["arr"],
            "equipes_final": last["equipes"],
            "independants_final": last["independants"],
            "clients_multisport_final": last.get("clients_multisport", 0) if getattr(s, "multisport", False) else 0,
            "organisateurs_final": last.get("organisateurs", 0) if getattr(s, "multisport", False) else 0,
            "coachs_tri_final": last.get("coachs_tri", 0) if getattr(s, "multisport", False) else 0,
            "coachs_running_final": last.get("coachs_running", 0) if getattr(s, "multisport", False) else 0,
            "mrr_multisport_final": last.get("mrr_multisport", 0) if getattr(s, "multisport", False) else 0,
            "part_mrr_multisport_final": last.get("part_mrr_multisport_pct", 0) if getattr(s, "multisport", False) else 0,
            "mrr_independants_final": last["mrr_independants"],
            "mrr_marketplace_final": last["mrr_marketplace"],
            "gmv_marketplace_annuel": round(last.get("gmv_marketplace_mois", 0) * 12, 0),
            "part_mrr_international_final": last.get("part_mrr_international_pct", 0),
            "marge_brute_pct_final": last["marge_brute_pct"],
            "valorisation_final": last["valorisation_eur"],
            "depasse_ippogee": "OUI" if last["valorisation_eur"] > IPPOGEE_VAL_MID else "NON",
            "depasse_100M": "OUI" if last["valorisation_eur"] >= TARGET_VALUATION else "NON",
            "effectif_final": last["effectif_etp"],
            "salaire_fondateur_final": last["salaire_fondateur_net"],
        })

    leader_scenario = next(s for s in SCENARIOS if s.name == "leaderGlobal")
    leader_rows, _, _ = simulate(leader_scenario)
    multisport_scenario = next(s for s in SCENARIOS if s.name == "leaderMultisport")
    multisport_rows, m15_ms, m100_ms = simulate(multisport_scenario)
    leader_eu_rows, _, _ = simulate(next(s for s in SCENARIOS if s.name == "leader100M"))

    write_csv("business-plan/projections-mensuelles.csv", all_monthly)
    write_csv("business-plan/synthese-scenarios.csv", summary)
    write_csv("business-plan/plan-embauches.csv", build_hiring_sheet())
    write_csv("business-plan/valorisation-evolution.csv", all_valuation)
    write_csv("business-plan/comparaison-ippogee.csv", build_ippogee_comparison(leader_rows))
    write_csv("business-plan/comparaison-ippogee-fonctionnel.csv", build_comparaison_fonctionnelle())
    write_csv("business-plan/roadmap-100M.csv", build_roadmap_100m())
    write_csv("business-plan/calendrier-lancement.csv", build_calendrier_lancement())
    write_csv("business-plan/plan-commercial-phases.csv", build_plan_commercial_phases())
    write_csv("business-plan/kpi-commerciaux.csv", build_kpi_commerciaux_hebdo())
    write_csv("business-plan/unite-economique-plans.csv", build_unit_economics_sheet())
    write_csv("business-plan/justification-prix-rentabilite.csv", build_pricing_justification())
    write_csv("business-plan/catalogue-charges.csv", build_catalogue_charges())
    write_csv("business-plan/seuils-rentabilite.csv", build_seuils_rentabilite())
    write_csv("business-plan/decomposition-charges-mensuelles.csv", build_decomposition_charges_mensuelles())
    write_csv("business-plan/sensibilite-rentabilite.csv", build_sensibilite_rentabilite())
    write_csv("business-plan/impact-valorisation-options.csv", build_valuation_impact_options())
    write_csv("business-plan/marketplace-commissions.csv", build_marketplace_commissions_sheet())
    write_csv("business-plan/expansion-internationale.csv", build_expansion_internationale_sheet())
    write_csv("business-plan/expansion-anglophone.csv", build_expansion_anglophone_sheet())
    write_csv("business-plan/worldtour-pipeline.csv", build_worldtour_pipeline())
    write_csv("business-plan/comparaison-salaire-dividendes.csv", build_comparaison_salaire_dividendes())
    write_csv("business-plan/remuneration-fondateur.csv", build_remuneration_fondateur_timeline(leader_rows))
    fiscal_summary, fiscal_timeline = build_fiscal_scenarios_comparatif(leader_scenario)
    write_csv("business-plan/fiscal-scenarios-synthese.csv", fiscal_summary)
    write_csv("business-plan/fiscal-scenarios-timeline.csv", fiscal_timeline)
    write_csv("business-plan/fiscal-strategie-optimisee.csv", build_fiscal_strategie_optimisee())

    yearly = []
    for s in SCENARIOS:
        rows, _, _ = simulate(s)
        for y in range(1, s.months // 12 + 1):
            r = rows[y * 12 - 1]
            yearly.append({
                "scenario": s.label,
                "annee": f"Y{y}",
                "equipes": r["equipes"],
                "independants": r["independants"],
                "mrr_total": r["mrr_total"],
                "mrr_independants": r["mrr_independants"],
                "arr": r["arr"],
                "mrr_marketplace": r["mrr_marketplace"],
                "marge_brute_pct": r["marge_brute_pct"],
                "effectif": r["effectif_etp"],
                "salaire_fondateur_net": r["salaire_fondateur_net"],
                "valorisation": r["valorisation_eur"],
                "vs_ippogee": r["vs_ippogee"],
                "objectif_100M": r["objectif_100M"],
            })
    write_csv("business-plan/snapshots-annuels.csv", yearly)
    write_csv("business-plan/projections-leader-100M.csv", leader_rows)
    write_csv("business-plan/projections-leader-europe.csv", leader_eu_rows)
    write_csv("business-plan/projections-leader-multisport.csv", multisport_rows)
    write_csv("business-plan/expansion-multisport.csv", build_expansion_multisport_sheet())
    write_csv("business-plan/comparaison-multisport.csv", build_multisport_comparison(leader_rows, multisport_rows))
    write_csv("business-plan/roadmap-multisport.csv", build_multisport_roadmap())
    write_csv(
        "business-plan/remuneration-fondateur-multisport.csv",
        build_remuneration_fondateur_timeline(multisport_rows),
    )

    print("✓ Fichiers générés dans business-plan/\n")
    for s in summary:
        print(f"  [{s['scenario']}]")
        print(f"    Lancement   → {LAUNCH_LABEL} (M1)")
        print(f"    15K net     → mois {s['mois_objectif_15k']} ({s.get('date_objectif_15k', '?')})")
        print(f"    100M€ val   → mois {s['mois_objectif_100M']} ({s.get('date_objectif_100M', '?')})")
        print(f"    ARR final   → {s['arr_final']:,.0f} € | Indép. → {s['independants_final']:,.0f}")
        print(f"    GMV missions/an → {s.get('gmv_marketplace_annuel', 0):,.0f} € | MRR marketplace → {s.get('mrr_marketplace_final', 0):,.0f} €")
        print(f"    MRR intl.   → {s.get('part_mrr_international_final', 0)} %")
        print(f"    Valorisation → {s['valorisation_final']:,.0f} € | Ippogee dépassé: {s['depasse_ippogee']}")
        if s.get("clients_multisport_final"):
            print(f"    Multisport  → {s['clients_multisport_final']:,.0f} clients | org. → {s.get('organisateurs_final', 0):,.0f} | MRR MS → {s['mrr_multisport_final']:,.0f} € ({s['part_mrr_multisport_final']} %)")
        print()


if __name__ == "__main__":
    main()
