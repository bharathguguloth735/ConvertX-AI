"""
DocuFlow AI — Social Media Tools Unit & Integration Tests
"""
import pytest
from app.services.social.instagram_provider import InstagramProvider
from app.services.social.social_service import social_service


def test_instagram_provider_validate_url():
    provider = InstagramProvider()

    # Valid URLs
    valid, msg = provider.validate_url("https://www.instagram.com/p/C3x9L0P/ ")
    assert valid is True

    valid_reel, msg = provider.validate_url("https://www.instagram.com/reel/C3x9L0P/")
    assert valid_reel is True

    # Invalid URL
    invalid, msg = provider.validate_url("https://example.com/not-instagram")
    assert invalid is False
    assert msg == "This URL is not supported."

    # Private indicator URL
    private_url, msg = provider.validate_url("https://www.instagram.com/stories/secret_user/123456/")
    assert private_url is False
    assert msg == "This content is private and cannot be accessed."


@pytest.mark.asyncio
async def test_social_service_analyze_and_download():
    url = "https://www.instagram.com/reel/C8X9L0P1234/"

    # Test analyze
    metadata = await social_service.analyze_url(url)
    assert metadata.platform == "instagram"
    assert metadata.is_public is True
    assert len(metadata.options) > 0

    # Test download
    option_id = metadata.options[0].id
    content, filename, mime_type = await social_service.download_media(url, option_id)
    assert len(content) > 0
    assert filename.startswith("instagram_")
    assert mime_type in ["video/mp4", "image/jpeg", "audio/mpeg"]
