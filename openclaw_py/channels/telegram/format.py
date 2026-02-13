"""Telegram message formatting utilities.

This module converts Markdown to Telegram HTML format and provides
chunking utilities for long messages.
"""

import html
import re
from typing import Literal, NamedTuple

MarkdownTableMode = Literal["text", "code", "skip"]


class TelegramFormattedChunk(NamedTuple):
    """A formatted chunk of text for Telegram."""

    html: str
    text: str


def escape_html(text: str) -> str:
    """Escape HTML special characters.

    Args:
        text: Text to escape

    Returns:
        HTML-escaped text

    Examples:
        >>> escape_html("Hello <world>")
        'Hello &lt;world&gt;'
        >>> escape_html("A & B")
        'A &amp; B'
    """
    return html.escape(text)


def escape_html_attr(text: str) -> str:
    """Escape HTML attribute values.

    Args:
        text: Attribute value to escape

    Returns:
        Escaped attribute value

    Examples:
        >>> escape_html_attr('Say "hello"')
        'Say &quot;hello&quot;'
    """
    return escape_html(text).replace('"', "&quot;")


def markdown_to_telegram_html_basic(markdown_text: str) -> str:
    """Convert basic Markdown to Telegram HTML.

    This is a simplified implementation that handles common Markdown patterns.
    Supports: bold, italic, code, code blocks, strikethrough, links.

    Args:
        markdown_text: Markdown text to convert

    Returns:
        Telegram-compatible HTML

    Examples:
        >>> markdown_to_telegram_html_basic("**bold** text")
        '<b>bold</b> text'
        >>> markdown_to_telegram_html_basic("*italic* text")
        '<i>italic</i> text'
        >>> markdown_to_telegram_html_basic("`code` here")
        '<code>code</code> here'
    """
    if not markdown_text:
        return ""

    # Start with the raw text
    result = markdown_text

    # Handle code blocks first (```...```)
    result = re.sub(
        r"```(\w*)\n?(.*?)```",
        lambda m: f"<pre><code>{escape_html(m.group(2))}</code></pre>",
        result,
        flags=re.DOTALL,
    )

    # Handle inline code (`...`)
    result = re.sub(
        r"`([^`]+)`",
        lambda m: f"<code>{escape_html(m.group(1))}</code>",
        result,
    )

    # Handle bold (**...**)
    result = re.sub(
        r"\*\*([^\*]+)\*\*",
        r"<b>\1</b>",
        result,
    )

    # Handle italic (*...* but not **)
    result = re.sub(
        r"(?<!\*)\*(?!\*)([^\*]+)\*(?!\*)",
        r"<i>\1</i>",
        result,
    )

    # Handle strikethrough (~~...~~)
    result = re.sub(
        r"~~([^~]+)~~",
        r"<s>\1</s>",
        result,
    )

    # Handle links [text](url)
    def replace_link(match: re.Match) -> str:
        text = match.group(1)
        url = match.group(2)
        safe_url = escape_html_attr(url)
        return f'<a href="{safe_url}">{text}</a>'

    result = re.sub(
        r"\[([^\]]+)\]\(([^\)]+)\)",
        replace_link,
        result,
    )

    return result


def render_telegram_html_text(
    text: str,
    text_mode: Literal["markdown", "html"] = "markdown",
    table_mode: MarkdownTableMode = "text",
) -> str:
    """Render text as Telegram HTML.

    Args:
        text: Text to render
        text_mode: Input format ("markdown" or "html")
        table_mode: How to handle tables (not implemented yet)

    Returns:
        Telegram-compatible HTML

    Examples:
        >>> render_telegram_html_text("**bold**", text_mode="markdown")
        '<b>bold</b>'
        >>> render_telegram_html_text("<b>bold</b>", text_mode="html")
        '<b>bold</b>'
    """
    if text_mode == "html":
        return text

    return markdown_to_telegram_html_basic(text)


def markdown_to_telegram_html(
    markdown: str,
    table_mode: MarkdownTableMode = "text",
) -> str:
    """Convert Markdown to Telegram HTML.

    Args:
        markdown: Markdown text
        table_mode: How to handle tables (not implemented yet)

    Returns:
        Telegram-compatible HTML

    Examples:
        >>> markdown_to_telegram_html("**Hello** world")
        '<b>Hello</b> world'
    """
    return markdown_to_telegram_html_basic(markdown or "")


def markdown_to_telegram_chunks(
    markdown: str,
    limit: int,
    table_mode: MarkdownTableMode = "text",
) -> list[TelegramFormattedChunk]:
    """Convert Markdown to chunks of Telegram HTML.

    Splits text into chunks that fit within the character limit.
    This is a simplified implementation that splits on newlines.

    Args:
        markdown: Markdown text
        limit: Maximum characters per chunk
        table_mode: How to handle tables

    Returns:
        List of formatted chunks

    Examples:
        >>> chunks = markdown_to_telegram_chunks("Line 1\\nLine 2", 10)
        >>> len(chunks) >= 1
        True
    """
    if not markdown:
        return []

    html_text = markdown_to_telegram_html(markdown, table_mode=table_mode)

    # Simple chunking: split by limit
    chunks: list[TelegramFormattedChunk] = []
    current_text = html_text

    while current_text:
        if len(current_text) <= limit:
            chunks.append(
                TelegramFormattedChunk(html=current_text, text=current_text)
            )
            break

        # Find split point (prefer newline)
        split_point = current_text.rfind("\n", 0, limit)
        if split_point == -1 or split_point < limit // 2:
            split_point = limit

        chunk = current_text[:split_point].rstrip()
        chunks.append(TelegramFormattedChunk(html=chunk, text=chunk))
        current_text = current_text[split_point:].lstrip()

    return chunks


def markdown_to_telegram_html_chunks(
    markdown: str,
    limit: int,
    table_mode: MarkdownTableMode = "text",
) -> list[str]:
    """Convert Markdown to list of HTML chunks.

    Args:
        markdown: Markdown text
        limit: Maximum characters per chunk
        table_mode: How to handle tables

    Returns:
        List of HTML strings

    Examples:
        >>> chunks = markdown_to_telegram_html_chunks("**Bold** text", 100)
        >>> chunks[0]
        '<b>Bold</b> text'
    """
    chunks = markdown_to_telegram_chunks(markdown, limit, table_mode=table_mode)
    return [chunk.html for chunk in chunks]
