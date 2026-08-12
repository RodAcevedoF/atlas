from typing import Any

import pytest

from app.graphs.guardrails import (
    MIN_SIGNAL_COUNT,
    Tag,
    collect_source_tags,
    ground_citations,
    has_enough_coverage,
)

# Annotated, not inferred: Tag is tuple[str | None, str | None] and dict is invariant
NEWS_TAGS: dict[str, Tag] = {"news-1": ("conflict", "europe"), "news-2": ("other", "global")}
MARKET_TAGS: dict[str, Tag] = {"mkt-1": ("conflict", "asia"), "mkt-2": ("other", "global")}

UNCITED_GAP = "1 claim(s) dropped for lacking a verifiable citation."
INCOHERENT_GAP = (
    "1 divergence(s) dropped for not citing a news and a market ref about the same topic or region."
)


def build_source(ref: Any, topic: str | None = None, region: str | None = None) -> dict[str, Any]:
    return {"ref": ref, "topic": topic, "region": region}


def build_claim(*citations: str) -> dict[str, Any]:
    return {"headline": "something happened", "citations": list(citations)}


def gaps_of(result: dict[str, Any]) -> list[str]:
    return list(result["coverage"].get("gaps", []))


class TestCollectSourceTags:
    def test_splits_news_from_markets_and_carries_both_tags(self) -> None:
        payload = {
            "signals": [build_source("news-1", "conflict", "europe")],
            "movers": [build_source("mkt-1", "markets", "asia")],
        }

        news, markets = collect_source_tags(payload)

        assert news == {"news-1": ("conflict", "europe")}
        assert markets == {"mkt-1": ("markets", "asia")}

    def test_a_ref_the_source_left_untagged_is_still_citeable(self) -> None:
        payload = {"signals": [{"ref": "news-1"}]}

        news, _ = collect_source_tags(payload)

        assert news == {"news-1": (None, None)}

    @pytest.mark.parametrize(
        "unusable",
        [
            pytest.param({"topic": "conflict"}, id="no ref at all"),
            pytest.param(build_source(""), id="empty ref"),
            pytest.param(build_source(42), id="non-string ref"),
        ],
    )
    def test_an_item_without_a_usable_ref_is_not_citeable(self, unusable: dict[str, Any]) -> None:
        payload = {"signals": [unusable, build_source("news-1", "conflict")]}

        news, _ = collect_source_tags(payload)

        assert news == {"news-1": ("conflict", None)}

    def test_an_empty_window_yields_no_citeable_refs(self) -> None:
        payload: dict[str, Any] = {}

        news, markets = collect_source_tags(payload)

        assert (news, markets) == ({}, {})


class TestHasEnoughCoverage:
    @pytest.mark.parametrize(
        ("signals", "movers", "expected"),
        [
            pytest.param(MIN_SIGNAL_COUNT, 0, True, id="threshold met by news alone"),
            pytest.param(0, MIN_SIGNAL_COUNT, True, id="threshold met by markets alone"),
            pytest.param(MIN_SIGNAL_COUNT - 1, 1, True, id="threshold met across both sources"),
            pytest.param(MIN_SIGNAL_COUNT - 1, 0, False, id="one short of the threshold"),
            pytest.param(0, 0, False, id="empty window"),
        ],
    )
    def test_the_scope_gate_counts_news_and_markets_together(
        self, signals: int, movers: int, expected: bool
    ) -> None:
        payload = {
            "signals": [build_source(f"news-{index}") for index in range(signals)],
            "movers": [build_source(f"mkt-{index}") for index in range(movers)],
        }

        allowed = has_enough_coverage(payload)

        assert allowed is expected


class TestGroundingDevelopments:
    def test_a_development_survives_on_one_resolvable_citation(self) -> None:
        narrative = {"developments": [build_claim("news-1", "ghost")]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["developments"] == [{**build_claim("news-1"), "citations": ["news-1"]}]

    def test_a_development_may_rest_on_market_evidence_alone(self) -> None:
        narrative = {"developments": [build_claim("mkt-1")]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["developments"] == [build_claim("mkt-1")]

    @pytest.mark.parametrize(
        "unsupported",
        [
            pytest.param(build_claim("ghost"), id="cites a ref that resolves to nothing"),
            pytest.param(build_claim(), id="cites nothing at all"),
        ],
    )
    def test_an_unsupported_development_is_dropped_and_reported(
        self, unsupported: dict[str, Any]
    ) -> None:
        narrative = {"developments": [unsupported]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["developments"] == []
        assert gaps_of(result) == [UNCITED_GAP]


class TestGroundingDivergences:
    def test_a_divergence_citing_both_sides_on_a_shared_topic_survives(self) -> None:
        narrative = {"divergences": [build_claim("news-1", "mkt-1")]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["divergences"] == [build_claim("news-1", "mkt-1")]
        assert gaps_of(result) == []

    def test_a_shared_region_alone_is_enough_to_be_about_the_same_thing(self) -> None:
        news: dict[str, Tag] = {"news-1": ("conflict", "europe")}
        markets: dict[str, Tag] = {"mkt-1": ("markets", "europe")}
        narrative = {"divergences": [build_claim("news-1", "mkt-1")]}

        result = ground_citations(narrative, news, markets)

        assert result["divergences"] == [build_claim("news-1", "mkt-1")]

    def test_a_one_sided_divergence_is_dropped_and_reported(self) -> None:
        narrative = {"divergences": [build_claim("news-1")]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["divergences"] == []
        assert gaps_of(result) == [INCOHERENT_GAP]

    def test_a_divergence_pairing_unrelated_refs_is_dropped(self) -> None:
        news: dict[str, Tag] = {"news-1": ("conflict", "europe")}
        markets: dict[str, Tag] = {"mkt-1": ("markets", "asia")}
        narrative = {"divergences": [build_claim("news-1", "mkt-1")]}

        result = ground_citations(narrative, news, markets)

        assert result["divergences"] == []
        assert gaps_of(result) == [INCOHERENT_GAP]

    @pytest.mark.parametrize(
        ("news", "markets"),
        [
            pytest.param(
                {"news-1": ("other", "global")},
                {"mkt-1": ("other", "global")},
                id="both sides share only the catch-all tags",
            ),
            pytest.param(
                {"news-1": (None, None)},
                {"mkt-1": (None, None)},
                id="both sides are untagged",
            ),
        ],
    )
    def test_a_divergence_proves_nothing_when_the_shared_tag_is_not_a_subject(
        self, news: dict[str, Tag], markets: dict[str, Tag]
    ) -> None:
        narrative = {"divergences": [build_claim("news-1", "mkt-1")]}

        result = ground_citations(narrative, news, markets)

        assert result["divergences"] == []
        assert gaps_of(result) == [INCOHERENT_GAP]

    def test_an_uncited_divergence_is_reported_as_uncited_not_incoherent(self) -> None:
        narrative = {"divergences": [build_claim("ghost")]}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert gaps_of(result) == [UNCITED_GAP]


class TestGroundingCoverageFooter:
    def test_both_drop_reasons_are_surfaced_side_by_side(self) -> None:
        narrative = {
            "developments": [build_claim("ghost")],
            "divergences": [build_claim("news-1")],
        }

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert gaps_of(result) == [UNCITED_GAP, INCOHERENT_GAP]

    def test_pre_existing_gaps_are_kept_and_the_callers_list_is_left_untouched(self) -> None:
        existing = ["known blind spot"]
        narrative = {"developments": [build_claim("ghost")], "coverage": {"gaps": existing}}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert gaps_of(result) == ["known blind spot", UNCITED_GAP]
        assert existing == ["known blind spot"]

    def test_a_clean_narrative_gains_no_coverage_gaps(self) -> None:
        narrative = {"developments": [build_claim("news-1")], "coverage": None}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["coverage"] == {}

    def test_coverage_fields_the_guardrail_does_not_own_are_carried_through(self) -> None:
        narrative = {"developments": [build_claim("ghost")], "coverage": {"sources": 4}}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["coverage"] == {"sources": 4, "gaps": [UNCITED_GAP]}

    def test_fields_the_guardrail_does_not_own_are_passed_through(self) -> None:
        narrative = {"summary": "quiet window"}

        result = ground_citations(narrative, NEWS_TAGS, MARKET_TAGS)

        assert result["summary"] == "quiet window"
        assert result["developments"] == []
        assert result["divergences"] == []
