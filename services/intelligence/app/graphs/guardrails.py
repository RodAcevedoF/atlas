"""Reusable guardrail bricks for AI graphs.

These compose into any graph's pipeline as ordinary nodes. They exist to keep the
model honest structurally rather than by prompt-hope: a scope gate refuses to narrate
over too-thin evidence, and citation grounding drops any claim that doesn't resolve to
a real source ref.
"""

from typing import Any

MIN_SIGNAL_COUNT = 3

# The taxonomy's "couldn't classify" fallbacks (domain: topic ?? "other", DEFAULT_REGION
# "global"). They're catch-alls, not real subjects — two refs sharing one are not shown to
# be about the same thing, so they don't count as coherence matches.
UNSPECIFIC_TAGS = {"other", "global"}

# ref -> (topic, region); either tag may be None when the source left it untagged.
Tag = tuple[str | None, str | None]


def _tag_map(items: list[dict[str, Any]]) -> dict[str, Tag]:
    tags: dict[str, Tag] = {}
    for item in items:
        ref = item.get("ref")
        if isinstance(ref, str) and ref:
            tags[ref] = (item.get("topic"), item.get("region"))
    return tags


def collect_source_tags(payload: dict[str, Any]) -> tuple[dict[str, Tag], dict[str, Tag]]:
    """Citeable refs (with their topic/region tags) split by epistemic source:
    news (attention) vs markets (expectation).

    Kept separate, and carrying tags, so a divergence can be checked for citing *both*
    sides AND for the two sides actually being about the same thing.
    """
    return _tag_map(payload.get("signals", [])), _tag_map(payload.get("movers", []))


def has_enough_coverage(payload: dict[str, Any]) -> bool:
    """Scope gate — is there enough evidence in the window to be worth a scan?"""
    total = len(payload.get("signals", [])) + len(payload.get("movers", []))
    return total >= MIN_SIGNAL_COUNT


def _tags_match(left: str | None, right: str | None) -> bool:
    """Two tags match only if equal and specific — a shared catch-all ("other"/"global")
    or a null proves nothing about being the same subject."""
    return left == right and left is not None and left not in UNSPECIFIC_TAGS


def _shares_subject(news_tag: Tag, market_tag: Tag) -> bool:
    """A cited news ref and market ref are about the same thing if they share a specific
    topic or region. A heuristic proxy for topical coherence — not semantic understanding,
    but enough to reject a divergence that pairs unrelated refs to satisfy the both-sides
    rule."""
    news_topic, news_region = news_tag
    market_topic, market_region = market_tag
    return _tags_match(news_topic, market_topic) or _tags_match(news_region, market_region)


def _coherent_divergence(
    cites: list[str], news_tags: dict[str, Tag], market_tags: dict[str, Tag]
) -> bool:
    """True if the citations include a news ref and a market ref that share a subject."""
    return any(
        _shares_subject(news_tags[news_ref], market_tags[market_ref])
        for news_ref in cites
        if news_ref in news_tags
        for market_ref in cites
        if market_ref in market_tags
    )


def ground_citations(
    narrative: dict[str, Any], news_tags: dict[str, Tag], market_tags: dict[str, Tag]
) -> dict[str, Any]:
    """Drop any claim whose citations don't resolve to real, coherent source refs.

    Structural defenses against confident-narrative-over-noise:
    - A development needs >=1 citation resolving to a real ref (news or market).
    - A divergence is an attention-vs-expectation claim *by definition*, so it must cite a
      news ref AND a market ref that share a topic or region. One-sided or subject-mismatched
      divergences assert a disagreement the data can't show — they are dropped, not trusted.

    Dropped claims are surfaced in the coverage footer rather than hidden.
    """
    known = set(news_tags) | set(market_tags)
    dropped_uncited = 0
    dropped_incoherent = 0

    developments: list[dict[str, Any]] = []
    for claim in narrative.get("developments", []):
        cites = [ref for ref in claim.get("citations", []) if ref in known]
        if cites:
            developments.append({**claim, "citations": cites})
        else:
            dropped_uncited += 1

    divergences: list[dict[str, Any]] = []
    for claim in narrative.get("divergences", []):
        cites = [ref for ref in claim.get("citations", []) if ref in known]
        if not cites:
            dropped_uncited += 1
        elif _coherent_divergence(cites, news_tags, market_tags):
            divergences.append({**claim, "citations": cites})
        else:
            dropped_incoherent += 1

    coverage = dict(narrative.get("coverage") or {})
    gaps = list(coverage.get("gaps", []))
    if dropped_uncited:
        gaps.append(f"{dropped_uncited} claim(s) dropped for lacking a verifiable citation.")
    if dropped_incoherent:
        gaps.append(
            f"{dropped_incoherent} divergence(s) dropped for not citing a news and a market "
            "ref about the same topic or region."
        )
    if gaps:
        coverage["gaps"] = gaps

    return {
        **narrative,
        "developments": developments,
        "divergences": divergences,
        "coverage": coverage,
    }
