#!/usr/bin/env python3
"""Clean technical KTS labels and assign production-safe city slugs."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
EXPECTED = 1026


def clean_name(value: str) -> str:
    name = re.sub(r"\s*-\s*miasto\s*\(4\)\s*$", "", value, flags=re.IGNORECASE)
    name = re.sub(r"\s*\(1\)\s*$", "", name)
    return re.sub(r"\s+", " ", name).strip()


def slugify(value: str) -> str:
    value = value.translate(str.maketrans({"ł": "l", "Ł": "L"}))
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii").casefold()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def assign_slugs(cities: list[dict[str, str]]) -> None:
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for city in cities:
        city["name"] = clean_name(city["name"])
        groups[slugify(city["name"])].append(city)

    for base, group in groups.items():
        group.sort(key=lambda item: item["teryt"])
        if len(group) == 1:
            group[0]["slug"] = base
            continue

        woj_counts = Counter(item["voivodeship"] for item in group)
        for index, city in enumerate(group):
            if index == 0:
                city["slug"] = base
                continue
            woj = slugify(city["voivodeship"])
            if woj_counts[city["voivodeship"]] == 1:
                city["slug"] = f"{base}-{woj}"
            else:
                city["slug"] = f"{base}-{woj}-{city['teryt'][:4]}"


def main() -> None:
    json_path = DATA / "cities.json"
    cities = json.loads(json_path.read_text(encoding="utf-8"))
    if len(cities) != EXPECTED:
        raise RuntimeError(f"Expected {EXPECTED} cities, got {len(cities)}")

    assign_slugs(cities)
    cities.sort(key=lambda item: (item["name"].casefold(), item["teryt"]))

    bad_names = [
        item["name"] for item in cities
        if re.search(r"\((1|4)\)\s*$|\s-\smiasto\s*$", item["name"], flags=re.IGNORECASE)
    ]
    if bad_names:
        raise RuntimeError(f"Technical labels remain in names: {bad_names[:20]}")

    slugs = [item["slug"] for item in cities]
    duplicates = [slug for slug, count in Counter(slugs).items() if count > 1]
    if duplicates:
        raise RuntimeError(f"Duplicate slugs: {duplicates}")

    json_path.write_text(
        json.dumps(cities, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    with (DATA / "cities.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["name", "slug", "voivodeship", "teryt", "kind"])
        writer.writeheader()
        writer.writerows(cities)

    print(f"Normalized {len(cities)} city names and {len(slugs)} unique slugs.")


if __name__ == "__main__":
    main()
