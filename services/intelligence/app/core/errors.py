class NotImplementedAdapterError(NotImplementedError):
    """Raised when a stub adapter method is called."""


class GraphNotFoundError(LookupError):
    """Raised when a graph name is not registered."""
