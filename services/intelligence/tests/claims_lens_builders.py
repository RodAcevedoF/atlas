from collections.abc import Sequence

from app.graphs.claims_lens import ClaimsLensGraph
from app.ports.analyst import InquiryAnalysis
from app.ports.claims import (
    Claim,
    ClaimPlace,
    ClaimsRetrieval,
    RetrievalCost,
    SourceDocument,
)
from app.ports.places import NormalisedPlace

PLACE_COORDINATES: dict[str, tuple[str, str | None, float | None, float | None]] = {
    "Khartoum": ("Khartoum", "Sudan", 15.5, 32.5),
    "Khartoum, Sudan": ("Khartoum", "Sudan", 15.5, 32.5),
    "El Fasher": ("El Fasher", "Sudan", 13.6, 25.3),
    "el-Fasher": ("El Fasher", "Sudan", 13.6, 25.3),
    "Kassala": ("Kassala", "Sudan", 15.45, 36.4),
    "Nyala": ("Nyala", "Sudan", 12.05, 24.88),
    "Omdurman": ("Omdurman", "Sudan", 15.65, 32.48),
    "Port Sudan": ("Port Sudan", "Sudan", 19.62, 37.22),
    "Regional institutions (IGAD)": ("Regional institutions", None, None, None),
}


def claim(
    text: str,
    place: str,
    confidence: float = 0.8,
    source_url: str = "https://example.test/article",
) -> Claim:
    return Claim(
        text=text,
        place=ClaimPlace(name=place),
        confidence=confidence,
        source_url=source_url,
        source_title="a headline",
        published_date="2026-08-20T00:00:00.000Z",
        source_image_url="https://images.example.test/article.jpg",
    )


def retrieval(claims: list[Claim]) -> ClaimsRetrieval:
    return ClaimsRetrieval(
        question="what is happening in Sudan",
        claims=claims,
        documents=[
            SourceDocument(
                url="https://example.test/article",
                title="a headline",
                published_date="2026-08-20T00:00:00.000Z",
                text="the article body",
                highlights=["a passage"],
            )
        ],
        cost=RetrievalCost(usd=0.045, reported=True, searches=1, results=25),
    )


class StubSource:
    """A ClaimSourcePort that hands back a seeded retrieval, or raises what it was given."""

    def __init__(self, result: ClaimsRetrieval | Exception) -> None:
        self._result = result

    async def fetch(self, question: str, limit: int, window: str) -> ClaimsRetrieval:
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


class StubNormaliser:
    """A PlaceNormaliserPort backed by a real lookup table — it genuinely canonicalises."""

    def __init__(self, failure: Exception | None = None) -> None:
        self._failure = failure

    async def normalise(self, places: Sequence[str]) -> list[NormalisedPlace]:
        if self._failure is not None:
            raise self._failure
        resolved = []
        for raw in places:
            if raw not in PLACE_COORDINATES:
                continue
            name, country, latitude, longitude = PLACE_COORDINATES[raw]
            resolved.append(
                NormalisedPlace(
                    raw=raw,
                    name=name,
                    country=country,
                    kind="specific",
                    latitude=latitude,
                    longitude=longitude,
                )
            )
        return resolved


class StubAnalyst:
    def __init__(
        self,
        analysis: InquiryAnalysis | None = None,
        failure: Exception | None = None,
    ) -> None:
        self._analysis = analysis or InquiryAnalysis(
            synthesis="Most reported activity is around Khartoum.", place_reads=[]
        )
        self._failure = failure
        self.summary_seen: str | None = None

    async def synthesize(self, question: str, places_summary: str) -> InquiryAnalysis:
        if self._failure is not None:
            raise self._failure
        self.summary_seen = places_summary
        return self._analysis


def build(
    source: ClaimsRetrieval | Exception,
    normaliser: StubNormaliser | None = None,
    analyst: StubAnalyst | None = None,
) -> ClaimsLensGraph:
    return ClaimsLensGraph(
        source=StubSource(source),
        normaliser=normaliser or StubNormaliser(),
        analyst=analyst or StubAnalyst(),
    )
