#!/usr/bin/env python3
"""Extract the official 2026 Polish city list from GUS KTS/TERYT workbooks.

A city is represented in TERYT by a seven-digit TERC code whose final
kind digit is:
  1 - gmina miejska,
  4 - miasto w gminie miejsko-wiejskiej.

For 1 January 2026 this must yield exactly 302 + 724 = 1026 cities.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "gus"
DATA = ROOT / "data"
SOURCE = CACHE / "tablica_kts-teryt_2026.xls"
KTS_SOURCE = CACHE / "kts_2026v2.xls"
EXPECTED = 1026

VOIVODESHIPS = {
    "02": "dolnośląskie",
    "04": "kujawsko-pomorskie",
    "06": "lubelskie",
    "08": "lubuskie",
    "10": "łódzkie",
    "12": "małopolskie",
    "14": "mazowieckie",
    "16": "opolskie",
    "18": "podkarpackie",
    "20": "podlaskie",
    "22": "pomorskie",
    "24": "śląskie",
    "26": "świętokrzyskie",
    "28": "warmińsko-mazurskie",
    "30": "wielkopolskie",
    "32": "zachodniopomorskie",
}

TYPE_LABELS = {
    "1": "gmina miejska",
    "4": "miasto w gminie miejsko-wiejskiej",
}

HEADER_WORDS = {
    "kts", "teryt", "terc", "nuts", "kod", "symbol", "nazwa", "typ",
    "rodzaj", "jednostka", "jednostki", "poziom", "makroregion", "region",
    "podregion", "powiat", "gmina", "województwo", "wojewodztwo",
}


def clean_cell(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", text)


def digits_only(value: str) -> str:
    return re.sub(r"\D", "", value)


def teryt_code(value: str) -> str | None:
    digits = digits_only(value)
    if len(digits) == 7 and digits[:2] in VOIVODESHIPS:
        return digits
    return None


def contains_letters(value: str) -> bool:
    return bool(re.search(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]", value))


def looks_like_type_or_header(value: str) -> bool:
    low = value.casefold()
    if low in HEADER_WORDS:
        return True
    if any(token in low for token in (
        "gmina miejska", "gmina wiejska", "gmina miejsko-wiejska",
        "miasto w gminie", "obszar wiejski", "dzielnica", "delegatura",
        "miasto na prawach powiatu", "część miejska", "czesc miejska",
    )):
        return True
    return False


def name_score(value: str, column: int, code_column: int) -> tuple[int, int, int]:
    """Prefer a nearby proper-name cell, and avoid descriptions/header prose."""
    low = value.casefold()
    score = 0
    distance = abs(column - code_column)
    if contains_letters(value):
        score += 30
    if 1 <= len(value) <= 80:
        score += 10
    if value[:1].isupper():
        score += 6
    if value.isupper() and len(value) > 4:
        score -= 2
    if looks_like_type_or_header(value):
        score -= 100
    if low.startswith(("woj.", "powiat ", "podregion ", "region ", "makroregion ")):
        score -= 40
    if any(word in low.split() for word in HEADER_WORDS):
        score -= 10
    # Names are normally immediately before/after the code in the transition table.
    score += max(0, 18 - distance * 3)
    return score, -distance, -column


def choose_name(cells: list[str], code_column: int) -> str | None:
    candidates: list[tuple[tuple[int, int, int], str]] = []
    for column, value in enumerate(cells):
        if not value or not contains_letters(value):
            continue
        if len(value) > 100:
            continue
        candidates.append((name_score(value, column, code_column), value))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    best_score, best = candidates[0]
    return best if best_score[0] > 0 else None


def iter_rows(path: Path) -> Iterable[tuple[str, int, list[str]]]:
    book = pd.ExcelFile(path, engine="xlrd")
    print(f"Workbook {path.name}; sheets={book.sheet_names}")
    for sheet in book.sheet_names:
        frame = pd.read_excel(path, sheet_name=sheet, header=None, dtype=object, engine="xlrd")
        print(f"Sheet {sheet!r}: shape={frame.shape}")
        print(frame.head(14).fillna("").to_string(index=True, header=False))
        for row_number, raw_row in frame.iterrows():
            yield sheet, int(row_number) + 1, [clean_cell(value) for value in raw_row.tolist()]


def extract_raw_records() -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    ambiguous: list[dict[str, Any]] = []

    for sheet, row_number, cells in iter_rows(SOURCE):
        codes: list[tuple[int, str]] = []
        for column, value in enumerate(cells):
            code = teryt_code(value)
            if code and code[-1] in TYPE_LABELS:
                codes.append((column, code))

        for code_column, code in codes:
            name = choose_name(cells, code_column)
            if not name:
                ambiguous.append({"sheet": sheet, "row": row_number, "teryt": code, "cells": cells})
                continue

            candidate = {
                "name": name,
                "teryt": code,
                "kind": TYPE_LABELS[code[-1]],
                "voivodeship": VOIVODESHIPS[code[:2]],
                "source_sheet": sheet,
                "source_row": row_number,
            }
            current = records.get(code)
            if current is None or len(candidate["name"]) < len(current["name"]):
                records[code] = candidate

    print(f"Candidate city TERYT codes: {len(records)}")
    if ambiguous:
        print("Rows with a city TERYT code but no detected name:")
        print(json.dumps(ambiguous[:30], ensure_ascii=False, indent=2))

    if len(records) != EXPECTED:
        sample = list(records.values())[:30]
        raise RuntimeError(
            f"Expected {EXPECTED} unique city TERYT codes, extracted {len(records)}. "
            f"First records: {json.dumps(sample, ensure_ascii=False)}"
        )
    return records


def slugify(value: str) -> str:
    replacements = str.maketrans({"ł": "l", "Ł": "L"})
    normalized = unicodedata.normalize("NFKD", value.translate(replacements))
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.casefold()).strip("-")
    if not slug:
        raise ValueError(f"Cannot make slug from {value!r}")
    return slug


def add_unique_slugs(records: list[dict[str, Any]]) -> None:
    by_base: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in records:
        by_base[slugify(item["name"])].append(item)

    for base, group in by_base.items():
        group.sort(key=lambda item: item["teryt"])
        if len(group) == 1:
            group[0]["slug"] = base
            continue

        by_voivodeship = Counter(item["voivodeship"] for item in group)
        for index, item in enumerate(group):
            # Keep one concise canonical slug; disambiguate other same-name cities.
            if index == 0:
                item["slug"] = base
                continue
            woj = slugify(item["voivodeship"])
            suffix = woj if by_voivodeship[item["voivodeship"]] == 1 else f"{woj}-{item['teryt'][:4]}"
            item["slug"] = f"{base}-{suffix}"

    slugs = [item["slug"] for item in records]
    collisions = [slug for slug, count in Counter(slugs).items() if count > 1]
    if collisions:
        raise RuntimeError(f"Slug collisions: {collisions}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    if not SOURCE.exists() or not KTS_SOURCE.exists():
        raise FileNotFoundError("Official GUS workbooks are missing from .cache/gus")

    records = list(extract_raw_records().values())
    records.sort(key=lambda item: (item["name"].casefold(), item["teryt"]))
    add_unique_slugs(records)

    # Source row is useful for audit but should not leak into public page data.
    public_records: list[dict[str, str]] = []
    for item in records:
        public_records.append({
            "name": item["name"],
            "slug": item["slug"],
            "voivodeship": item["voivodeship"],
            "teryt": item["teryt"],
            "kind": item["kind"],
        })

    (DATA / "cities.json").write_text(
        json.dumps(public_records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    with (DATA / "cities.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["name", "slug", "voivodeship", "teryt", "kind"])
        writer.writeheader()
        writer.writerows(public_records)

    manifest = {
        "asOf": "2026-01-01",
        "generatedOn": date.today().isoformat(),
        "cityCount": len(public_records),
        "selection": {
            "terytKinds": [1, 4],
            "description": "gminy miejskie oraz miasta w gminach miejsko-wiejskich",
        },
        "sources": [
            {
                "name": KTS_SOURCE.name,
                "url": "https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultstronaopisowa/5875/1/1/kts_2026v2.xls",
                "sha256": sha256(KTS_SOURCE),
            },
            {
                "name": SOURCE.name,
                "url": "https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultstronaopisowa/5875/1/1/tablica_kts-teryt_2026.xls",
                "sha256": sha256(SOURCE),
            },
        ],
    }
    (DATA / "source-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    counts = Counter(item["voivodeship"] for item in public_records)
    print("Cities by voivodeship:")
    for woj, count in sorted(counts.items()):
        print(f"  {woj}: {count}")
    print(f"Wrote {len(public_records)} cities to data/cities.json and data/cities.csv")


if __name__ == "__main__":
    main()
