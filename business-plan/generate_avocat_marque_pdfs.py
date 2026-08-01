#!/usr/bin/env python3
"""Génère les PDF du brief avocat marque LogiCycle + annexe TMview."""
from __future__ import annotations

import csv
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".python_pkgs"))

from fpdf import FPDF  # noqa: E402

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ITALIC = "/System/Library/Fonts/Supplemental/Arial Italic.ttf"

MD_IN = ROOT / "dossier-avocat-marque-logicycle.md"
CSV_IN = ROOT / "annexe-marques-logicycle-tmview.csv"
PDF_DOSSIER = ROOT / "dossier-avocat-marque-logicycle.pdf"
PDF_ANNEXE = ROOT / "annexe-marques-logicycle-tmview.pdf"
DESKTOP_DOSSIER = Path("/Users/anthonyuldry/Desktop/LogiCycle-dossier-avocat-marque.pdf")
DESKTOP_ANNEXE = Path("/Users/anthonyuldry/Desktop/LogiCycle-annexe-marques-tmview.pdf")


def strip_md(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("☐", "[ ]").replace("·", "·")
    return text.strip()


class LawyerPDF(FPDF):
    def __init__(self, doc_title: str) -> None:
        super().__init__(format="A4", unit="mm")
        self.doc_title = doc_title
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(14, 16, 14)
        self.add_font("ArialFR", "", FONT)
        self.add_font("ArialFR", "B", FONT_BOLD)
        if Path(FONT_ITALIC).exists():
            self.add_font("ArialFR", "I", FONT_ITALIC)
        self.alias_nb_pages()

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("ArialFR", "", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, self.doc_title, align="L")
        self.ln(8)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("ArialFR", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Confidentiel — Page {self.page_no()}/{{nb}}", align="C")

    def cover_block(self, title: str, subtitle: str, meta: str) -> None:
        self.add_page()
        self.ln(28)
        self.set_font("ArialFR", "B", 26)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 11, "LOGICYCLE", align="C")
        self.ln(4)
        self.set_font("ArialFR", "B", 14)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 8, title, align="C")
        self.ln(3)
        self.set_font("ArialFR", "", 11)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, subtitle, align="C")
        self.ln(10)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(80, 80, 80)
        self.multi_cell(0, 5.5, meta, align="C")
        self.ln(8)
        self.set_draw_color(20, 40, 80)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(40, y, 170, y)
        self.ln(10)

    def h1(self, text: str) -> None:
        if self.get_y() > 250:
            self.add_page()
        elif self.page_no() > 1 or self.get_y() > 40:
            self.ln(4)
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 14)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 8, strip_md(text))
        self.set_draw_color(20, 40, 80)
        self.set_line_width(0.35)
        y = self.get_y()
        self.line(self.l_margin, y, 196, y)
        self.ln(4)

    def h2(self, text: str) -> None:
        if self.get_y() > 260:
            self.add_page()
        self.ln(3)
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 12)
        self.set_text_color(30, 60, 100)
        self.multi_cell(0, 7, strip_md(text))
        self.ln(1)

    def h3(self, text: str) -> None:
        if self.get_y() > 265:
            self.add_page()
        self.ln(1)
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, strip_md(text))
        self.ln(1)

    def p(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, strip_md(text))
        self.ln(1.5)

    def quote(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_fill_color(245, 247, 250)
        self.set_draw_color(20, 40, 80)
        x = self.l_margin
        y = self.get_y()
        self.set_font("ArialFR", "", 9)
        self.set_text_color(50, 50, 50)
        # left bar + text
        self.set_x(x + 3)
        self.multi_cell(0, 5, strip_md(text))
        h = self.get_y() - y
        self.set_fill_color(20, 40, 80)
        self.rect(x, y, 1.2, h, style="F")
        self.ln(2)

    def bullet(self, text: str, ordered: bool = False, num: int | None = None) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(30, 30, 30)
        prefix = f"  {num}. " if ordered and num is not None else "  •  "
        self.multi_cell(0, 5.5, prefix + strip_md(text))

    def check_item(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, "  [ ]  " + strip_md(text))

    def hr(self) -> None:
        self.ln(2)
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.2)
        y = self.get_y()
        self.line(self.l_margin, y, 196, y)
        self.ln(4)

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[float] | None = None) -> None:
        usable = 196 - self.l_margin
        n = len(headers)
        if col_widths is None:
            col_widths = [usable / n] * n
        # header
        if self.get_y() > 250:
            self.add_page()
        self.set_x(self.l_margin)
        self.set_font("ArialFR", "B", 8)
        self.set_fill_color(20, 40, 80)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, strip_md(h)[:60], border=1, fill=True, align="C")
        self.ln()
        fill = False
        for row in rows:
            # estimate height
            self.set_font("ArialFR", "", 7.5)
            line_h = 4.2
            max_lines = 1
            cell_texts = []
            for i, cell in enumerate(row):
                t = strip_md(str(cell))
                # wrap roughly by width
                max_chars = max(8, int(col_widths[i] / 1.7))
                wrapped = self._wrap(t, max_chars)
                cell_texts.append(wrapped)
                max_lines = max(max_lines, len(wrapped))
            row_h = max(6.5, max_lines * line_h + 2)
            if self.get_y() + row_h > 275:
                self.add_page()
                self.set_x(self.l_margin)
                self.set_font("ArialFR", "B", 8)
                self.set_fill_color(20, 40, 80)
                self.set_text_color(255, 255, 255)
                for i, h in enumerate(headers):
                    self.cell(col_widths[i], 7, strip_md(h)[:60], border=1, fill=True, align="C")
                self.ln()
                fill = False
            y0 = self.get_y()
            x0 = self.l_margin
            self.set_fill_color(245, 247, 250) if fill else self.set_fill_color(255, 255, 255)
            self.set_text_color(30, 30, 30)
            self.set_font("ArialFR", "", 7.5)
            for i, lines in enumerate(cell_texts):
                x = x0 + sum(col_widths[:i])
                self.rect(x, y0, col_widths[i], row_h, style="DF")
                text = "\n".join(lines)
                self.set_xy(x + 1, y0 + 1)
                self.multi_cell(col_widths[i] - 2, line_h, text)
            self.set_xy(x0, y0 + row_h)
            fill = not fill
        self.ln(3)

    @staticmethod
    def _wrap(text: str, max_chars: int) -> list[str]:
        words = text.split()
        if not words:
            return [""]
        lines: list[str] = []
        cur = ""
        for w in words:
            trial = (cur + " " + w).strip()
            if len(trial) <= max_chars:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                if len(w) > max_chars:
                    while len(w) > max_chars:
                        lines.append(w[:max_chars])
                        w = w[max_chars:]
                    cur = w
                else:
                    cur = w
        if cur:
            lines.append(cur)
        return lines or [""]


def parse_md_to_pdf(md_path: Path, out_path: Path) -> None:
    raw = md_path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    pdf = LawyerPDF("LogiCycle — Brief avocat · Marque · Statuts · CGU/CGV · RGPD · juil. 2026")
    pdf.cover_block(
        "Brief avocat — Pack legal",
        "Marque · Statuts · CGU/CGV · RGPD\nDossier prêt à transmettre",
        "31 juillet 2026\n"
        "Briefing client — mission avocat (PI + corporate + contrats SaaS)\n"
        "Ce document n’est pas un avis juridique.\n"
        "Urgence : go-live commercial décembre 2026",
    )

    i = 0
    # skip title block already used on cover (first # / ## / ### and quote block until ---)
    skipped_intro = False
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not skipped_intro:
            if stripped.startswith("#") or stripped.startswith(">") or stripped == "---" or stripped == "":
                if stripped == "---":
                    skipped_intro = True
                i += 1
                continue
            skipped_intro = True

        if stripped == "":
            i += 1
            continue

        if stripped == "---":
            pdf.hr()
            i += 1
            continue

        if stripped.startswith("### "):
            pdf.h3(stripped[4:])
            i += 1
            continue
        if stripped.startswith("## "):
            pdf.h2(stripped[3:])
            i += 1
            continue
        if stripped.startswith("# "):
            pdf.h1(stripped[2:])
            i += 1
            continue

        if stripped.startswith(">"):
            chunks = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                chunks.append(lines[i].strip().lstrip(">").strip())
                i += 1
            pdf.quote(" ".join(chunks))
            continue

        # table
        if "|" in stripped and stripped.startswith("|"):
            table_lines = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            rows_raw = []
            for tl in table_lines:
                cells = [c.strip() for c in tl.strip("|").split("|")]
                # skip separator
                if all(re.match(r"^:?-+:?$", c or "") for c in cells):
                    continue
                rows_raw.append(cells)
            if rows_raw:
                headers = rows_raw[0]
                data = rows_raw[1:]
                n = len(headers)
                usable = 182
                # weight first col smaller often
                if n == 2:
                    widths = [55, 127]
                elif n == 3:
                    widths = [50, 66, 66]
                else:
                    widths = [usable / n] * n
                pdf.table(headers, data, widths)
            continue

        # checklist
        if re.match(r"^- \[[ xX]\] ", stripped):
            pdf.check_item(stripped[6:])
            i += 1
            continue

        # ordered list
        m = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if m:
            pdf.bullet(m.group(2), ordered=True, num=int(m.group(1)))
            i += 1
            continue

        # unordered
        if stripped.startswith("- ") or stripped.startswith("* "):
            pdf.bullet(stripped[2:])
            i += 1
            continue

        # italic-only line (footer note)
        if stripped.startswith("*") and stripped.endswith("*") and not stripped.startswith("**"):
            pdf.set_font("ArialFR", "I", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(0, 5, strip_md(stripped))
            pdf.ln(2)
            i += 1
            continue

        # paragraph: gather continued lines
        para = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if (
                nxt == ""
                or nxt.startswith("#")
                or nxt.startswith(">")
                or nxt.startswith("|")
                or nxt.startswith("- ")
                or nxt.startswith("* ")
                or re.match(r"^\d+\.\s+", nxt)
                or nxt == "---"
            ):
                break
            para.append(nxt)
            i += 1
        pdf.p(" ".join(para))

    pdf.output(str(out_path))


def csv_to_pdf(csv_path: Path, out_path: Path) -> None:
    with csv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    pdf = LawyerPDF("LogiCycle — Annexe marques TMview · 31 juil. 2026")
    pdf.cover_block(
        "Annexe — Marques TMview",
        "Recherche client · Logiscycle / LOGICYCLE / LogiCycle",
        "Source : TMview · 31 juillet 2026\n"
        "Pas un registre officiel — à croiser par l’avocat\n"
        "Fichier source : annexe-marques-logicycle-tmview.csv",
    )

    pdf.h2("Tableau des antériorités / usages")

    # Compact portrait-friendly columns
    display_cols = [
        ("type", "Type", 28),
        ("signe", "Signe", 24),
        ("office", "Office", 28),
        ("numero", "N°", 26),
        ("titulaire", "Titulaire", 38),
        ("classes", "Classes", 22),
        ("statut", "Statut", 16),
    ]
    headers = [c[1] for c in display_cols]
    widths = [c[2] for c in display_cols]
    data = []
    for r in rows:
        data.append([r.get(c[0], "") or "" for c in display_cols])
    pdf.table(headers, data, widths)

    pdf.h2("Détail ligne par ligne")
    for idx, r in enumerate(rows, 1):
        signe = r.get("signe", "")
        pdf.h3(f"{idx}. {signe} — {r.get('type', '')}")
        for key in fieldnames:
            val = (r.get(key) or "").strip()
            if not val:
                continue
            label = key.replace("_", " ").capitalize()
            pdf.set_x(pdf.l_margin)
            pdf.set_font("ArialFR", "B", 9)
            pdf.set_text_color(40, 40, 40)
            pdf.write(5, f"{label} : ")
            pdf.set_font("ArialFR", "", 9)
            pdf.set_text_color(30, 30, 30)
            # long URLs
            pdf.multi_cell(0, 5, val)
        pdf.ln(2)

    pdf.h2("Notes")
    pdf.p(
        "Ces données sont issues d’une recherche TMview effectuée le 31 juillet 2026. "
        "Elles ne remplacent pas une recherche d’antériorité professionnelle (INPI / EUIPO / BOIP). "
        "Voir le brief principal : dossier-avocat-marque-logicycle.md"
    )
    pdf.output(str(out_path))


def main() -> None:
    if not MD_IN.exists():
        raise SystemExit(f"Missing {MD_IN}")
    if not CSV_IN.exists():
        raise SystemExit(f"Missing {CSV_IN}")

    parse_md_to_pdf(MD_IN, PDF_DOSSIER)
    csv_to_pdf(CSV_IN, PDF_ANNEXE)

    shutil.copy2(PDF_DOSSIER, DESKTOP_DOSSIER)
    shutil.copy2(PDF_ANNEXE, DESKTOP_ANNEXE)

    for p in (PDF_DOSSIER, PDF_ANNEXE, DESKTOP_DOSSIER, DESKTOP_ANNEXE):
        exists = p.exists()
        size = p.stat().st_size if exists else 0
        print(f"{'OK' if exists else 'MISSING'}  {size:8d} bytes  {p}")


if __name__ == "__main__":
    main()
