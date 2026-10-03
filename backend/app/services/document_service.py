from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import MedicalDocument, ProcessingStatus
from app.services.pdf_service import PDFService
from app.services.extraction_service import ExtractionService
from app.services.embedding_service import EmbeddingService
from app.providers.ocr.base import OCRProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

class DocumentService:
    def __init__(self, db: AsyncSession, pdf_svc: PDFService, extraction_svc: ExtractionService,
                 embedding_svc: EmbeddingService, ocr_provider: OCRProvider):
        self.db = db
        self.pdf_svc = pdf_svc
        self.extraction_svc = extraction_svc
        self.embedding_svc = embedding_svc
        self.ocr_provider = ocr_provider

    async def process_document(self, document_id: UUID):
        """Full document processing pipeline with state tracking."""
        doc = await self.db.get(MedicalDocument, document_id)
        if not doc:
            return

        try:
            await self._update_status(doc, ProcessingStatus.PROCESSING)

            # Get file from storage
            file_bytes = await self._download_from_storage(doc.file_path)

            # Extract text
            if doc.mime_type == "application/pdf":
                text = self.pdf_svc.extract_text(file_bytes)
                if not text.strip():
                    await self._update_status(doc, ProcessingStatus.OCR_REQUIRED)
                    text = await self.ocr_provider.extract_text(file_bytes)
            else:
                await self._update_status(doc, ProcessingStatus.OCR_REQUIRED)
                text = await self.ocr_provider.extract_text(file_bytes)

            doc.extracted_text = text[:50000]  # Limit stored text
            await self._update_status(doc, ProcessingStatus.EXTRACTING)

            # Extract structured data
            extracted = await self.extraction_svc.extract_medical_data(text)
            doc.extracted_data = extracted
            if extracted.get("document_type"):
                doc.document_type = extracted["document_type"]
            await self._update_status(doc, ProcessingStatus.STRUCTURED)

            # Index embeddings
            await self._update_status(doc, ProcessingStatus.INDEXING)
            metadata = {
                "document_type": doc.document_type or "unknown",
                "document_date": str(doc.document_date) if doc.document_date else "unknown",
                "patient_id": str(doc.patient_id),
                "document_id": str(doc.id),
            }
            chunk_count = await self.embedding_svc.index_document(doc.id, doc.patient_id, text, metadata)
            doc.is_indexed = chunk_count > 0
            await self._update_status(doc, ProcessingStatus.COMPLETED)
            logger.info(f"Document {document_id} processed: {chunk_count} chunks indexed")

        except Exception as e:
            logger.error(f"Document processing failed for {document_id}", error=str(e))
            doc.processing_error = str(e)[:500]
            await self._update_status(doc, ProcessingStatus.FAILED)

    async def _update_status(self, doc: MedicalDocument, status: ProcessingStatus):
        doc.processing_status = status
        await self.db.commit()

    async def _download_from_storage(self, file_path: str) -> bytes:
        """Download file from Supabase Storage."""
        from app.core.dependencies import get_supabase
        from app.core.config import settings
        try:
            supabase = get_supabase()
            response = supabase.storage.from_(settings.STORAGE_BUCKET).download(file_path)
            return response
        except Exception as e:
            logger.error("Storage download failed", path=file_path, error=str(e))
            raise

    async def get_patient_documents(self, patient_id: UUID) -> list[MedicalDocument]:
        result = await self.db.execute(
            select(MedicalDocument).where(MedicalDocument.patient_id == patient_id)
        )
        return list(result.scalars().all())
