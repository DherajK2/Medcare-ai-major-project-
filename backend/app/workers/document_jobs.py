from app.utils.logger import get_logger

logger = get_logger(__name__)

async def retry_failed_documents():
    """Retry document processing for documents in FAILED state."""
    logger.info("Retrying failed document processing")
    pass
