from typing import Any

from app.adapters.langchain_normaliser import (
    _NormalisedPlace,
    collect,
    render_places,
    to_normalised,
)


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
