"""Telegram API error logging wrapper.

This module provides error logging for Telegram API calls.
"""

from functools import wraps
from typing import Any, Callable, TypeVar

from openclaw_py.logging import log_error, log_warn

T = TypeVar("T")


def with_telegram_api_error_logging(
    operation_name: str = "Telegram API call",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to add error logging to Telegram API calls.

    Args:
        operation_name: Name of the operation (for logging)

    Returns:
        Decorator function

    Examples:
        >>> @with_telegram_api_error_logging("send_message")
        ... async def send_message(chat_id, text):
        ...     await bot.send_message(chat_id, text)
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Log the error with context
                error_msg = str(e)
                error_type = type(e).__name__

                log_error(
                    f"{operation_name} failed: {error_type}: {error_msg}",
                    operation=operation_name,
                    error_type=error_type,
                    error_message=error_msg,
                )

                # Re-raise the exception
                raise

        return wrapper

    return decorator


def log_telegram_api_error(
    error: Exception,
    operation: str = "Telegram API operation",
    context: dict[str, Any] | None = None,
) -> None:
    """Log a Telegram API error with context.

    Args:
        error: The exception that occurred
        operation: Name of the operation that failed
        context: Additional context (chat_id, message_id, etc.)

    Examples:
        >>> try:
        ...     await bot.send_message(chat_id, text)
        ... except Exception as e:
        ...     log_telegram_api_error(e, "send_message", {"chat_id": chat_id})
    """
    error_msg = str(error)
    error_type = type(error).__name__

    log_data = {
        "operation": operation,
        "error_type": error_type,
        "error_message": error_msg,
    }

    if context:
        log_data.update(context)

    log_error(f"{operation} failed: {error_type}: {error_msg}", **log_data)


def log_telegram_api_warning(
    message: str,
    operation: str = "Telegram API operation",
    context: dict[str, Any] | None = None,
) -> None:
    """Log a Telegram API warning with context.

    Args:
        message: Warning message
        operation: Name of the operation
        context: Additional context

    Examples:
        >>> log_telegram_api_warning(
        ...     "Rate limit approaching",
        ...     "send_message",
        ...     {"chat_id": 123, "retry_after": 5}
        ... )
    """
    log_data = {"operation": operation}

    if context:
        log_data.update(context)

    log_warn(f"{operation}: {message}", **log_data)
