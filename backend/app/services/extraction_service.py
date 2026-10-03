import json
from app.services.gemini_service import GeminiService
from app.utils.logger import get_logger

logger = get_logger(__name__)

EXTRACTION_PROMPT = """
Extract structured medical information from this document. Return ONLY data explicitly present in the text.
Never infer, estimate, or fabricate values. Return null for missing fields.

Return JSON with these fields:
{
  "blood_pressure_systolic": number|null,
  "blood_pressure_diastolic": number|null,
  "blood_glucose": number|null,
  "hba1c": number|null,
  "hemoglobin": number|null,
  "cholesterol_total": number|null,
  "heart_rate": number|null,
  "weight": number|null,
  "temperature": number|null,
  "oxygen_saturation": number|null,
  "medications": [{"name": string, "dosage": string, "frequency": string}],
  "diagnoses": [string],
  "doctor_name": string|null,
  "doctor_recommendations": [string],
  "test_date": "YYYY-MM-DD"|null,
  "document_type": "lab_report"|"prescription"|"doctor_note"|"discharge_summary"|"imaging"|"other"
}

Document:
{text}

Return ONLY valid JSON.
"""

PLAUSIBLE_RANGES = {
    "blood_pressure_systolic": (50, 250),
    "blood_pressure_diastolic": (30, 180),
    "blood_glucose": (20, 800),
    "hba1c": (2.0, 20.0),
    "heart_rate": (20, 300),
    "temperature": (30.0, 45.0),
    "hemoglobin": (1.0, 25.0),
    "cholesterol_total": (50, 500),
    "oxygen_saturation": (50, 100),
    "weight": (1, 500),
}

class ExtractionService:
    def __init__(self, gemini: GeminiService):
        self.gemini = gemini

    async def extract_medical_data(self, text: str) -> dict:
        try:
            raw = await self.gemini.generate(EXTRACTION_PROMPT.format(text=text[:8000]))
            raw = raw.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
                raw = raw.rsplit("```", 1)[0]
            data = json.loads(raw)
            return self._validate_values(data)
        except json.JSONDecodeError as e:
            logger.error("Extraction JSON parse failed", error=str(e))
            return {"extraction_error": str(e)}
        except Exception as e:
            logger.error("Extraction failed", error=str(e))
            return {"extraction_error": str(e)}

    def _validate_values(self, data: dict) -> dict:
        """Post-validate extracted values - never trust LLM alone for numerical health data."""
        for field, (min_val, max_val) in PLAUSIBLE_RANGES.items():
            val = data.get(field)
            if val is not None:
                try:
                    if not (min_val <= float(val) <= max_val):
                        logger.warning(f"Implausible value for {field}: {val} - rejected")
                        data[field] = None
                except (TypeError, ValueError):
                    data[field] = None
        return data
