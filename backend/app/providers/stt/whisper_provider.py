from .base import STTProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

class WhisperProvider(STTProvider):
    def __init__(self, model_size: str = "base"):
        self._model = None
        self._model_size = model_size

    def _get_model(self):
        if self._model is None:
            try:
                import whisper
                self._model = whisper.load_model(self._model_size)
            except ImportError:
                logger.warning("openai-whisper not installed")
        return self._model

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        import tempfile, os
        model = self._get_model()
        if not model:
            return ""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            result = model.transcribe(tmp_path, language=language)
            return result.get("text", "")
        finally:
            os.unlink(tmp_path)
