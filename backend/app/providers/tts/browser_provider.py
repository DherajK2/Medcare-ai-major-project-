from .base import TTSProvider

class BrowserTTSProvider(TTSProvider):
    """Stub - TTS is handled client-side via Web Speech API."""
    async def synthesize(self, text: str) -> bytes:
        # Returns empty bytes - actual TTS is in browser
        return b""
