"""Tests for Telegram media handling."""

import pytest

from openclaw_py.channels.telegram.media import (
    is_gif_media,
    media_kind_from_mime,
)


class TestMediaKindFromMime:
    """Tests for media_kind_from_mime."""

    def test_jpeg_photo(self):
        """Test JPEG is photo."""
        assert media_kind_from_mime("image/jpeg") == "photo"

    def test_png_photo(self):
        """Test PNG is photo."""
        assert media_kind_from_mime("image/png") == "photo"

    def test_gif_animation(self):
        """Test GIF is animation."""
        assert media_kind_from_mime("image/gif") == "animation"

    def test_mp4_video(self):
        """Test MP4 is video."""
        assert media_kind_from_mime("video/mp4") == "video"

    def test_mpeg_video(self):
        """Test MPEG is video."""
        assert media_kind_from_mime("video/mpeg") == "video"

    def test_mp3_audio(self):
        """Test MP3 is audio."""
        assert media_kind_from_mime("audio/mpeg") == "audio"

    def test_ogg_audio(self):
        """Test OGG is audio."""
        assert media_kind_from_mime("audio/ogg") == "audio"

    def test_pdf_document(self):
        """Test PDF is document."""
        assert media_kind_from_mime("application/pdf") == "document"

    def test_unknown_document(self):
        """Test unknown type is document."""
        assert media_kind_from_mime("application/unknown") == "document"

    def test_none_mime(self):
        """Test None MIME type."""
        assert media_kind_from_mime(None) == "document"

    def test_case_insensitive(self):
        """Test case insensitivity."""
        assert media_kind_from_mime("IMAGE/JPEG") == "photo"


class TestIsGifMedia:
    """Tests for is_gif_media."""

    def test_gif_mime(self):
        """Test GIF MIME type."""
        assert is_gif_media("image/gif") is True

    def test_gif_filename(self):
        """Test GIF filename."""
        assert is_gif_media(None, "animation.gif") is True

    def test_gif_filename_uppercase(self):
        """Test GIF filename uppercase."""
        assert is_gif_media(None, "ANIMATION.GIF") is True

    def test_not_gif_mime(self):
        """Test non-GIF MIME type."""
        assert is_gif_media("image/jpeg") is False

    def test_not_gif_filename(self):
        """Test non-GIF filename."""
        assert is_gif_media(None, "image.jpg") is False

    def test_both_none(self):
        """Test both None."""
        assert is_gif_media(None, None) is False

    def test_gif_mime_overrides_filename(self):
        """Test GIF MIME overrides filename."""
        assert is_gif_media("image/gif", "image.jpg") is True
