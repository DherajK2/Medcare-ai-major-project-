import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum, Text, BigInteger, Date, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
import enum
from .base import Base


class ProcessingStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    OCR_REQUIRED = "ocr_required"
    EXTRACTING = "extracting"
    STRUCTURED = "structured"
    INDEXING = "indexing"
    COMPLETED = "completed"
    FAILED = "failed"


class MedicalDocument(Base):
    __tablename__ = "medical_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)  # Supabase Storage path
    file_size_bytes = Column(BigInteger)
    mime_type = Column(String(100), nullable=False)
    document_type = Column(String(100))  # lab_report, prescription, doctor_note, etc.
    document_date = Column(Date)
    processing_status = Column(PG_ENUM('uploaded', 'processing', 'ocr_required', 'extracting', 'structured', 'indexing', 'completed', 'failed', name='processing_status', create_type=False, values_callable=lambda obj: [e.value if hasattr(e, 'value') else str(e) for e in obj]), default='uploaded')
    processing_error = Column(Text)
    extracted_text = Column(Text)
    extracted_data = Column(JSONB, default=dict)
    is_indexed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="medical_documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Text chunks extracted from documents for RAG indexing."""
    __tablename__ = "document_chunks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_id = Column(String(200))  # Pinecone vector ID
    chunk_metadata = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("MedicalDocument", back_populates="chunks")
