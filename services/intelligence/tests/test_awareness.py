from app.graphs.awareness import loudest, rate_country, rate_distribution
from app.ports.awareness import AwarenessDistribution, CountrySeriesStats

BUCKETS = 166


def stats(country: str, awareness: float, peak: float, covered: int) -> CountrySeriesStats:
    return CountrySeriesStats(
        country=country,
        awareness=awareness,
        peak=peak,
        covered_buckets=covered,
        total_buckets=BUCKETS,
    )


class TestConfidence:
    cases = [
        ("a saturated peak sustained across the window is a real level", 13.139, 100.0, 25,
         "measured"),
        ("a saturated peak over a handful of buckets is spiky but real", 1.392, 100.0, 6, "thin"),
        ("a saturated peak over almost no buckets is a denominator artifact", 0.602, 100.0, 1,
         "artifact"),
        ("an unsaturated peak is measured however low the level", 1.241, 18.868, 61, "measured"),
        ("near-silence never saturates, so it is reported not discarded", 0.016, 2.632, 1, "thin"),
    ]

    def test_shapes_are_tiered_by_whether_they_could_be_overstated(self) -> None:
        for name, awareness, peak, covered, expected in self.cases:
            rated = rate_country(stats("Somewhere", awareness, peak, covered))

            assert rated.confidence == expected, name

    def test_a_silent_country_is_never_an_artifact(self) -> None:
        silent = rate_country(stats("Japan", 0.016, 2.632, 1))

        assert silent.confidence != "artifact"

    def test_the_shape_inputs_survive_rating(self) -> None:
        rated = rate_country(stats("Sudan", 13.139, 100.0, 25))

        assert rated.stats.covered_buckets == 25
        assert rated.stats.total_buckets == BUCKETS
        assert rated.stats.peak == 100.0


class TestLoudest:
    def test_artifacts_are_kept_out_of_the_ranking(self) -> None:
        distribution = AwarenessDistribution(
            executed_query="sudan",
            window="1w",
            countries=[
                stats("Sudan", 13.139, 100.0, 25),
                stats("Gambia", 0.602, 100.0, 1),
                stats("South Korea", 1.241, 18.868, 61),
            ],
        )

        ranking = loudest(rate_distribution(distribution), limit=10)

        assert [country.stats.country for country in ranking] == ["Sudan", "South Korea"]

    def test_thin_countries_stay_in_the_ranking_for_the_caller_to_de_emphasize(self) -> None:
        distribution = AwarenessDistribution(
            executed_query="sudan",
            window="1w",
            countries=[
                stats("Sudan", 13.139, 100.0, 25),
                stats("Sierra Leone", 1.392, 100.0, 6),
            ],
        )

        ranking = loudest(rate_distribution(distribution), limit=10)

        assert [country.confidence for country in ranking] == ["measured", "thin"]

    def test_the_ranking_is_capped(self) -> None:
        distribution = AwarenessDistribution(
            executed_query="sudan",
            window="1w",
            countries=[stats(f"C{index}", float(index), 5.0, 50) for index in range(20)],
        )

        ranking = loudest(rate_distribution(distribution), limit=3)

        assert len(ranking) == 3
        assert [country.stats.country for country in ranking] == ["C19", "C18", "C17"]
