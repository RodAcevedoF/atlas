from app.graphs.places import (
    distinct_places,
    group_by_place,
    place_claims,
    unplaced_count,
)
from app.ports.claims import Claim, ClaimPlace
from app.ports.places import NormalisedPlace


def claim(text: str, place: str, confidence: float = 0.8) -> Claim:
    return Claim(
        text=text,
        place=ClaimPlace(name=place),
        confidence=confidence,
        source_url="https://example.test/article",
    )


def normalised(
    raw: str,
    name: str,
    country: str | None = "Sudan",
    latitude: float | None = 15.5,
    longitude: float | None = 32.5,
) -> NormalisedPlace:
    return NormalisedPlace(
        raw=raw, name=name, country=country, latitude=latitude, longitude=longitude
    )


class TestDistinctPlaces:
    def test_a_place_repeated_across_claims_is_asked_about_once(self) -> None:
        claims = [claim("a", "Khartoum"), claim("b", "Khartoum"), claim("c", "Darfur")]

        assert distinct_places(claims) == ["Khartoum", "Darfur"]

    def test_order_is_first_seen_so_the_prompt_is_stable(self) -> None:
        claims = [claim("a", "Darfur"), claim("b", "Khartoum"), claim("c", "Darfur")]

        assert distinct_places(claims) == ["Darfur", "Khartoum"]


class TestPlaceClaims:
    def test_claims_join_to_their_place_on_the_raw_string(self) -> None:
        claims = [claim("a", "Khartoum"), claim("b", "Darfur")]
        places = [normalised("Khartoum", "Khartoum"), normalised("Darfur", "Darfur")]

        placed = place_claims(claims, places)

        assert [item.place.name for item in placed] == ["Khartoum", "Darfur"]

    def test_a_claim_whose_place_the_normaliser_skipped_drops_out(self) -> None:
        claims = [claim("a", "Khartoum"), claim("b", "somewhere unnamed")]

        placed = place_claims(claims, [normalised("Khartoum", "Khartoum")])

        assert [item.claim.text for item in placed] == ["a"]


class TestGroupByPlace:
    # this is the aggregation D3 rests on: the run that motivated P2.3 returned four
    # spellings of Khartoum, and they have to become one orb.
    def test_spellings_of_one_city_collapse_into_a_single_group(self) -> None:
        claims = [
            claim("a", "Khartoum"),
            claim("b", "Khartoum, Sudan"),
            claim("c", "Khartoum state, Sudan"),
        ]
        places = [
            normalised("Khartoum", "Khartoum"),
            normalised("Khartoum, Sudan", "Khartoum"),
            normalised("Khartoum state, Sudan", "Khartoum"),
        ]

        groups = group_by_place(place_claims(claims, places))

        assert len(groups) == 1
        assert groups[0].name == "Khartoum"
        assert len(groups[0].claims) == 3

    def test_places_are_ordered_by_claim_count_so_the_map_paints_the_loudest_first(self) -> None:
        claims = [claim("a", "Darfur"), claim("b", "Khartoum"), claim("c", "Khartoum")]
        places = [normalised("Darfur", "Darfur"), normalised("Khartoum", "Khartoum")]

        groups = group_by_place(place_claims(claims, places))

        assert [group.name for group in groups] == ["Khartoum", "Darfur"]

    def test_the_same_name_in_two_countries_stays_two_groups(self) -> None:
        claims = [claim("a", "Tripoli LB"), claim("b", "Tripoli LY")]
        places = [
            normalised("Tripoli LB", "Tripoli", country="Lebanon", latitude=34.4, longitude=35.8),
            normalised("Tripoli LY", "Tripoli", country="Libya", latitude=32.9, longitude=13.2),
        ]

        groups = group_by_place(place_claims(claims, places))

        assert sorted(group.country or "" for group in groups) == ["Lebanon", "Libya"]

    # a prose non-place ("Regional institutions (IGAD)") normalises without coordinates.
    def test_a_place_without_coordinates_never_becomes_an_orb(self) -> None:
        claims = [claim("a", "Khartoum"), claim("b", "Regional institutions (IGAD)")]
        places = [
            normalised("Khartoum", "Khartoum"),
            normalised(
                "Regional institutions (IGAD)",
                "Regional institutions",
                country=None,
                latitude=None,
                longitude=None,
            ),
        ]

        groups = group_by_place(place_claims(claims, places))

        assert [group.name for group in groups] == ["Khartoum"]

    def test_a_place_on_the_equator_is_plotted_rather_than_read_as_missing(self) -> None:
        claims = [claim("a", "Macapá")]
        places = [normalised("Macapá", "Macapá", country="Brazil", latitude=0.0, longitude=0.0)]

        groups = group_by_place(place_claims(claims, places))

        assert [(group.latitude, group.longitude) for group in groups] == [(0.0, 0.0)]


class TestUnplacedCount:
    cases = [
        ("everything plotted leaves nothing unplaced", 2, 2, 0),
        ("a claim the normaliser dropped is unplaced", 1, 2, 1),
    ]

    def test_unplaced_is_what_the_map_cannot_show(self) -> None:
        for name, placed_count, total, expected in self.cases:
            claims = [claim(str(index), "Khartoum") for index in range(placed_count)]
            placed = place_claims(claims, [normalised("Khartoum", "Khartoum")])

            assert unplaced_count(placed, total) == expected, name

    def test_a_claim_placed_without_coordinates_counts_as_unplaced(self) -> None:
        claims = [claim("a", "IGAD")]
        placed = place_claims(
            claims,
            [normalised("IGAD", "IGAD", country=None, latitude=None, longitude=None)],
        )

        assert unplaced_count(placed, 1) == 1
