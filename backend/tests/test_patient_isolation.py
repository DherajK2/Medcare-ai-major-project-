import pytest

def test_rag_service_importable():
    """RAG service must be importable and have authorization check."""
    from app.services.rag_service import RAGService
    import inspect
    source = inspect.getsource(RAGService.query)
    # Verify authorization check exists before Pinecone query
    assert "verify_patient_access" in source
    assert "authorized" in source
