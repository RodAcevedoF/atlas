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
