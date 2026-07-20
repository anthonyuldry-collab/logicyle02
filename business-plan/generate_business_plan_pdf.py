#!/usr/bin/env python3
"""Génère le Business Plan LogiCycle complet en PDF (téléchargeable)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".python_pkgs"))

from fpdf import FPDF  # noqa: E402

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
OUT_PDF = ROOT / "LogiCycle-Business-Plan-Complet.pdf"
OUT_MD = ROOT / "BUSINESS-PLAN-COMPLET.md"


class BusinessPlanPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font("ArialFR", "", FONT)
        self.add_font("ArialFR", "B", FONT_BOLD)
        self.alias_nb_pages()

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("ArialFR", "", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "LogiCycle — Business Plan confidentiel · juil. 2026", align="L")
        self.ln(8)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("ArialFR", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")

    def cover(self) -> None:
        self.add_page()
        self.ln(40)
        self.set_font("ArialFR", "B", 28)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 12, "LOGICYCLE", align="C")
        self.ln(4)
        self.set_font("ArialFR", "B", 16)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 9, "Business Plan complet", align="C")
        self.ln(6)
        self.set_font("ArialFR", "", 12)
        self.multi_cell(
            0,
            7,
            "SaaS de gestion & performance pour le cyclisme structure\n"
            "Lancement commercial : decembre 2027\n"
            "Version : juillet 2026",
            align="C",
        )
        self.ln(20)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(80, 80, 80)
        self.multi_cell(
            0,
            6,
            "Document confidentiel — usage fondateur, investisseurs, conseil.\n"
            "Chiffres issus du modele Dual-Track recalibre (TAM reel UCI / federations).",
            align="C",
        )

    def h1(self, text: str) -> None:
        self.add_page()
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 16)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 9, text)
        self.ln(3)
        self.set_draw_color(20, 40, 80)
        self.set_line_width(0.4)
        y = self.get_y()
        self.line(10, y, 200, y)
        self.ln(6)

    def h2(self, text: str) -> None:
        self.ln(2)
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 12)
        self.set_text_color(30, 60, 100)
        self.multi_cell(0, 7, text)
        self.ln(2)

    def h3(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def p(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, f"  -  {text}")

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[float] | None = None) -> None:
        if col_widths is None:
            w = 190 / len(headers)
            col_widths = [w] * len(headers)
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 8)
        self.set_fill_color(20, 40, 80)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()
        self.set_font("ArialFR", "", 8)
        self.set_text_color(30, 30, 30)
        fill = False
        for row in rows:
            if self.get_y() > 270:
                self.add_page()
            self.set_x(self.l_margin)
            self.set_fill_color(245, 247, 250) if fill else self.set_fill_color(255, 255, 255)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 6.5, str(cell)[:45], border=1, fill=True, align="C" if i else "L")
            self.ln()
            fill = not fill
        self.set_x(self.l_margin)
        self.ln(3)


def build_markdown() -> str:
    return """# LogiCycle — Business Plan complet

**Version** : juillet 2026  
**Lancement commercial** : décembre 2027 (M1)  
**Document** : confidentiel · fondateur / investisseurs / conseil

---

## 1. Résumé exécutif

LogiCycle est un logiciel (SaaS) pour les **équipes et clubs de cyclisme** : organisation, performance, scouting, missions vacataires, suivi de stages.

| Élément | Décision |
|---------|----------|
| Positionnement | Premium accessible vs outils chers (ex. Ippogee) |
| Lancement | **Décembre 2027** |
| Double voie | France + anglais (WorldTour) dès le départ |
| Scénario phare | Dual-Track · **~5,0 M€** de revenus récurrents en année 10 |
| Valorisation phare Y10 | **~78 M€** |
| Objectif perso 15 000 € net / mois | **Août 2031** (~550 équipes) |
| Point mort société | **Mois 8** (~40 équipes) |

**Upside** (organisateurs + triathlon + course + international fort) : jusqu’à **~6,4 M€** (multisport) ou **~11,5 M€** (stretch international) de revenus récurrents en Y10.

---

## 2. Problème & solution

### Problème
Les structures cyclistes jonglent entre Excel, WhatsApp, outils chers et silos. Les organisateurs de courses et les coachs indépendants sont mal servis.

### Solution LogiCycle
- Mini-ERP d’équipe (calendrier, RH légère, logistique course)
- Performance / stages / wellness
- Réseau : indépendants, marketplace missions, plus tard organisateurs
- Prix public **390 € à 2 990 € / an** selon le plan

---

## 3. Marché (chiffres réels)

| Segment | Volume réel | Commentaire |
|---------|-------------|-------------|
| Équipes UCI (toutes divisions) | **~180** | Pas 3 000 « pros » |
| WorldTour / ProTeams (H+F) | **~48** | Segment premium |
| Clubs structurés mondiaux | **~12 000 – 16 000** | Cœur du volume |
| Indépendants adressables | **15 000 – 25 000** | Staff / coureurs / coachs |
| Marché adressable revenus | **4,3 – 7 M€ / an** | Base réaliste |
| + Organisateurs / tri / run | **+3 – 7 M€** | Upside long terme |

---

## 4. Offre & tarifs

### Équipes
| Plan | Prix annuel | Cible |
|------|-------------|-------|
| Club | 390 € | Clubs / jeunes |
| Compétition | 890 € | Niveaux nationaux · stages |
| Continental | 1 690 € | Continental / ProSeries |
| Pro | 2 990 € | ProTeams / wedge WT |
| Fédération | Sur devis | Ligues / comités |

### Indépendants
| Plan | Prix mensuel |
|------|--------------|
| Athlète | 9 € |
| Pass Camp | +19 € |
| Staff | 12 € |
| Entraîneur | 29 € |
| Coach Pro | 79 € |

### Organisateurs (après ~150 équipes)
| Plan | Prix |
|------|------|
| Solo | 49 € / mois (490 € / an) |
| Pro | 149 € / mois (1 490 € / an) |

Marketplace missions : commission **12 %** (10 % plan Pro).

---

## 5. Stratégie commerciale

1. **France + anglais dès le lancement** (pas l’un après l’autre)
2. Clubs / Continental d’abord, WorldTour en « coin » (wedge)
3. Indépendants payants dès le mois 1
4. **Portail organisateurs avant le triathlon** (fin 2029 → 2030)
5. Triathlon vers fin 2030, course à pied plus tard

### Anti-cibles au début
- Guerre frontale sur les WorldTeams verrouillés
- Clubs loisir purement « running » de masse
- Features hors cœur avant décembre 2027

---

## 6. Concurrence (vs Ippogee)

| Critère | Ippogee | LogiCycle |
|---------|---------|----------|
| Position | ERP premium équipes FR | Réseau SaaS élargi |
| Prix | 12–50 K€ / an | 0,4–3 K€ / an |
| Langue | Français | FR + anglais |
| Indépendants / marketplace | Non | Oui |
| Stages / wellness | Faible | Fort |
| Score produit (interne) | 2 | **13 / 19** |

LogiCycle ne « tue » pas Ippogee sur le WorldTour pur tout de suite : il gagne sur **volume clubs + réseau + prix**.

---

## 7. Projections financières (scénario phare Dual-Track)

Lancement = décembre 2027. Fin d’année modèle = novembre.

| Année | Date | Équipes | Indépendants | Revenus récurrents / an | Valorisation |
|-------|------|--------:|-------------:|------------------------:|-------------:|
| Y1 | nov. 2028 | 69 | 492 | **111 K€** | 1,0 M€ |
| Y2 | nov. 2029 | 192 | 1 527 | **357 K€** | 4,3 M€ |
| Y3 | nov. 2030 | 358 | 2 944 | **770 K€** | 11,2 M€ |
| Y4 | nov. 2031 | 607 | 4 926 | **1,59 M€** | 27,1 M€ |
| Y5 | nov. 2032 | 856 | 6 771 | **2,43 M€** | 38,6 M€ |
| Y6 | nov. 2033 | 1 023 | 7 522 | **3,02 M€** | 47,2 M€ |
| Y7 | nov. 2034 | 1 195 | 8 301 | **3,46 M€** | 54,0 M€ |
| Y8 | nov. 2035 | 1 365 | 9 029 | **3,96 M€** | 61,9 M€ |
| Y9 | nov. 2036 | 1 523 | 9 655 | **4,47 M€** | 69,7 M€ |
| **Y10** | **nov. 2037** | **1 672** | **10 194** | **4,98 M€** | **77,7 M€** |

### Autres scénarios Y10
| Scénario | Revenus / an | Valorisation |
|----------|-------------:|-------------:|
| Multisport (org. + tri + run) | **6,44 M€** | **~118 M€** |
| Upside international | **11,5 M€** | **~230 M€** |
| Bootstrap solo | 1,0 M€ | ~12 M€ |

---

## 8. Rentabilité & rémunération fondateur

| Jalon | Quand | Indication |
|-------|-------|------------|
| Point mort société | Mois 8 | ~40 équipes |
| Salaire 2 000 € net | Mois 12 | ~70 équipes |
| Premiers dividendes | Mois 24 | ~190 équipes |
| **15 000 € net / mois** | **Août 2031** | **~550 équipes · ~1,4 M€ de revenus / an** |

Mode fiscal : salaire 2 K€ → 2,5 K€ → 5 K€ + dividendes (impôt flat ~30 %) · holding ~fin 2029.

En année 10 (phare, ~60 % des parts) : environ **390 K€ net perso / an** (~8 % des revenus récurrents) — le reste reste en société (trésorerie / croissance). Avec **100 % des parts** : ~**614 K€ / an**.

**Note** : 1 milliard de valorisation LogiCycle seul n’est **pas** réaliste sur le marché cyclisme actuel. Patrimoine fondateur **crédible** long terme : **50–150 M€** (scénario fort / belle sortie).

---

## 9. Roadmap produit (ordre décidé)

| Phase | Période | Focus |
|-------|---------|-------|
| Build | juil. 2026 → août 2027 | Cœur équipes + indépendants + anglais |
| Pré-lancement | sept.–nov. 2027 | Stripe, legal, pipeline |
| Go-live | **déc. 2027** | Premiers clients payants |
| Organisateur Solo | **nov. 2029** | Après ~150 équipes + levée |
| Organisateur Pro | mai 2030 | Roadbook / listes de départ |
| Triathlon | nov. 2030 | Coachs d’abord |
| Course à pied | 2032+ | Coachs, pas clubs de masse |

---

## 10. Levées & équipe

| Moment | Levée | Usage |
|--------|-------|-------|
| ~nov. 2029 | Seed **~750 K€** | Scale commercial + produit |
| ~fin 2031 | Series A **~2 M€** | International + équipe sales |

Embauches typiques : commercial France, country lead à la commission, customer success, développeurs — après traction, pas avant.

---

## 11. Risques & garde-fous

| Risque | Mitigation |
|--------|------------|
| Marché trop petit | TAM recalibré · focus clubs + réseau |
| Dispersion produit | Organisateurs avant tri · pas de running trop tôt |
| Concurrent cher | Prix × différenciation réseau |
| Fiscalité / Urssaf | Salaire dès le mois 1 · holding bien calée |
| Dilution excessive | Garder ≥ 45 % si objectif patrimoine fort |

---

## 12. Plan d’action PDG (maintenant)

1. Finir le produit cœur vendable pour décembre 2027  
2. Pipeline : 50 prospects France + contacts anglais / WorldTour  
3. Expert-comptable + avocat fiscaliste + avocat sociétés  
4. Ne pas builder triathlon / organisateurs en code avant le lancement  
5. Spec papier portail organisateurs (go-live produit ~2029)

---

## Annexes (fichiers du dossier business-plan)

- `tam-marche-reel.md` — marché  
- `strategie-commerciale.md` — stratégie  
- `grille-tarifaire.md` — prix  
- `comparaison-ippogee.md` — concurrence  
- `charges-seuil-rentabilite.md` — charges  
- `fiscalite-remuneration-fondateur.md` — fiscalité  
- `portail-organisateur.md` — organisateurs  
- `chemin-patrimoine-500M.md` — patrimoine (version réaliste à lire avec prudence)  
- `prompts-experts-logicycle.md` — prompts experts  
- `projections-leader-100M.csv` — détail mensuel  
- `juridique/` — statuts / pacte / création  

```bash
python3 business-plan/generate_projections.py
python3 business-plan/generate_business_plan_pdf.py
```

---

*Fin du Business Plan LogiCycle — juillet 2026*
"""


def build_pdf() -> None:
    pdf = BusinessPlanPDF()
    pdf.cover()

    pdf.h1("1. Resume executif")
    pdf.p(
        "LogiCycle est un logiciel en abonnement pour les equipes et clubs de cyclisme : "
        "organisation, performance, scouting, missions vacataires et suivi de stages."
    )
    pdf.table(
        ["Element", "Decision"],
        [
            ["Positionnement", "Premium accessible vs outils chers"],
            ["Lancement", "Decembre 2027"],
            ["Double voie", "France + anglais des le depart"],
            ["Revenus annee 10 (phare)", "~5,0 M EUR / an"],
            ["Valorisation annee 10", "~78 M EUR"],
            ["15 000 EUR net / mois", "Aout 2031 (~550 equipes)"],
            ["Point mort societe", "Mois 8 (~40 equipes)"],
        ],
        [70, 120],
    )
    pdf.p(
        "Upside : organisateurs + triathlon + course + international fort → jusqu'a "
        "~6,4 M EUR (multisport) ou ~11,5 M EUR (stretch) de revenus / an en annee 10."
    )

    pdf.h1("2. Probleme & solution")
    pdf.h2("Probleme")
    pdf.p(
        "Les structures cyclistes jonglent entre Excel, WhatsApp et outils chers. "
        "Organisateurs de courses et coachs independants sont mal servis."
    )
    pdf.h2("Solution")
    for b in [
        "Mini-ERP d'equipe (calendrier, RH legere, logistique course)",
        "Performance / stages / wellness",
        "Reseau : independants, marketplace, plus tard organisateurs",
        "Prix public 390 EUR a 2 990 EUR / an selon le plan",
    ]:
        pdf.bullet(b)

    pdf.h1("3. Marche (chiffres reels)")
    pdf.table(
        ["Segment", "Volume", "Commentaire"],
        [
            ["Equipes UCI", "~180", "Pas 3 000 pros"],
            ["WorldTour / Pro (H+F)", "~48", "Segment premium"],
            ["Clubs structures monde", "12–16 000", "Coeur du volume"],
            ["Independants adressables", "15–25 000", "Staff / coureurs / coachs"],
            ["Marche adressable revenus", "4,3–7 M EUR/an", "Base realiste"],
            ["+ Org. / tri / run", "+3–7 M EUR", "Upside long terme"],
        ],
        [70, 45, 75],
    )

    pdf.h1("4. Offre & tarifs")
    pdf.h2("Equipes")
    pdf.table(
        ["Plan", "Prix annuel", "Cible"],
        [
            ["Club", "390 EUR", "Clubs / jeunes"],
            ["Competition", "890 EUR", "Niveaux nationaux · stages"],
            ["Continental", "1 690 EUR", "Continental / ProSeries"],
            ["Pro", "2 990 EUR", "ProTeams / wedge WT"],
            ["Federation", "Sur devis", "Ligues / comites"],
        ],
        [50, 45, 95],
    )
    pdf.h2("Independants")
    pdf.table(
        ["Plan", "Prix mensuel"],
        [
            ["Athlete", "9 EUR"],
            ["Pass Camp", "+19 EUR"],
            ["Staff", "12 EUR"],
            ["Entraineur", "29 EUR"],
            ["Coach Pro", "79 EUR"],
        ],
        [95, 95],
    )
    pdf.h2("Organisateurs (apres ~150 equipes)")
    pdf.table(
        ["Plan", "Prix"],
        [
            ["Solo", "49 EUR / mois (490 EUR / an)"],
            ["Pro", "149 EUR / mois (1 490 EUR / an)"],
        ],
        [60, 130],
    )
    pdf.p("Marketplace missions : commission 12 % (10 % plan Pro).")

    pdf.h1("5. Strategie commerciale")
    for b in [
        "France + anglais des le lancement (pas l'un apres l'autre)",
        "Clubs / Continental d'abord, WorldTour en coin d'entree",
        "Independants payants des le mois 1",
        "Portail organisateurs AVANT le triathlon (fin 2029 → 2030)",
        "Triathlon vers fin 2030, course a pied plus tard",
    ]:
        pdf.bullet(b)
    pdf.h3("Anti-cibles au debut")
    for b in [
        "Guerre frontale sur les WorldTeams verrouilles",
        "Clubs loisir running de masse",
        "Features hors coeur avant decembre 2027",
    ]:
        pdf.bullet(b)

    pdf.h1("6. Concurrence")
    pdf.table(
        ["Critere", "Ippogee", "LogiCycle"],
        [
            ["Position", "ERP premium FR", "Reseau SaaS elargi"],
            ["Prix", "12–50 K EUR/an", "0,4–3 K EUR/an"],
            ["Langue", "Francais", "FR + anglais"],
            ["Independants", "Non", "Oui"],
            ["Stages / wellness", "Faible", "Fort"],
            ["Score produit", "2", "13 / 19"],
        ],
        [50, 70, 70],
    )
    pdf.p(
        "LogiCycle ne tue pas Ippogee sur le WorldTour pur tout de suite : "
        "il gagne sur volume clubs, reseau et prix."
    )

    pdf.h1("7. Projections financieres (phare Dual-Track)")
    pdf.p("Lancement = decembre 2027. Fin d'annee modele = novembre.")
    pdf.table(
        ["Annee", "Date", "Equipes", "Indep.", "Revenus/an", "Valo"],
        [
            ["Y1", "nov. 2028", "69", "492", "111 K", "1,0 M"],
            ["Y2", "nov. 2029", "192", "1 527", "357 K", "4,3 M"],
            ["Y3", "nov. 2030", "358", "2 944", "770 K", "11,2 M"],
            ["Y4", "nov. 2031", "607", "4 926", "1,59 M", "27,1 M"],
            ["Y5", "nov. 2032", "856", "6 771", "2,43 M", "38,6 M"],
            ["Y6", "nov. 2033", "1 023", "7 522", "3,02 M", "47,2 M"],
            ["Y7", "nov. 2034", "1 195", "8 301", "3,46 M", "54,0 M"],
            ["Y8", "nov. 2035", "1 365", "9 029", "3,96 M", "61,9 M"],
            ["Y9", "nov. 2036", "1 523", "9 655", "4,47 M", "69,7 M"],
            ["Y10", "nov. 2037", "1 672", "10 194", "4,98 M", "77,7 M"],
        ],
        [22, 32, 28, 30, 38, 40],
    )
    pdf.h2("Autres scenarios annee 10")
    pdf.table(
        ["Scenario", "Revenus/an", "Valorisation"],
        [
            ["Multisport", "6,44 M EUR", "~118 M EUR"],
            ["Upside international", "11,5 M EUR", "~230 M EUR"],
            ["Bootstrap solo", "1,0 M EUR", "~12 M EUR"],
        ],
        [70, 60, 60],
    )

    pdf.h1("8. Rentabilite & remuneration fondateur")
    pdf.table(
        ["Jalon", "Quand", "Indication"],
        [
            ["Point mort societe", "Mois 8", "~40 equipes"],
            ["Salaire 2 000 EUR net", "Mois 12", "~70 equipes"],
            ["Premiers dividendes", "Mois 24", "~190 equipes"],
            ["15 000 EUR net / mois", "Aout 2031", "~550 equipes"],
        ],
        [55, 40, 95],
    )
    pdf.p(
        "Mode fiscal : salaire 2 000 → 2 500 → 5 000 EUR net + dividendes "
        "(impot flat ~30 %). Holding vers fin 2029."
    )
    pdf.p(
        "Annee 10 (phare, ~60 % des parts) : environ 390 000 EUR net perso / an. "
        "Avec 100 % des parts : environ 614 000 EUR / an. "
        "Le reste reste en societe (tresorerie / croissance)."
    )
    pdf.p(
        "Important : 1 milliard de valorisation LogiCycle seul n'est pas realiste "
        "sur le marche cyclisme actuel. Patrimoine fondateur credible long terme : "
        "50 a 150 M EUR (scenario fort / belle sortie)."
    )

    pdf.h1("9. Roadmap produit")
    pdf.table(
        ["Phase", "Periode", "Focus"],
        [
            ["Build", "juil. 2026 – aout 2027", "Coeur equipes + independants + anglais"],
            ["Pre-lancement", "sept.–nov. 2027", "Paiements, legal, pipeline"],
            ["Go-live", "dec. 2027", "Premiers clients payants"],
            ["Organisateur Solo", "nov. 2029", "Apres ~150 equipes + levee"],
            ["Organisateur Pro", "mai 2030", "Roadbook / listes de depart"],
            ["Triathlon", "nov. 2030", "Coachs d'abord"],
            ["Course a pied", "2032+", "Coachs, pas clubs de masse"],
        ],
        [45, 50, 95],
    )

    pdf.h1("10. Levees & equipe")
    pdf.table(
        ["Moment", "Levee", "Usage"],
        [
            ["~nov. 2029", "Seed ~750 K EUR", "Scale commercial + produit"],
            ["~fin 2031", "Series A ~2 M EUR", "International + sales"],
        ],
        [40, 55, 95],
    )
    pdf.p(
        "Embauches typiques apres traction : commercial France, country lead "
        "a la commission, customer success, developpeurs."
    )

    pdf.h1("11. Risques & garde-fous")
    pdf.table(
        ["Risque", "Mitigation"],
        [
            ["Marche trop petit", "TAM recalibre · focus clubs + reseau"],
            ["Dispersion produit", "Organisateurs avant tri"],
            ["Concurrent cher", "Prix × differenciation reseau"],
            ["Fiscalite / Urssaf", "Salaire des le mois 1 · holding calée"],
            ["Dilution excessive", "Garder ≥ 45 % si objectif patrimoine fort"],
        ],
        [70, 120],
    )

    pdf.h1("12. Plan d'action PDG (maintenant)")
    for i, b in enumerate(
        [
            "Finir le produit coeur vendable pour decembre 2027",
            "Pipeline : 50 prospects France + contacts anglais / WorldTour",
            "Expert-comptable + avocat fiscaliste + avocat societes",
            "Ne pas builder triathlon / organisateurs en code avant le lancement",
            "Spec papier portail organisateurs (produit ~2029)",
        ],
        1,
    ):
        pdf.bullet(f"{i}. {b}")

    pdf.h1("13. Annexes")
    pdf.p("Fichiers du dossier business-plan/ :")
    for b in [
        "tam-marche-reel.md — marche",
        "strategie-commerciale.md — strategie",
        "grille-tarifaire.md — prix",
        "comparaison-ippogee.md — concurrence",
        "charges-seuil-rentabilite.md — charges",
        "fiscalite-remuneration-fondateur.md — fiscalite",
        "portail-organisateur.md — organisateurs",
        "prompts-experts-logicycle.md — prompts experts",
        "projections-leader-100M.csv — detail mensuel",
        "juridique/ — statuts / pacte / creation",
        "BUSINESS-PLAN-COMPLET.md — version texte de ce document",
    ]:
        pdf.bullet(b)
    pdf.ln(4)
    pdf.p("Fin du Business Plan LogiCycle — juillet 2026.")
    pdf.p("Document confidentiel. Chiffres issus du modele Dual-Track recalibre.")

    pdf.output(str(OUT_PDF))


def main() -> None:
    OUT_MD.write_text(build_markdown(), encoding="utf-8")
    build_pdf()
    size_kb = OUT_PDF.stat().st_size / 1024
    print(f"✓ Markdown : {OUT_MD}")
    print(f"✓ PDF      : {OUT_PDF} ({size_kb:.0f} Ko)")


if __name__ == "__main__":
    main()
