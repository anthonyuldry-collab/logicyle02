#!/usr/bin/env python3
"""Shift calendar year labels by -1 (go-live déc.2027 → déc.2026)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Only files whose date_calendrier assumes M1 = déc.2027
TARGETS = [
    "projections-leader-100M.csv",
    "projections-leader-europe.csv",
    "projections-leader-multisport.csv",
    "projections-mensuelles.csv",
    "decomposition-charges-mensuelles.csv",
    "remuneration-fondateur.csv",
    "remuneration-fondateur-multisport.csv",
    "calendrier-lancement.csv",
]


def shift_text(text: str) -> str:
    # High→low: Y → ⟦Y-2001⟧ then ⟦Y-2000⟧ → Y-1 (avoid double-shift)
    for y in range(2037, 2026, -1):
        text = text.replace(str(y), f"⟦{y - 2001}⟧")
    for y in range(2036, 2025, -1):
        text = text.replace(f"⟦{y - 2000}⟧", str(y))
    text = text.replace("décembre 2027", "décembre 2026")
    text = text.replace("Décembre 2027", "Décembre 2026")
    text = text.replace("septembre 2027", "septembre 2026")
    return text


def main() -> None:
    changed = []
    for name in TARGETS:
        path = ROOT / name
        if not path.exists():
            print(f"skip missing: {name}")
            continue
        raw = path.read_text(encoding="utf-8")
        new = shift_text(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            changed.append(name)
        else:
            print(f"unchanged: {name}")
    print(f"Updated {len(changed)} files:")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
