"""
Rules cache — single source of truth for transit interpretation rules.

Reads 8 tables from Postgres (PlanetVibe, HouseClassification, BhavatBhavam,
PlanetSpecialAspect, LifeAreaHouseRelevance, LifeAreaKaraka, PlanetFavorableHouse,
PlanetAreaInterpretation) and caches them in-process for 5 minutes.

Admins edit rows in the DB → propagate within TTL without redeploy.

Falls back to a frozen baseline if the DB is unreachable so the service
keeps serving (degraded but functional). Baseline kept short — the only
fields critical for the composer to produce *some* output. The full
content (interpretation strings, weights, classifications) lives in DB.
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

import asyncpg


CACHE_TTL = timedelta(minutes=5)


@dataclass
class RuleSet:
    # planet -> polarity -> text  ("positive" | "cautious")
    planet_vibe: Dict[str, Dict[str, str]] = field(default_factory=dict)
    # house -> set of tags  ("kendra", "trikona", "dusthana", "upachaya", ...)
    house_classification: Dict[int, Set[str]] = field(default_factory=dict)
    # from_house -> (to_house, label)
    bhavat_bhavam: Dict[int, Tuple[int, str]] = field(default_factory=dict)
    # planet -> list of (offset, strength); universal 7th included if seeded
    planet_special_aspects: Dict[str, List[Tuple[int, float]]] = field(default_factory=dict)
    # life_area -> {house: (weight, rationale)}
    area_house_relevance: Dict[str, Dict[int, Tuple[float, Optional[str]]]] = field(default_factory=dict)
    # life_area -> {planet: (weight, rationale)}
    area_karakas: Dict[str, Dict[str, Tuple[float, Optional[str]]]] = field(default_factory=dict)
    # planet -> set of favorable houses
    planet_favorable_houses: Dict[str, Set[int]] = field(default_factory=dict)
    # (planet, life_area, polarity) -> text
    planet_area_interpretation: Dict[Tuple[str, str, str], str] = field(default_factory=dict)
    # house -> short theme phrase (already DB-backed via HouseSignification table)
    house_signification: Dict[int, str] = field(default_factory=dict)


# ── Frozen fallback baseline (used only if DB unreachable on first load) ────
# Minimal — just enough to produce a non-empty interpretation. Real content
# lives in the DB; if the seed has been run this baseline is never observed.
_FALLBACK = RuleSet(
    planet_vibe={
        "Sun":     {"positive": "confidence", "cautious": "ego friction"},
        "Moon":    {"positive": "warmth", "cautious": "mood swings"},
        "Mars":    {"positive": "drive", "cautious": "impatience"},
        "Mercury": {"positive": "clarity", "cautious": "scatter"},
        "Jupiter": {"positive": "expansion", "cautious": "overreach"},
        "Venus":   {"positive": "harmony", "cautious": "indulgence"},
        "Saturn":  {"positive": "discipline", "cautious": "delay"},
        "Rahu":    {"positive": "novelty", "cautious": "confusion"},
        "Ketu":    {"positive": "insight", "cautious": "withdrawal"},
    },
    house_classification={
        1: {"kendra", "trikona"},
        4: {"kendra"}, 7: {"kendra", "maraka"}, 10: {"kendra", "upachaya"},
        5: {"trikona"}, 9: {"trikona"},
        6: {"dusthana", "upachaya"}, 8: {"dusthana"}, 12: {"dusthana"},
        3: {"upachaya"}, 11: {"upachaya"}, 2: {"maraka"},
    },
    planet_favorable_houses={
        "Sun":     {3, 6, 10, 11},
        "Moon":    {1, 3, 6, 10, 11},
        "Mars":    {3, 6, 10, 11},
        "Mercury": {2, 4, 6, 8, 10, 11},
        "Jupiter": {2, 5, 7, 9, 11},
        "Venus":   {1, 2, 3, 4, 5, 8, 9, 11, 12},
        "Saturn":  {3, 6, 11},
        "Rahu":    {3, 6, 10, 11},
        "Ketu":    {3, 6, 11},
    },
    house_signification={
        1: "self, body, vitality",
        2: "wealth, speech, family",
        3: "courage, siblings, skill, short travel",
        4: "home, mother, peace, property",
        5: "children, creativity, intelligence, romance",
        6: "work, service, enemies, health",
        7: "spouse, partnerships, open dealings",
        8: "transformation, research, hidden matters",
        9: "fortune, dharma, father, higher learning",
        10: "career, public image, authority",
        11: "gains, networks, elder siblings",
        12: "rest, losses, foreign, moksha, privacy",
    },
)


# ── Cache state ─────────────────────────────────────────────────────────────
_cached: Optional[RuleSet] = None
_loaded_at: Optional[datetime] = None
_lock = asyncio.Lock()


def _normalise_db_url(url: str) -> str:
    """asyncpg accepts postgres:// but not the prisma-style query params.
    Strip channel_binding / sslmode that asyncpg doesn't understand."""
    if "?" not in url:
        return url
    base, _, qs = url.partition("?")
    keep = []
    for kv in qs.split("&"):
        k = kv.split("=", 1)[0].lower()
        # asyncpg supports its own ssl/SSL keys; drop libpq-style ones.
        if k in {"channel_binding", "sslmode", "uselibpqcompat"}:
            continue
        keep.append(kv)
    return base if not keep else f"{base}?{'&'.join(keep)}"


async def _load_from_db() -> RuleSet:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    # asyncpg requires SSL for Neon; pass ssl="require" explicitly and
    # drop the libpq-style query-string flags Prisma adds.
    needs_ssl = "neon" in url or "sslmode=require" in url or "channel_binding" in url
    clean_url = _normalise_db_url(url)
    conn = await asyncpg.connect(clean_url, ssl="require" if needs_ssl else None)
    try:
        rs = RuleSet()

        rows = await conn.fetch('SELECT planet, polarity, text FROM "PlanetVibe"')
        for r in rows:
            rs.planet_vibe.setdefault(r["planet"], {})[r["polarity"]] = r["text"]

        rows = await conn.fetch('SELECT house, tag FROM "HouseClassification"')
        for r in rows:
            rs.house_classification.setdefault(r["house"], set()).add(r["tag"])

        rows = await conn.fetch('SELECT "fromHouse", "toHouse", label FROM "BhavatBhavam"')
        for r in rows:
            rs.bhavat_bhavam[r["fromHouse"]] = (r["toHouse"], r["label"])

        rows = await conn.fetch('SELECT planet, "aspectOffset", strength FROM "PlanetSpecialAspect"')
        for r in rows:
            rs.planet_special_aspects.setdefault(r["planet"], []).append(
                (r["aspectOffset"], r["strength"])
            )

        rows = await conn.fetch('SELECT "lifeArea", house, weight, rationale FROM "LifeAreaHouseRelevance"')
        for r in rows:
            rs.area_house_relevance.setdefault(r["lifeArea"], {})[r["house"]] = (
                r["weight"], r["rationale"]
            )

        rows = await conn.fetch('SELECT "lifeArea", planet, weight, rationale FROM "LifeAreaKaraka"')
        for r in rows:
            rs.area_karakas.setdefault(r["lifeArea"], {})[r["planet"]] = (
                r["weight"], r["rationale"]
            )

        rows = await conn.fetch('SELECT planet, house FROM "PlanetFavorableHouse"')
        for r in rows:
            rs.planet_favorable_houses.setdefault(r["planet"], set()).add(r["house"])

        rows = await conn.fetch('SELECT planet, "lifeArea", polarity, text FROM "PlanetAreaInterpretation"')
        for r in rows:
            rs.planet_area_interpretation[(r["planet"], r["lifeArea"], r["polarity"])] = r["text"]

        rows = await conn.fetch('SELECT house, short FROM "HouseSignification"')
        for r in rows:
            rs.house_signification[r["house"]] = r["short"]

        return rs
    finally:
        await conn.close()


async def get_rules() -> RuleSet:
    """Return cached RuleSet, refreshing if older than CACHE_TTL.
    Falls back to baseline if first load fails so the API stays up."""
    global _cached, _loaded_at
    async with _lock:
        now = datetime.utcnow()
        if _cached is not None and _loaded_at is not None and (now - _loaded_at) < CACHE_TTL:
            return _cached
        try:
            _cached = await _load_from_db()
            _loaded_at = now
            return _cached
        except Exception as e:
            print(f"[rules] DB load failed, using fallback: {e}")
            if _cached is None:
                _cached = _FALLBACK
                _loaded_at = now
            return _cached


def get_rules_sync() -> RuleSet:
    """Returns cached RuleSet. Caller MUST have awaited get_rules() at
    least once (typically in an async route handler) so the cache is warm.
    Falls back to the frozen baseline if cache is cold — never blocks."""
    return _cached if _cached is not None else _FALLBACK


def invalidate() -> None:
    """Force the next get_rules() call to re-fetch from DB."""
    global _cached, _loaded_at
    _cached = None
    _loaded_at = None
