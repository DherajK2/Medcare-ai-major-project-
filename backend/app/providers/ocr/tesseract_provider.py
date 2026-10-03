from .base import OCRProvider
from app.utils.logger import get_logger
from app.services.gemini_service import GeminiService

logger = get_logger(__name__)

class GeminiVisionOCRProvider(OCRProvider):
    def __init__(self):
        self._gemini = GeminiService()

    async def extract_text(self, image_bytes: bytes) -> str:
        try:
            data = await self._gemini.extract_clinical_document_from_media(image_bytes, mime_type="image/jpeg")
            summary = data.get("summary", "")
            diagnosis = data.get("diagnosis", "")
            patient = data.get("patient_name", "")
            doctor = data.get("doctor_name", "")
            return f"Patient: {patient}\nDoctor: {doctor}\nDiagnosis: {diagnosis}\nSummary: {summary}"
        except Exception as e:
            logger.error("Vision OCR extraction failed", error=str(e))
            return ""

# Backward compatibility alias
TesseractOCRProvider = GeminiVisionOCRProvider
