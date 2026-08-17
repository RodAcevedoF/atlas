from app.graphs.query_validation import violation

rejected = [
    (
        "three AND-groups narrow the match to nothing",
        "Taiwan AND (strait OR 海峡) AND (tensions OR 紧张)",
        "AND-groups",
    ),
    (
        "a padded group repeats a term instead of listing a real variant",
        "(Congo OR Congo OR الكونغو) AND (mpox OR monkeypox)",
        "repeated",
    ),
    (
        "padding is caught however it is cased or quoted",
        '(mpox OR "MPOX" OR variole)',
        "repeated",
    ),
    (
        "padding by repeating a whole group is still padding",
        "(mpox) OR (mpox)",
        "repeated",
    ),
    (
        "a lowercase and is not a separator, so the group behind it must still be read",
        "Sudan and (famine OR famine)",
        "repeated",
    ),
    (
        "an unclosed group cannot be parsed by the source",
        "Sudan AND (famine OR مجاعة",
        "parentheses",
    ),
    (
        "a stray closing paren is as broken as a missing one",
        "Sudan) AND (famine OR fome)",
        "parentheses",
    ),
    (
        "an unterminated phrase swallows the rest of the query",
        'Haiti AND ("gang violence OR fome)',
        "quotes",
    ),
    ("nothing to measure is not a query", "   ", "nothing to measure"),
]

accepted = [
    ("the shape the prompt is aiming for", "Sudan AND (famine OR hambruna OR مجاعة OR fome)"),
    ("one group is preferred over two", '("gang violence" OR "violence des gangs")'),
    ("a bare proper noun needs no group at all", "Sudan"),
    (
        "AND inside a group is a nesting problem, not a group count",
        "Sudan AND (famine OR (hambruna AND fome))",
    ),
    (
        "a repeat across different groups is not padding",
        'Congo AND (Congo OR "République du Congo")',
    ),
]


class TestViolation:
    def test_a_malformed_query_is_named_rather_than_measured(self) -> None:
        for name, query, expected in rejected:
            reason = violation(query)

            assert reason is not None, name
            assert expected in reason, name

    def test_a_sound_query_passes_untouched(self) -> None:
        for name, query in accepted:
            assert violation(query) is None, name
