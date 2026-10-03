from app.providers.stt.base import STTProvider
from app.providers.tts.base import TTSProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

class VoiceService:
    def __init__(self, stt_provider: STTProvider, tts_provider: TTSProvider):
        self.stt = stt_provider
        self.tts = tts_provider

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        return await self.stt.transcribe(audio_bytes, language)

    async def synthesize(self, text: str) -> bytes:
        return await self.tts.synthesize(text)
