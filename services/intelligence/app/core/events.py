from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

GraphEventType = Literal[
    "node:start",
    "node:end",
    "node:error",
    "run:complete",
    "run:error",
]


@dataclass(slots=True)
class GraphEvent:
    runId: str
    node: str
    type: GraphEventType
    data: dict[str, Any] | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_json(self) -> dict[str, Any]:
        return {
            "runId": self.runId,
            "node": self.node,
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
        }


RunEnvelopeType = Literal[
    "retrieval_complete",
    "map_ready",
    "synthesis_ready",
    "place_read_ready",
    "run_complete",
    "run_failed",
]

RunFailureClass = Literal[
    "transport",
    "unusable_result",
    "timeout",
    "abandoned",
    "internal",
]

RUN_ENVELOPE_SCHEMA_VERSION = 1


@dataclass(slots=True)
class RunEnvelope:
    runId: str
    attempt: int
    sequence: int
    type: RunEnvelopeType
    durationMs: int
    data: dict[str, Any]
    schemaVersion: int = RUN_ENVELOPE_SCHEMA_VERSION
    occurredAt: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_json(self) -> dict[str, Any]:
        return {
            "schemaVersion": self.schemaVersion,
            "runId": self.runId,
            "attempt": self.attempt,
            "sequence": self.sequence,
            "type": self.type,
            "occurredAt": self.occurredAt.isoformat(),
            "durationMs": self.durationMs,
            "data": self.data,
        }
