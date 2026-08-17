"""Structural check on an expanded GDELT query."""

MAX_AND_GROUPS = 2


def _split_top_level(text: str, keyword: str) -> list[str]:
    """Split on ` <keyword> ` at paren depth 0, outside quotes.

    Callers check `_is_balanced` first — this scan has no `depth < 0` guard.
    """
    token = f" {keyword} "
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    in_quotes = False
    index = 0

    while index < len(text):
        char = text[index]
        if char == '"':
            in_quotes = not in_quotes
        elif not in_quotes:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            elif depth == 0 and text[index : index + len(token)] == token:
                parts.append("".join(current))
                current = []
                index += len(token)
                continue
        current.append(char)
        index += 1

    parts.append("".join(current))
    return parts


def _is_balanced(text: str) -> bool:
    depth = 0
    in_quotes = False
    for char in text:
        if char == '"':
            in_quotes = not in_quotes
        elif not in_quotes and char == "(":
            depth += 1
        elif not in_quotes and char == ")":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def _inner_groups(text: str) -> list[str]:
    """The inside of every parenthesised group, at any depth."""
    groups: list[str] = []
    open_indexes: list[int] = []
    in_quotes = False

    for index, char in enumerate(text):
        if char == '"':
            in_quotes = not in_quotes
        elif not in_quotes and char == "(":
            open_indexes.append(index)
        elif not in_quotes and char == ")" and open_indexes:
            groups.append(text[open_indexes.pop() + 1 : index])

    return groups


def _first_repeat(alternatives: list[str]) -> str | None:
    seen: set[str] = set()
    for alternative in alternatives:
        key = alternative.strip().strip('"').casefold()
        if key in seen:
            return alternative.strip()
        seen.add(key)
    return None


def _repeated_alternative(group: str) -> str | None:
    """The first alternative repeated in an OR list, at the group's level or nested inside it."""
    for scope in [group, *_inner_groups(group)]:
        repeated = _first_repeat(_split_top_level(scope, "OR"))
        if repeated:
            return repeated
    return None


def violation(query: str) -> str | None:
    """Why this query is unusable, or None when its shape is sound."""
    text = query.strip()
    if not text:
        return "the expansion produced nothing to measure"
    if text.count('"') % 2:
        return "unbalanced quotes"
    if not _is_balanced(text):
        return "unbalanced parentheses"

    groups = _split_top_level(text, "AND")
    if len(groups) > MAX_AND_GROUPS:
        return (
            f"{len(groups)} AND-groups, at most {MAX_AND_GROUPS} — "
            "each extra group narrows the match instead of widening coverage"
        )

    for group in groups:
        repeated = _repeated_alternative(group)
        if repeated:
            return f"the alternative {repeated} is repeated, padding a group instead of widening it"

    return None
