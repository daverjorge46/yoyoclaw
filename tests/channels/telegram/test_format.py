"""Tests for Telegram message formatting."""

import pytest

from openclaw_py.channels.telegram.format import (
    TelegramFormattedChunk,
    escape_html,
    escape_html_attr,
    markdown_to_telegram_chunks,
    markdown_to_telegram_html,
    markdown_to_telegram_html_basic,
    markdown_to_telegram_html_chunks,
    render_telegram_html_text,
)


class TestEscapeHtml:
    """Tests for HTML escaping."""

    def test_escape_ampersand(self):
        """Test escaping ampersand."""
        assert escape_html("A & B") == "A &amp; B"

    def test_escape_less_than(self):
        """Test escaping less-than sign."""
        assert escape_html("A < B") == "A &lt; B"

    def test_escape_greater_than(self):
        """Test escaping greater-than sign."""
        assert escape_html("A > B") == "A &gt; B"

    def test_escape_combined(self):
        """Test escaping combined characters."""
        assert escape_html("<tag>value & stuff</tag>") == "&lt;tag&gt;value &amp; stuff&lt;/tag&gt;"


class TestEscapeHtmlAttr:
    """Tests for HTML attribute escaping."""

    def test_escape_quotes(self):
        """Test escaping quotes."""
        assert escape_html_attr('Say "hello"') == "Say &quot;hello&quot;"

    def test_escape_quotes_and_ampersand(self):
        """Test escaping quotes and ampersand."""
        assert escape_html_attr('A & "B"') == "A &amp; &quot;B&quot;"


class TestMarkdownToTelegramHtmlBasic:
    """Tests for basic Markdown conversion."""

    def test_bold(self):
        """Test bold conversion."""
        assert markdown_to_telegram_html_basic("**bold**") == "<b>bold</b>"

    def test_italic(self):
        """Test italic conversion."""
        assert markdown_to_telegram_html_basic("*italic*") == "<i>italic</i>"

    def test_code(self):
        """Test inline code conversion."""
        result = markdown_to_telegram_html_basic("`code`")
        assert "<code>code</code>" in result

    def test_code_block(self):
        """Test code block conversion."""
        result = markdown_to_telegram_html_basic("```python\ncode\n```")
        assert "<pre><code>" in result
        assert "code" in result

    def test_strikethrough(self):
        """Test strikethrough conversion."""
        assert markdown_to_telegram_html_basic("~~strike~~") == "<s>strike</s>"

    def test_link(self):
        """Test link conversion."""
        result = markdown_to_telegram_html_basic("[text](https://example.com)")
        assert '<a href="https://example.com">text</a>' in result

    def test_combined(self):
        """Test combined formatting."""
        result = markdown_to_telegram_html_basic("**bold** and *italic*")
        assert "<b>bold</b>" in result
        assert "<i>italic</i>" in result

    def test_empty_string(self):
        """Test empty string."""
        assert markdown_to_telegram_html_basic("") == ""


class TestRenderTelegramHtmlText:
    """Tests for render_telegram_html_text."""

    def test_markdown_mode(self):
        """Test markdown mode."""
        result = render_telegram_html_text("**bold**", text_mode="markdown")
        assert "<b>bold</b>" in result

    def test_html_mode(self):
        """Test HTML mode (passthrough)."""
        html = "<b>bold</b>"
        result = render_telegram_html_text(html, text_mode="html")
        assert result == html


class TestMarkdownToTelegramHtml:
    """Tests for markdown_to_telegram_html."""

    def test_basic_markdown(self):
        """Test basic markdown conversion."""
        result = markdown_to_telegram_html("**Hello** world")
        assert "<b>Hello</b> world" in result

    def test_empty_markdown(self):
        """Test empty markdown."""
        result = markdown_to_telegram_html("")
        assert result == ""

    def test_none_markdown(self):
        """Test None markdown."""
        result = markdown_to_telegram_html(None)
        assert result == ""


class TestMarkdownToTelegramChunks:
    """Tests for markdown_to_telegram_chunks."""

    def test_short_text(self):
        """Test text shorter than limit."""
        chunks = markdown_to_telegram_chunks("Short text", 100)
        assert len(chunks) == 1
        assert chunks[0].text == "Short text"

    def test_long_text_splitting(self):
        """Test long text gets split."""
        text = "Line 1\n" * 100
        chunks = markdown_to_telegram_chunks(text, 50)
        assert len(chunks) > 1

    def test_empty_text(self):
        """Test empty text."""
        chunks = markdown_to_telegram_chunks("", 100)
        assert chunks == []

    def test_chunk_structure(self):
        """Test chunk structure."""
        chunks = markdown_to_telegram_chunks("**Bold** text", 100)
        assert len(chunks) == 1
        assert isinstance(chunks[0], TelegramFormattedChunk)
        assert chunks[0].html
        assert chunks[0].text


class TestMarkdownToTelegramHtmlChunks:
    """Tests for markdown_to_telegram_html_chunks."""

    def test_basic_chunking(self):
        """Test basic chunking."""
        chunks = markdown_to_telegram_html_chunks("**Bold** text", 100)
        assert len(chunks) == 1
        assert "<b>Bold</b> text" in chunks[0]

    def test_multiple_chunks(self):
        """Test multiple chunks."""
        text = "A" * 200
        chunks = markdown_to_telegram_html_chunks(text, 50)
        assert len(chunks) > 1
        assert all(isinstance(chunk, str) for chunk in chunks)
