from .base import OCRProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

class PaddleOCRProvider(OCRProvider):
    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            from paddleocr import PaddleOCR
            self._ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        return self._ocr

    async def extract_text(self, image_bytes: bytes) -> str:
        try:
            import numpy as np
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(image_bytes))
            img_array = np.array(image)
            result = self._get_ocr().ocr(img_array, cls=True)
            lines = []
            if result:
                for line in result:
                    if line:
                        for item in line:
                            if item and len(item) > 1:
                                lines.append(item[1][0])
            return "\n".join(lines)
        except Exception as e:
            logger.error("PaddleOCR failed", error=str(e))
            raise
