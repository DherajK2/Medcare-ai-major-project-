from abc import ABC, abstractmethod

class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str) -> bytes:
        """Synthesize text to speech audio bytes."""
        ...
