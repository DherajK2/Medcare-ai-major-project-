from .base import EmbeddingProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._genai = genai

    async def embed(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            try:
                result = self._genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                results.append(result["embedding"])
            except Exception as e:
                logger.error("Embedding failed", error=str(e))
                raise
        return results
