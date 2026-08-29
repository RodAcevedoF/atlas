import asyncio
from typing import Any

import pytest

from app.core.errors import GraphInputError
from app.graphs.attachment_interpretation import AttachmentInterpretationGraph
from app.ports.attachment_interpreter import AttachmentInterpretation
from app.ports.vision_attachment_interpreter import ImageMediaType


class InMemoryAttachmentInterpreter:
    def __init__(self, result: AttachmentInterpretation) -> None:
        self.result = result

    async def interpret(
        self, profile: dict[str, Any], user_text: str
    ) -> AttachmentInterpretation:
        if not profile.get("sheets"):
            raise AssertionError("the bounded profile did not reach the interpreter")
        if user_text != "focus on supply disruptions":
            raise AssertionError("the user's research intent did not reach the interpreter")
        return self.result


class InMemoryVisionAttachmentInterpreter:
    def __init__(self, result: AttachmentInterpretation) -> None:
        self.result = result

    async def interpret_image(
        self, image: bytes, media_type: ImageMediaType, user_text: str
    ) -> AttachmentInterpretation:
        if image != b"visible pixels" or media_type != "image/png":
            raise AssertionError("the validated image did not reach the vision interpreter")
        return self.result


def test_tabular_profile_becomes_the_shared_interpretation_shape() -> None:
    expected = AttachmentInterpretation(
        summary="A supplier table",
        facts=["Three suppliers are represented"],
        entities=["Atlas Metals"],
        proposed_question="Where are Atlas Metals supply disruptions being reported?",
        needs_clarification=False,
        clarification_question=None,
    )
    graph = AttachmentInterpretationGraph(
        InMemoryAttachmentInterpreter(expected),
        InMemoryVisionAttachmentInterpreter(expected),
    )

    result = asyncio.run(
        graph.run(
            "run-1",
            {
                "kind": "tabular",
                "profile": {"sheets": [{"name": "Suppliers"}]},
                "userText": "focus on supply disruptions",
            },
        )
    )

    assert result == {
        "summary": expected.summary,
        "facts": expected.facts,
        "entities": expected.entities,
        "proposedQuestion": expected.proposed_question,
        "needsClarification": False,
        "clarificationQuestion": None,
    }


def test_non_tabular_input_is_rejected_before_a_model_call() -> None:
    interpreter = InMemoryAttachmentInterpreter(
        AttachmentInterpretation("", [], [], "", False, None)
    )
    graph = AttachmentInterpretationGraph(
        interpreter,
        InMemoryVisionAttachmentInterpreter(interpreter.result),
    )

    with pytest.raises(GraphInputError, match="supported kind"):
        asyncio.run(graph.run("run-1", {"kind": "pdf", "profile": {"sheets": []}}))


def test_image_bytes_reach_vision_through_the_same_result_shape() -> None:
    expected = AttachmentInterpretation(
        summary="A chart about port delays",
        facts=["The chart labels Valencia"],
        entities=["Valencia"],
        proposed_question="Where are port delays being reported around Valencia?",
        needs_clarification=False,
        clarification_question=None,
    )
    graph = AttachmentInterpretationGraph(
        InMemoryAttachmentInterpreter(expected),
        InMemoryVisionAttachmentInterpreter(expected),
    )

    result = asyncio.run(
        graph.run(
            "run-2",
            {
                "kind": "image",
                "mediaType": "image/png",
                "bytesBase64": "dmlzaWJsZSBwaXhlbHM=",
                "userText": "",
            },
        )
    )

    assert result["proposedQuestion"] == expected.proposed_question
