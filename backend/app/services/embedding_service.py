from uuid import UUID
from app.providers.embeddings.base import EmbeddingProvider
from app.utils.helpers import chunk_text, generate_chunk_id
from app.utils.logger import get_logger

logger = get_logger(__name__)

class EmbeddingService:
    def __init__(self, provider: EmbeddingProvider, pinecone_index=None):
        self.provider = provider
        self.index = pinecone_index

    async def index_document(
        self,
        document_id: UUID,
        patient_id: UUID,
        text: str,
        metadata: dict,
    ) -> int:
        """Chunk text, embed, and upsert to Pinecone. Returns chunk count."""
        chunks = chunk_text(text, chunk_size=1000, overlap=200)
        if not chunks:
            return 0

        vectors = []
        for i, chunk in enumerate(chunks):
            try:
                embeddings = await self.provider.embed([chunk])
                vector_id = generate_chunk_id(document_id, i)
                chunk_metadata = {
                    **metadata,
                    "patient_id": str(patient_id),
                    "document_id": str(document_id),
                    "chunk_index": i,
                    "text": chunk[:1000],  # Store text in metadata for retrieval
                }
                vectors.append({
                    "id": vector_id,
                    "values": embeddings[0],
                    "metadata": chunk_metadata,
                })
            except Exception as e:
                logger.error(f"Embedding chunk {i} failed", error=str(e))
                continue

        if vectors and self.index:
            self.index.upsert(vectors=vectors)
            logger.info(f"Indexed {len(vectors)} chunks for document {document_id}")
        elif vectors:
            logger.warning("Pinecone index not configured - embeddings not stored")

        return len(vectors)
