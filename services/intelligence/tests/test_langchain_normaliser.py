import asyncio
from collections.abc import Sequence
from typing import Any

import pytest
from pydantic import ValidationError

from app.adapters.langchain_normaliser import (
    LangChainPlaceNormaliser,
    _NormalisedPlace,
    batched,
    collect,
    normalise_batches,
    render_places,
    to_normalised,
)
from app.core.config import Settings
from app.ports.places import NormalisedPlace, PlaceNormaliserUnavailable


def entry(index: int, name: str, **overrides: Any) -> _NormalisedPlace:
    kind = overrides.pop("kind", "specific")
    return _NormalisedPlace(index=index, name=name, kind=kind, **overrides)


class TestRenderPlaces:
    def test_places_are_numbered_so_the_model_can_answer_by_index(self) -> None:
        assert render_places(["Khartoum", "Darfur"]) == "0. Khartoum\n1. Darfur"


class TestCollect:
    def test_entries_are_matched_by_index_not_by_position(self) -> None:
        entries = [entry(1, "Darfur"), entry(0, "Khartoum")]

        resolved = collect(entries, ["Khartoum", "Darfur"])

        assert [(place.raw, place.name) for place in resolved] == [
            ("Khartoum", "Khartoum"),
            ("Darfur", "Darfur"),
        ]

    def test_a_place_the_model_skipped_is_left_out_rather_than_mispaired(self) -> None:
        resolved = collect([entry(0, "Khartoum")], ["Khartoum", "Darfur"])

        assert [place.raw for place in resolved] == ["Khartoum"]

    def test_an_index_outside_the_input_is_discarded(self) -> None:
        resolved = collect([entry(7, "Nowhere"), entry(0, "Khartoum")], ["Khartoum"])

        assert [place.raw for place in resolved] == ["Khartoum"]


class TestToNormalised:
    def test_coordinates_survive_when_the_model_named_the_place(self) -> None:
        place = to_normalised(
            entry(0, "Khartoum", country="Sudan", latitude=15.5, longitude=32.5), "Khartoum, Sudan"
        )

        assert place.raw == "Khartoum, Sudan"
        assert place.name == "Khartoum"
        assert place.is_plottable()

    def test_a_blank_country_becomes_none_rather_than_an_empty_label(self) -> None:
        place = to_normalised(entry(0, "Khartoum", country="  "), "Khartoum")

        assert place.country is None

    def test_a_nameless_answer_falls_back_to_the_raw_string_and_stays_unplottable(self) -> None:
        place = to_normalised(entry(0, "  ", latitude=15.5, longitude=32.5), "IGAD")

        assert place.name == "IGAD"
        assert not place.is_plottable()

    def test_a_supranational_region_stays_unplottable_even_if_the_model_gave_a_centroid(
        self,
    ) -> None:
        place = to_normalised(
            entry(0, "Europe", kind="supranational", latitude=54.5, longitude=15.3),
            "Europe",
        )

        assert not place.is_plottable()

    def test_a_named_body_of_water_remains_a_specific_location(self) -> None:
        place = to_normalised(
            entry(0, "Red Sea", country=None, latitude=20.2, longitude=38.1),
            "Red Sea",
        )

        assert place.is_plottable()

    def test_a_country_named_on_its_own_remains_plottable(self) -> None:
        place = to_normalised(
            entry(
                0,
                "Sudan",
                kind="country",
                country="Sudan",
                latitude=15.6,
                longitude=30.2,
            ),
            "Sudan",
        )

        assert place.is_plottable()


class RecordingNormaliser:
    """A batch normaliser that really canonicalises, and reports how many batches it ran at once."""

    def __init__(self, delays: dict[str, float] | None = None, failing: str | None = None) -> None:
        self._delays = delays or {}
        self._failing = failing
        self.live = 0
        self.peak = 0

    async def __call__(self, places: Sequence[str]) -> list[NormalisedPlace]:
        self.live += 1
        self.peak = max(self.peak, self.live)
        try:
            await asyncio.sleep(self._delays.get(places[0], 0))
            if self._failing is not None and self._failing in places:
                raise PlaceNormaliserUnavailable(f"normalisation failed: {self._failing}")
            return [
                NormalisedPlace(
                    raw=raw,
                    name=raw.title(),
                    country=None,
                    kind="specific",
                    latitude=1.0,
                    longitude=2.0,
                )
                for raw in places
            ]
        finally:
            self.live -= 1


def normalise(
    places: Sequence[str],
    normaliser: RecordingNormaliser,
    batch_size: int = 2,
    max_concurrency: int = 4,
) -> list[NormalisedPlace]:
    return asyncio.run(normalise_batches(places, normaliser, batch_size, max_concurrency))


class TestBatched:
    def test_places_are_split_in_order_with_a_short_final_batch(self) -> None:
        assert batched(["a", "b", "c", "d", "e"], 2) == [["a", "b"], ["c", "d"], ["e"]]

    def test_a_batch_size_at_or_above_the_input_leaves_one_call(self) -> None:
        assert batched(["a", "b"], 8) == [["a", "b"]]


class TestNormaliseBatches:
    def test_no_places_asks_the_model_nothing(self) -> None:
        normaliser = RecordingNormaliser()

        assert normalise([], normaliser) == []
        assert normaliser.peak == 0

    def test_one_batch_answers_directly_without_a_group(self) -> None:
        normaliser = RecordingNormaliser()

        resolved = normalise(["khartoum", "darfur", "kassala"], normaliser, batch_size=8)

        assert [place.name for place in resolved] == ["Khartoum", "Darfur", "Kassala"]
        assert normaliser.peak == 1

    def test_results_follow_input_order_even_when_an_early_batch_answers_last(self) -> None:
        normaliser = RecordingNormaliser(delays={"khartoum": 0.05})

        resolved = normalise(["khartoum", "darfur", "kassala", "nyala"], normaliser)

        assert [place.raw for place in resolved] == ["khartoum", "darfur", "kassala", "nyala"]

    def test_batches_run_concurrently_up_to_the_bound_and_no_further(self) -> None:
        normaliser = RecordingNormaliser(delays=dict.fromkeys(["a", "c", "e", "g"], 0.02))

        normalise(["a", "b", "c", "d", "e", "f", "g", "h"], normaliser, max_concurrency=2)

        assert normaliser.peak == 2

    def test_a_batch_that_fails_surfaces_as_the_port_error_not_an_exception_group(self) -> None:
        normaliser = RecordingNormaliser(failing="nyala")

        with pytest.raises(PlaceNormaliserUnavailable) as failure:
            normalise(["khartoum", "darfur", "kassala", "nyala"], normaliser)

        assert "nyala" in str(failure.value)


class TestLangChainPlaceNormaliserFailures:
    @pytest.mark.parametrize("places", [["khartoum", "darfur"], ["khartoum", "darfur", "nyala"]])
    def test_an_unusable_chat_model_is_the_port_error_whatever_the_batch_count(
        self, places: list[str]
    ) -> None:
        normaliser = LangChainPlaceNormaliser(Settings(llm_provider="nope", normalise_batch_size=2))

        with pytest.raises(PlaceNormaliserUnavailable):
            asyncio.run(normaliser.normalise(places))


class TestNormaliseSettings:
    def test_a_non_positive_batch_size_fails_at_startup(self) -> None:
        with pytest.raises(ValidationError):
            Settings(normalise_batch_size=0)

    def test_a_non_positive_concurrency_fails_at_startup(self) -> None:
        with pytest.raises(ValidationError):
            Settings(normalise_max_concurrency=0)
