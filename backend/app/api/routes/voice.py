import base64
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_current_active_user
from app.services.sarvam_service import SarvamService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en-IN"
    language_code: Optional[str] = None
    speaker: Optional[str] = "meera"

EMOJI_PATTERN = re.compile(
    r'[\U00010000-\U0010ffff\u2600-\u27bf\ufe0f\u200d\u20e3\u2300-\u23ff\u2b50\u2b55\u2934\u2935\u25aa-\u25fe\u00a9\u00ae]',
    flags=re.UNICODE
)

def clean_text_for_speech(text: str) -> str:
    """Strip raw markdown, bullets, emojis, and symbols for fluid spoken speech."""
    # 1. Remove emojis and pictorial symbols
    cleaned = EMOJI_PATTERN.sub('', text)
    # 2. Remove markdown formatting symbols
    cleaned = re.sub(r'[*_#`~]', '', cleaned)
    # 3. Replace bullet characters with pauses
    cleaned = re.sub(r'^[•\-\*]\s*', '', cleaned, flags=re.MULTILINE)
    # 4. Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

EDGE_VOICES = {
    "en-IN": "en-IN-NeerjaNeural",
    "en": "en-IN-NeerjaNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "kn": "kn-IN-SapnaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "hi": "hi-IN-SwaraNeural",
}

@router.post("/tts")
async def generate_speech(request: TTSRequest, current_user=Depends(get_current_active_user)):
    lang = (request.language_code or request.language or "en-IN").strip()
    clean_text = clean_text_for_speech(request.text)[:600]
    
    # 1. Try High-Fidelity Edge Neural Voice (100% Free, Studio Quality)
    try:
        import edge_tts
        voice_name = EDGE_VOICES.get(lang, "en-IN-NeerjaNeural")
        communicate = edge_tts.Communicate(clean_text, voice_name)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        
        if chunks:
            audio_bytes = b"".join(chunks)
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            return {
                "audio_base64": audio_base64,
                "audio_url": f"data:audio/mp3;base64,{audio_base64}",
                "engine": "edge_neural",
                "voice": voice_name
            }
    except Exception as e:
        logger.warning(f"Edge TTS synthesis error, falling back to Sarvam: {e}")

    # 2. Fallback to Sarvam AI if configured
    try:
        sarvam = SarvamService()
        res = await sarvam.text_to_speech(
            text=clean_text,
            target_language_code=lang,
            speaker=request.speaker or "meera"
        )
        if res.get("audio_base64") and not res.get("audio_url"):
            res["audio_url"] = f"data:audio/wav;base64,{res['audio_base64']}"
        return res
    except Exception as e:
        logger.error(f"Sarvam TTS failed: {e}")
        return {"error": "TTS synthesis unavailable", "audio_url": None}

@router.post("/stt")
async def transcribe_speech(
    file: UploadFile = File(...),
    language: Optional[str] = Form("unknown"),
    current_user=Depends(get_current_active_user)
):
    sarvam = SarvamService()
    file_bytes = await file.read()
    res = await sarvam.speech_to_text(file_bytes, language_code=language or "unknown")
    return res
