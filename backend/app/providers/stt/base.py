from abc import ABC, abstractmethod

class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        """Transcribe audio bytes to text."""
        ...
