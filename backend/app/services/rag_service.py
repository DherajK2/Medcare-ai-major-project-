from uuid import UUID
from app.core.permissions import verify_patient_access
from app.providers.embeddings.base import EmbeddingProvider
from app.services.gemini_service import GeminiService
from app.utils.logger import get_logger

logger = get_logger(__name__)

RAG_PROMPT = """You are a medical AI assistant. Answer using ONLY the medical records below.
If the information is not in the records, say: "I couldn't find that information in the available medical records."
Never invent medical values, diagnoses, medications, or dates.
Cite which document your answer comes from.

Medical Records:
{context}

Question: {question}

Answer:"""

class RAGService:
    def __init__(self, embedding_provider: EmbeddingProvider, gemini: GeminiService, pinecone_index=None):
        self.embedder = embedding_provider
        self.gemini = gemini
        self.index = pinecone_index

    async def query(
        self,
        question: str,
        patient_id: UUID,
        user_id: UUID,
        db,
        top_k: int = 5,
    ) -> dict:
        # CRITICAL: Authorization check BEFORE retrieval
        authorized = await verify_patient_access(user_id, patient_id, db)
        if not authorized:
            return {"answer": "Access denied to this patient's records.", "sources": [], "authorized": False}

        if not self.index:
            return {"answer": "Medical records search is not currently available.", "sources": [], "authorized": True}

        try:
            query_embeddings = await self.embedder.embed([question])
            results = self.index.query(
                vector=query_embeddings[0],
                top_k=top_k,
                filter={"patient_id": str(patient_id)},
                include_metadata=True
            )
        except Exception as e:
            logger.error("Pinecone query failed", error=str(e))
            return {"answer": "Unable to search medical records at this time.", "sources": [], "authorized": True}

        if not results.matches:
            return {
                "answer": "I couldn't find that information in the available medical records.",
                "sources": [],
                "authorized": True
            }

        context_parts = []
        sources = []
        for match in results.matches:
            meta = match.metadata or {}
            context_parts.append(
                f"[{meta.get('document_type', 'Document')} dated {meta.get('document_date', 'unknown')}]\n{meta.get('text', '')}"
            )
            sources.append({
                "document_id": meta.get("document_id"),
                "document_type": meta.get("document_type"),
                "document_date": meta.get("document_date"),
                "score": round(match.score, 3) if hasattr(match, 'score') else None
            })

        context = "\n\n".join(context_parts)
        try:
            answer = await self.gemini.generate(RAG_PROMPT.format(context=context, question=question))
        except Exception as e:
            logger.error("RAG answer generation failed", error=str(e))
            answer = "I was unable to generate a response at this time."

        return {"answer": answer, "sources": sources, "authorized": True}
