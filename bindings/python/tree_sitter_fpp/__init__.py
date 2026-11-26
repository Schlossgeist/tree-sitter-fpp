"""FPP grammar for tree-sitter"""

from ._binding import language


def _get_query(name, file):
    # Imported here and not at the top: importlib.resources takes several
    # milliseconds to import, and only the queries need it.
    import importlib.resources

    query = importlib.resources.files(f"{__package__}.queries") / file
    globals()[name] = query.read_text()
    return globals()[name]


def __getattr__(name):
    if name == "HIGHLIGHTS_QUERY":
        return _get_query("HIGHLIGHTS_QUERY", "highlights.scm")
    if name == "INJECTIONS_QUERY":
        return _get_query("INJECTIONS_QUERY", "injections.scm")
    if name == "TAGS_QUERY":
        return _get_query("TAGS_QUERY", "tags.scm")

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "language",
    "HIGHLIGHTS_QUERY",
    "INJECTIONS_QUERY",
    "TAGS_QUERY",
]


def __dir__():
    return sorted(__all__ + [
        "__all__", "__builtins__", "__cached__", "__doc__", "__file__",
        "__loader__", "__name__", "__package__", "__path__", "__spec__",
    ])
