from datetime import datetime
from uuid import UUID
import hashlib

def generate_chunk_id(document_id: UUID, chunk_index: int) -> str:
    return hashlib.md5(f"{document_id}-{chunk_index}".encode()).hexdigest()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks for RAG indexing."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks

def sanitize_for_log(data: dict) -> dict:
    """Remove sensitive medical fields before logging."""
    sensitive_keys = {'medical_notes', 'extracted_text', 'extracted_data', 'content', 'medications', 'diagnoses'}
    return {k: '[REDACTED]' if k in sensitive_keys else v for k, v in data.items()}
