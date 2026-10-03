import io
from app.utils.logger import get_logger

logger = get_logger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}

class PDFService:
    @staticmethod
    def is_image_file(filename: str = "", mime_type: str = "") -> bool:
        """Check if file is an image based on extension or MIME type."""
        if mime_type and mime_type.startswith("image/"):
            return True
        if filename:
            filename_lower = filename.lower()
            return any(filename_lower.endswith(ext) for ext in IMAGE_EXTENSIONS)
        return False

    def extract_text(self, file_bytes: bytes, filename: str = "") -> str:
        """Extract text from digital PDF using pypdf or PyMuPDF."""
        if self.is_image_file(filename):
            # Images have no embedded digital text layer
            return ""

        # 1. Try PyMuPDF (fitz) if installed
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_parts = [page.get_text() for page in doc]
            doc.close()
            extracted = "\n".join(text_parts).strip()
            if len(extracted) > 20:
                return extracted
        except ImportError:
            pass
        except Exception as e:
            logger.warning("PyMuPDF extraction failed, trying pypdf", error=str(e))

        # 2. Try pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = [page.extract_text() or "" for page in reader.pages]
            extracted = "\n".join(text_parts).strip()
            if len(extracted) > 20:
                return extracted
        except Exception as e:
            logger.error("pypdf extraction failed", error=str(e))

        return ""

    def is_text_pdf(self, pdf_bytes: bytes) -> bool:
        """Determine if PDF has an extractable text layer or is a scanned image PDF."""
        try:
            text = self.extract_text(pdf_bytes)
            return len(text.strip()) > 50
        except Exception:
            return False
