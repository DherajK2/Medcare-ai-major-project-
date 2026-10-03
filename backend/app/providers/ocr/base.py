from abc import ABC, abstractmethod

class OCRProvider(ABC):
    @abstractmethod
    async def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from image bytes. Never hallucinate text."""
        ...
