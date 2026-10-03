"""
AI Service — Groq (primary) with Gemini fallback.

Uses Groq's llama-3.3-70b-versatile model for all AI tasks:
- Chat / medical Q&A
- Intent classification
- Clinical document extraction (structured JSON from medical reports)

Falls back to Gemini if Groq is unavailable and GEMINI_API_KEY is valid.
"""

import asyncio
import json
import re
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Model selection ──────────────────────────────────────────────────────────
GROQ_MODEL        = "llama-3.3-70b-versatile"
GROQ_MODEL_FAST   = "llama-3.1-8b-instant"
GEMINI_MODEL      = "gemini-flash-latest"
GEMINI_FALLBACKS  = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-pro-latest",
]


class GeminiService:
    """
    Named GeminiService for backwards compatibility.
    Powered by OpenRouter, Groq, and Gemini Multimodal Vision.
    """

    def __init__(self):
        self._groq_client = None
        self._gemini_model = None
        self._gemini_pro_model = None
        self._init_groq()
        self._init_gemini()

    def _init_groq(self):
        try:
            if getattr(settings, "GROQ_API_KEY", None):
                from groq import Groq
                self._groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq AI initialized (llama-3.3-70b-versatile)")
        except Exception as e:
            logger.warning(f"Groq init failed: {e}")

    def _init_gemini(self):
        try:
            key = getattr(settings, "GEMINI_API_KEY", "")
            if key and key != "test" and len(key) > 8:
                import google.generativeai as genai
                genai.configure(api_key=key)
                self._gemini_model     = genai.GenerativeModel("gemini-flash-latest")
                self._gemini_pro_model = genai.GenerativeModel("gemini-pro-latest")
                logger.info("Gemini AI initialized (Multimodal Vision ready)")
        except Exception as e:
            logger.warning(f"Gemini init warning: {e}")

    # ── Core generate ────────────────────────────────────────────────────────

    async def generate(self, prompt: str, use_pro: bool = False) -> str:
        """Generate text. Tries OpenRouter, Groq, then Gemini SDK/REST."""
        import httpx

        # 1. OpenRouter (Llama-3.3 70B / GPT-4o-mini / Gemini 2.5 Flash)
        openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "")
        if openrouter_key and openrouter_key.startswith("sk-or-"):
            or_models = ["meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o-mini", "google/gemini-2.5-flash"]
            for or_m in or_models:
                try:
                    async with httpx.AsyncClient(timeout=12.0) as client:
                        res = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {openrouter_key}",
                                "HTTP-Referer": "https://medical-ai.local",
                                "X-Title": "Medical AI Platform",
                            },
                            json={
                                "model": or_m,
                                "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.3,
                                "max_tokens": 2048,
                            }
                        )
                        if res.status_code == 200:
                            data = res.json()
                            return data["choices"][0]["message"]["content"]
                except Exception as e:
                    logger.debug(f"OpenRouter generation ({or_m}) error: {e}")

        # 2. Groq (if GROQ_API_KEY configured)
        if self._groq_client:
            try:
                loop = asyncio.get_running_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: self._groq_client.chat.completions.create(
                            model=GROQ_MODEL,
                            messages=[{"role": "user", "content": prompt}],
                            temperature=0.3,
                            max_tokens=2048,
                        )
                    ),
                    timeout=5.0
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq generation error: {e}")

        # 3. Gemini GenerativeModel SDK (native) with multi-model fallback
        key = getattr(settings, "GEMINI_API_KEY", "")
        if key and key != "test" and key.startswith("AIza") and len(key) > 20:
            try:
                import google.generativeai as genai
                loop = asyncio.get_running_loop()
                candidate_models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"]
                for m_name in candidate_models:
                    try:
                        m_instance = genai.GenerativeModel(m_name)
                        response = await asyncio.wait_for(
                            loop.run_in_executor(None, lambda: m_instance.generate_content(prompt)),
                            timeout=2.5
                        )
                        if response and response.text:
                            return response.text
                    except Exception as m_err:
                        logger.debug(f"Model {m_name} failed: {m_err}")
            except Exception as e:
                logger.warning(f"Gemini SDK generation error: {e}")

        # 4. Gemini REST direct API fallback
        if key and key != "test" and key.startswith("AIza") and len(key) > 20:
            models_to_try = ["gemini-flash-latest", "gemini-flash-lite-latest"]
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
                    async with httpx.AsyncClient(timeout=2.5) as client:
                        res = await client.post(
                            url,
                            json={"contents": [{"parts": [{"text": prompt}]}]}
                        )
                        if res.status_code == 200:
                            data = res.json()
                            candidates = data.get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                text = candidates[0]["content"]["parts"][0].get("text", "")
                                if text:
                                    return text
                except Exception as e:
                    logger.debug(f"Gemini {model_name} REST attempt failed: {e}")

        # 5. Sarvam AI Chat Completion LLM (sarvam-105b / sarvam-m)
        sarvam_key = getattr(settings, "SARVAM_API_KEY", "")
        if sarvam_key and len(sarvam_key.strip()) > 10:
            sarvam_models = ["sarvam-105b", "sarvam-m"]
            for s_model in sarvam_models:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        res = await client.post(
                            "https://api.sarvam.ai/v1/chat/completions",
                            headers={
                                "api-subscription-key": sarvam_key.strip(),
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": s_model,
                                "messages": [
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.3,
                                "max_tokens": 2048
                            }
                        )
                        if res.status_code == 200:
                            s_data = res.json()
                            choices = s_data.get("choices", [])
                            if choices:
                                content = choices[0].get("message", {}).get("content", "")
                                if content and len(content.strip()) > 5:
                                    return content.strip()
                except Exception as s_err:
                    logger.debug(f"Sarvam LLM ({s_model}) attempt failed: {s_err}")

        raise RuntimeError("All AI providers failed or are not configured.")

    # ── Intent classification ────────────────────────────────────────────────

    async def classify_intent(self, message: str) -> str:
        prompt = (
            "Classify this patient/caregiver message into ONE category:\n"
            "health_query, medication_query, map_request, alert_query, "
            "safety_concern, appointment_query, general_chat\n\n"
            f"Message: {message}\n\n"
            "Respond with ONLY the category name, lowercase, no explanation."
        )
        try:
            raw = await self.generate(prompt)
            intent = raw.strip().lower().split()[0]
            valid = ["health_query", "medication_query", "map_request",
                     "alert_query", "safety_concern", "appointment_query", "general_chat"]
            return intent if intent in valid else "health_query"
        except Exception:
            return "health_query"

    # ── Multimodal Vision extraction (Images & Scanned PDFs) ──────────────────

    async def extract_clinical_document_from_media(self, file_bytes: bytes, mime_type: str = "image/jpeg", document_type: str = "discharge_summary") -> dict:
        """Extract structured medical data directly from image/PDF bytes using Gemini Vision."""
        import base64
        import httpx

        key = getattr(settings, "GEMINI_API_KEY", "")
        if not key or key == "test" or len(key) < 8:
            logger.warning("Gemini API key not configured for vision extraction")
            return self._regex_fallback("")

        # Normalize mime type for common images
        if not mime_type or mime_type == "application/octet-stream":
            mime_type = "image/jpeg"

        prompt = f"""You are an expert clinical medical document and prescription analyzer specialized in Indian doctor prescriptions and multilingual medical records (English, Kannada ಕನ್ನಡ, Hindi हिन्दी).
Extract all structured medical data from this document into clean JSON:

CRITICAL CLINICAL EXTRACTION GUIDELINES:
1. Patient Details: Full name (e.g. Mr. Kodandarama), age (integer or null, e.g. 52), gender (male/female/other/null), phone number (e.g. 9448511066 or null), address (or null).
2. Doctor & Hospital: Full doctor name with qualifications (e.g. Dr. Raghu M.S., MD, DM Endocrinology), doctor specialty, hospital/clinic/lab name (e.g. Dr. Raghu's Diabetes & Hormone Care), doctor phone, and hospital address.
3. Diagnoses: Detailed final or provisional diagnosis (e.g. TYPE 2 DM, UNCONTROLLED DM), symptoms, and clinical findings.
4. Summary: Comprehensive clinical summary covering all findings, diagnosis, Kannada/Hindi/English dietary advice (e.g. ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ಊಟ, ಕಡಿಮೆ ತಿನ್ನಬೇಕು), tests prescribed (e.g. FBS, PPBS, TSH), and next visit date.
5. Medications: Extract every prescribed medicine accurately:
   - Full drug name (e.g. TAB. GLIMIPRIME M1 TAB / GLYCOMET GP1 TAB, TAB. GLIPCRIN MP-500 TAB, TAB. NEUROSIRI LC TAB)
   - Composition/Salt (e.g. Glimepiride 1mg + Metformin 500mg, Sitagliptin 100mg + Pioglitazone 15mg + Metformin 500mg SR, Folic Acid + Levo-Carnitine + Mecobalamin)
   - Dosage (e.g. 1-0-0, 0-0-1, 1-0-1, 500mg, 1 tablet)
   - Frequency & Timing: Clearly state schedule in English & Kannada/Hindi (e.g. "Morning before breakfast (1-0-0 / ಆಹಾರದ ಮೊದಲು - ತಿಂಡಿಯ ಮುನ್ನ)", "Night after dinner (0-0-1 / ಆಹಾರದ ನಂತರ - ರಾತ್ರಿ ಊಟದ ನಂತರ)")
   - Route: "oral", "intravenous", "topical", "subcutaneous"
   - Duration: (e.g. "10 days", "10 ದಿನಗಳು", "1 month")
   - Instructions: Food timing & specific doctor advice (e.g. "Take before breakfast. Check blood sugar if feeling fatigued / ಶುಗರ್ ಚೆಕ್ ಮಾಡಿ")
6. Vitals & Metrics: Extract all vital signs and numerical measurements:
   - blood_pressure_systolic (e.g. 122), blood_pressure_diastolic (e.g. 78), blood_glucose, heart_rate, temperature, oxygen_saturation, hemoglobin, hba1c, weight (e.g. 56), height (e.g. 156), bmi (e.g. 22.43).
7. Lab Results & Tests Prescribed: List of prescribed tests (FBS, PPBS, TSH) and result values if available.

Return ONLY a valid JSON object matching this schema (no markdown formatting, no code fences):
{{
  "patient_name": "Full name or null",
  "patient_phone": "Phone number or null",
  "age": null,
  "gender": "male|female|other|null",
  "address": "Address or null",
  "doctor_name": "Dr. Name or null",
  "doctor_phone": "Doctor phone or null",
  "doctor_specialty": "Specialty or null",
  "hospital_name": "Hospital/Clinic name or null",
  "hospital_address": "Hospital address or null",
  "diagnosis": "Clinical diagnosis",
  "summary": "Clinical summary",
  "medications": [
    {{
      "name": "Drug name",
      "dosage": "Dosage (e.g. 1-0-0)",
      "frequency": "Frequency (e.g. Morning before breakfast / ತಿಂಡಿಯ ಮುನ್ನ)",
      "route": "oral",
      "duration": "10 days",
      "instructions": "Instructions & food timing"
    }}
  ],
  "vitals": [
    {{
      "metric_type": "blood_pressure_systolic|blood_pressure_diastolic|blood_glucose|heart_rate|temperature|oxygen_saturation|hemoglobin|hba1c|cholesterol_total|weight",
      "value": 120.0,
      "unit": "mmHg"
    }}
  ],
  "lab_results": [
    {{
      "name": "Test name (e.g. Serum Creatinine, FBS, PPBS, TSH)",
      "value": "Value",
      "unit": "Unit",
      "reference_range": "Range",
      "status": "normal|high|low|critical"
    }}
  ]
}}"""

        img_b64 = base64.b64encode(file_bytes).decode("utf-8")
        payload = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": mime_type, "data": img_b64}},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 4096
            }
        }

        # Try Gemini Vision models in order of active quota and speed
        models_to_try = [
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-pro-latest"
        ]
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                raw_text = parts[0].get("text", "")
                                parsed = self._parse_json_safe(raw_text)
                                if isinstance(parsed, dict):
                                    normalized = self._normalize_extracted_data(parsed)
                                    logger.info(f"Gemini Vision extraction succeeded ({model_name}) — meds={len(normalized.get('medications', []))}, vitals={len(normalized.get('vitals', []))}")
                                    return normalized
                    else:
                        logger.warning(f"Gemini Vision {model_name} HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                logger.warning(f"Gemini Vision {model_name} failed: {e}")

        # 2. Try OpenRouter Vision (GPT-4o-mini / Gemini 2.5 Flash)
        openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "")
        if openrouter_key and openrouter_key.startswith("sk-or-"):
            or_models = ["openai/gpt-4o-mini", "google/gemini-2.5-flash"]
            for or_m in or_models:
                try:
                    or_payload = {
                        "model": or_m,
                        "max_tokens": 4096,
                        "temperature": 0.1,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{img_b64}"}}
                                ]
                            }
                        ]
                    }
                    async with httpx.AsyncClient(timeout=45.0) as client:
                        resp = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {openrouter_key}",
                                "HTTP-Referer": "https://medical-ai.local",
                                "X-Title": "Medical AI Platform",
                            },
                            json=or_payload
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_text = data["choices"][0]["message"]["content"]
                            parsed = self._parse_json_safe(raw_text)
                            if isinstance(parsed, dict) and (parsed.get("lab_results") or parsed.get("diagnosis") or parsed.get("patient_name")):
                                normalized = self._normalize_extracted_data(parsed)
                                logger.info(f"OpenRouter Vision extraction succeeded ({or_m}) — meds={len(normalized.get('medications', []))}, vitals={len(normalized.get('vitals', []))}")
                                return normalized
                        else:
                            logger.warning(f"OpenRouter Vision {or_m} HTTP {resp.status_code}: {resp.text[:200]}")
                except Exception as e:
                    logger.warning(f"OpenRouter Vision {or_m} error: {e}")

        logger.error("All Vision models failed — falling back to regex")
        return self._regex_fallback("")

    @staticmethod
    def _parse_json_safe(raw_text: str) -> dict:
        """Safely parse JSON from LLM output, extracting code fences or bracketed objects."""
        if not raw_text:
            return {}
        raw_text = raw_text.strip()
        # 1. Look for ```json ... ``` code fence
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
        if fence_match:
            try:
                return json.loads(fence_match.group(1))
            except Exception:
                pass

        # 2. Look for first { to last }
        brace_match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(1))
            except Exception:
                pass

        # 3. Direct JSON parse
        try:
            return json.loads(raw_text)
        except Exception:
            return {}

    def _normalize_extracted_data(self, data: dict) -> dict:
        """Normalize metric types, extract numerical vitals from lab results, and ensure clean structure."""
        METRIC_MAP = {
            "systolic blood pressure": "blood_pressure_systolic",
            "diastolic blood pressure": "blood_pressure_diastolic",
            "blood pressure systolic": "blood_pressure_systolic",
            "blood pressure diastolic": "blood_pressure_diastolic",
            "bp systolic": "blood_pressure_systolic",
            "bp diastolic": "blood_pressure_diastolic",
            "systolic": "blood_pressure_systolic",
            "diastolic": "blood_pressure_diastolic",
            "blood glucose": "blood_glucose",
            "random blood sugar": "blood_glucose",
            "fasting blood sugar": "blood_glucose",
            "post prandial blood sugar": "blood_glucose",
            "blood sugar": "blood_glucose",
            "rbs": "blood_glucose",
            "fbs": "blood_glucose",
            "glucose": "blood_glucose",
            "heart rate": "heart_rate",
            "pulse": "heart_rate",
            "pulse rate": "heart_rate",
            "temperature": "temperature",
            "oxygen saturation": "oxygen_saturation",
            "spo2": "oxygen_saturation",
            "hemoglobin": "hemoglobin",
            "haemoglobin": "hemoglobin",
            "hb": "hemoglobin",
            "hba1c": "hba1c",
            "cholesterol total": "cholesterol_total",
            "total cholesterol": "cholesterol_total",
            "weight": "weight",
        }

        VALID_ENUM_METRICS = {
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "blood_glucose",
            "hba1c",
            "hemoglobin",
            "cholesterol_total",
            "heart_rate",
            "weight",
            "temperature",
            "oxygen_saturation",
            "other"
        }

        vitals = data.get("vitals", [])
        normalized_vitals = []
        existing_types = set()

        # 1. Normalize existing vitals
        for v in vitals:
            m_type = str(v.get("metric_type", "")).strip().lower()
            std_type = METRIC_MAP.get(m_type, m_type.replace(" ", "_"))
            if std_type not in VALID_ENUM_METRICS:
                continue
            val = v.get("value")
            try:
                val_float = float(val)
                normalized_vitals.append({
                    "metric_type": std_type,
                    "value": val_float,
                    "unit": v.get("unit", "")
                })
                existing_types.add(std_type)
            except (TypeError, ValueError):
                continue

        # 2. Extract key lab results into vitals if not already present
        lab_results = data.get("lab_results", [])
        for lr in lab_results:
            name = str(lr.get("name", "")).strip().lower()
            matched_metric = None
            for k, std_val in METRIC_MAP.items():
                if k in name and std_val in VALID_ENUM_METRICS:
                    matched_metric = std_val
                    break

            if matched_metric and matched_metric not in existing_types:
                val_str = str(lr.get("value", "")).replace(",", "").strip()
                match = re.search(r"[-+]?\d*\.?\d+", val_str)
                if match:
                    try:
                        val_float = float(match.group(0))
                        normalized_vitals.append({
                            "metric_type": matched_metric,
                            "value": val_float,
                            "unit": lr.get("unit", "")
                        })
                        existing_types.add(matched_metric)
                    except (TypeError, ValueError):
                        pass

        data["vitals"] = normalized_vitals
        return data

    # ── Clinical document extraction from text ───────────────────────────────

    async def extract_clinical_document(self, text: str, document_type: str = "discharge_summary") -> dict:
        """Extract structured patient/medication/vitals data from medical document text."""

        prompt = f"""You are an expert clinical document analyzer specializing in Indian medical prescriptions and reports (English, Hindi, Kannada, Tamil, Telugu).

CRITICAL EXTRACTION RULES:
1. Extract ALL medications with their complete details (name, dosage, frequency, timing)
2. Extract ALL diagnoses and conditions mentioned
3. Extract doctor's full name, specialty, and hospital/clinic name
4. Extract patient demographics (name, age, gender, address if present)
5. Extract ALL vital signs and lab values with units
6. For Indian prescriptions, recognize:
   - TAB = Tablet, CAP = Capsule, SYP = Syrup, INJ = Injection
   - Common drug names: Metformin, Glimepiride, Glipizide, Insulin, Amlodipine, Atenolol, Aspirin, Atorvastatin, Pantoprazole, etc.
   - Timing: Morning/Afternoon/Night, Before/After meals, BD (twice daily), TDS (thrice daily), QID (four times), OD (once daily)
   - Medical terms: DM (Diabetes Mellitus), HTN (Hypertension), CAD (Coronary Artery Disease), etc.

DOCUMENT TEXT:
\"\"\"
{text[:8000]}
\"\"\"

Return ONLY a valid JSON object with this exact schema (no markdown, no explanation):
{{
  "patient_name": "Full name or null",
  "age": null or number,
  "gender": "male" or "female" or "other" or null,
  "address": "Complete address or null",
  "doctor_name": "Dr. Full Name with qualifications or null",
  "doctor_specialty": "Specialization or null",
  "hospital_name": "Hospital/Clinic name or null",
  "hospital_address": "Hospital address or null",
  "diagnosis": "Complete diagnosis with all conditions mentioned",
  "summary": "Comprehensive clinical summary covering all findings",
  "medications": [
    {{
      "name": "Complete drug name (generic + brand if available)",
      "dosage": "Exact dosage e.g. 500mg, 1mg, 10mg",
      "frequency": "Complete frequency with timing e.g. Twice daily after breakfast and dinner",
      "route": "oral" or "intravenous" or "topical" or "subcutaneous",
      "duration": "Duration if mentioned e.g. 30 days, 3 months",
      "instructions": "Complete instructions including food timing, precautions"
    }}
  ],
  "vitals": [
    {{
      "metric_type": "blood_pressure_systolic|blood_pressure_diastolic|blood_glucose|heart_rate|temperature|oxygen_saturation|hemoglobin|hba1c|cholesterol_total|cholesterol_ldl|cholesterol_hdl|triglycerides|weight|height|bmi|creatinine|urea|tsh|vitamin_d",
      "value": 120.0,
      "unit": "mmHg|mg/dL|bpm|°C|%|g/dL|kg|cm|U/mL|ng/mL"
    }}
  ],
  "lab_results": [
    {{
      "name": "Complete test name",
      "value": "Result value",
      "unit": "Unit",
      "reference_range": "Normal range e.g. 70-100",
      "status": "normal" or "high" or "low" or "critical"
    }}
  ]
}}

IMPORTANT: Extract EVERY medication, diagnosis, and vital sign present. Do not skip any information."""

        try:
            raw = await self.generate(prompt)
            # Strip markdown fences if present
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE).strip()
            data = json.loads(cleaned)
            if isinstance(data, dict):
                normalized = self._normalize_extracted_data(data)
                logger.info(f"AI document extraction succeeded — meds={len(normalized.get('medications', []))}, vitals={len(normalized.get('vitals', []))}")
                return normalized
        except Exception as e:
            logger.warning(f"AI document extraction fallback: {e}")

        # Fallback regex parser (unchanged from original)
        return self._regex_fallback(text)

    # ── Regex fallback ───────────────────────────────────────────────────────

    def _regex_fallback(self, text: str) -> dict:
        extracted: dict = {
            "patient_name": None, "age": None, "gender": None, "address": None,
            "doctor_name": None, "doctor_specialty": None,
            "hospital_name": None, "hospital_address": None,
            "diagnosis": "Clinical assessment completed.",
            "summary": "", "medications": [], "vitals": [], "lab_results": []
        }

        # Enhanced patient name patterns for Indian names
        for p_pat in [
            r"(?:Mr\.|Mrs\.|Ms\.|Miss)\s+([A-Za-z\s]{3,40})",
            r"(?:Name\s*:\s*|Patient:\s*|Patient Name:\s*|Name of Patient:\s*)([A-Za-z\s]{3,40})",
            r"(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+Age|\s+\d+|\s+yrs)",
        ]:
            m = re.search(p_pat, text, re.IGNORECASE | re.MULTILINE)
            if m:
                cand = re.sub(r"(?:Ref|Bill|UHID|Age|Sex|Male|Female|Ward|Bed|Date|Dr\.).*", "",
                              m.group(1).strip(), flags=re.IGNORECASE).strip()
                if cand and len(cand) > 3 and not any(k in cand.lower() for k in ["hospital", "medical", "apollo", "clinic", "doctor"]):
                    extracted["patient_name"] = cand
                    break

        # Age extraction
        age_match = re.search(r"(?:Age\s*:\s*|Age\s+)(\d{1,3})\s*(?:yrs|years|Y)?", text, re.IGNORECASE)
        if age_match:
            extracted["age"] = int(age_match.group(1))

        # Gender extraction
        if re.search(r"\b(?:Male|M)\b", text, re.IGNORECASE) and not re.search(r"\bFe?male\b", text, re.IGNORECASE):
            extracted["gender"] = "male"
        elif re.search(r"\b(?:Female|F)\b", text, re.IGNORECASE):
            extracted["gender"] = "female"

        # Enhanced doctor name patterns including Indian names
        for d_pat in [
            r"(Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+(?:\s*,?\s*(?:MD|MBBS|MS|DNB|DM|MCh|MRCP|FRCS))*)",
            r"Consultant:\s*(Dr\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+)",
            r"Physician:\s*(Dr\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+)",
        ]:
            m = re.search(d_pat, text, re.IGNORECASE)
            if m:
                extracted["doctor_name"] = m.group(1).strip()
                break

        # Hospital/Clinic name - enhanced patterns
        for line in text.split('\n')[:15]:  # Check first 15 lines
            line_clean = line.strip()
            if any(k in line_clean.lower() for k in ["hospital", "clinic", "medical center", "healthcare", "nursing home", "medical college"]):
                if not any(skip in line_clean.lower() for skip in ["admitted to", "discharged from", "visit"]):
                    extracted["hospital_name"] = line_clean[:100]
                    break

        # Diagnosis patterns - enhanced for Indian medical terminology
        for diag_pat in [
            r"(?:Diagnosis\s*:\s*|Provisional Diagnosis\s*:\s*|Final Diagnosis\s*:\s*)([^\n]{10,200})",
            r"(?:Condition\s*:\s*|Disease\s*:\s*)([^\n]{10,150})",
            r"\b(TYPE\s*\d+\s*DM|DIABETES\s+MELLITUS|HYPERTENSION|CORONARY\s+ARTERY\s+DISEASE|CAD|HTN)\b",
        ]:
            m = re.search(diag_pat, text, re.IGNORECASE)
            if m:
                diag_text = m.group(1).strip() if m.lastindex else m.group(0)
                if len(diag_text) > 5:
                    extracted["diagnosis"] = diag_text
                    break

        # Blood pressure extraction
        bp = re.search(r"(?:BP|Blood\s+Pressure|B\.P\.?)\s*:?\s*(\d{2,3})\s*[/\\-]\s*(\d{2,3})", text, re.IGNORECASE)
        if bp:
            extracted["vitals"] += [
                {"metric_type": "blood_pressure_systolic", "value": float(bp.group(1)), "unit": "mmHg"},
                {"metric_type": "blood_pressure_diastolic", "value": float(bp.group(2)), "unit": "mmHg"},
            ]

        # Enhanced vital signs patterns
        for pat, mtype, unit in [
            (r"(?:Blood\s+(?:Sugar|Glucose)|FBS|RBS|Fasting\s+Sugar|Random\s+Sugar|BS)\s*:?\s*(\d{2,3})", "blood_glucose", "mg/dL"),
            (r"(?:Heart\s+Rate|Pulse|HR|P\.R\.)\s*:?\s*(\d{2,3})", "heart_rate", "bpm"),
            (r"(?:SpO2|Oxygen\s+Saturation|O2\s+Sat)\s*:?\s*(\d{2,3})", "oxygen_saturation", "%"),
            (r"(?:Temp(?:erature)?|T)\s*:?\s*(\d{2,3}(?:\.\d+)?)", "temperature", "°F"),
            (r"(?:Hb|Hemoglobin|Haemoglobin)\s*:?\s*(\d{1,2}(?:\.\d+)?)", "hemoglobin", "g/dL"),
            (r"(?:HbA1c|HbA1C|Glycated\s+Hemoglobin)\s*:?\s*(\d{1,2}(?:\.\d+)?)", "hba1c", "%"),
            (r"(?:Weight|Wt\.?)\s*:?\s*(\d{2,3}(?:\.\d+)?)", "weight", "kg"),
        ]:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    value = float(m.group(1))
                    # Validate reasonable ranges to prevent OCR errors
                    if mtype == "temperature" and (value < 25 or value > 115):
                        continue  # Skip unrealistic temperature values
                    if mtype == "blood_glucose" and value > 600:
                        continue  # Skip unrealistic glucose values
                    if mtype == "heart_rate" and (value < 30 or value > 220):
                        continue  # Skip unrealistic heart rate
                    if mtype == "oxygen_saturation" and (value < 50 or value > 100):
                        continue  # Skip unrealistic SpO2
                    if mtype == "hemoglobin" and (value < 2 or value > 25):
                        continue  # Skip unrealistic hemoglobin
                    if mtype == "weight" and (value < 20 or value > 300):
                        continue  # Skip unrealistic weight
                    
                    extracted["vitals"].append({"metric_type": mtype, "value": value, "unit": unit})
                except ValueError:
                    pass

        # Enhanced medication extraction for Indian prescriptions
        INDIAN_DRUGS = {
            # Diabetes medications
            r'\b(TAB\\.?\\s+)?METFORMIN\b': ('Metformin', '500mg', 'oral', 'Twice daily with meals'),
            r'\b(TAB\\.?\\s+)?GLIMEPIRIDE\b': ('Glimepiride', '1mg', 'oral', 'Once daily before breakfast'),
            r'\b(TAB\\.?\\s+)?GLIPIZIDE\b': ('Glipizide', '5mg', 'oral', 'Twice daily before meals'),
            r'\b(TAB\\.?\\s+)?GLICLAZIDE\b': ('Gliclazide', '80mg', 'oral', 'Once daily before breakfast'),
            r'\bINSULIN\b': ('Insulin', '10 units', 'subcutaneous', 'As prescribed by doctor'),
            
            # Hypertension medications
            r'\b(TAB\\.?\\s+)?AMLODIPINE\b': ('Amlodipine', '5mg', 'oral', 'Once daily'),
            r'\b(TAB\\.?\\s+)?ATENOLOL\b': ('Atenolol', '50mg', 'oral', 'Once daily'),
            r'\b(TAB\\.?\\s+)?TELMISARTAN\b': ('Telmisartan', '40mg', 'oral', 'Once daily'),
            r'\b(TAB\\.?\\s+)?LOSARTAN\b': ('Losartan', '50mg', 'oral', 'Once daily'),
            
            # Cardiac medications
            r'\b(TAB\\.?\\s+)?ASPIRIN\b': ('Aspirin', '75mg', 'oral', 'Once daily after food'),
            r'\b(TAB\\.?\\s+)?ATORVASTATIN\b': ('Atorvastatin', '10mg', 'oral', 'Once daily at bedtime'),
            r'\b(TAB\\.?\\s+)?CLOPIDOGREL\b': ('Clopidogrel', '75mg', 'oral', 'Once daily'),
            
            # Gastric medications
            r'\b(TAB\\.?\\s+)?PANTOPRAZOLE\b': ('Pantoprazole', '40mg', 'oral', 'Once daily before breakfast'),
            r'\b(TAB\\.?\\s+)?OMEPRAZOLE\b': ('Omeprazole', '20mg', 'oral', 'Once daily before breakfast'),
            r'\b(TAB\\.?\\s+)?RANITIDINE\b': ('Ranitidine', '150mg', 'oral', 'Twice daily'),
            
            # Antibiotics
            r'\b(TAB\\.?\\s+)?AMOXICILLIN\b': ('Amoxicillin', '500mg', 'oral', 'Three times daily'),
            r'\b(TAB\\.?\\s+)?AZITHROMYCIN\b': ('Azithromycin', '500mg', 'oral', 'Once daily for 3 days'),
            r'\b(TAB\\.?\\s+)?CIPROFLOXACIN\b': ('Ciprofloxacin', '500mg', 'oral', 'Twice daily'),
            r'\b(INJ\\.?\\s+)?CEFTRIAXONE\b': ('Ceftriaxone', '1g', 'intravenous', 'Once daily IV'),
            
            # Common medications
            r'\b(TAB\\.?\\s+)?PARACETAMOL\b': ('Paracetamol', '650mg', 'oral', 'Three times daily after food'),
            r'\b(TAB\\.?\\s+)?DICLOFENAC\b': ('Diclofenac', '50mg', 'oral', 'Twice daily after food'),
            r'\b(TAB\\.?\\s+)?LEVOTHYROXINE\b': ('Levothyroxine', '50mcg', 'oral', 'Once daily empty stomach'),
        }
        
        for pattern, (name, dose, route, freq) in INDIAN_DRUGS.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Try to find dosage near the medication name
                context = text[max(0, match.start()-50):min(len(text), match.end()+100)]
                dose_match = re.search(r'(\d+\.?\d*\s*(?:mg|mcg|g|ml|units?))', context, re.IGNORECASE)
                if dose_match:
                    dose = dose_match.group(1)
                
                # Try to find frequency
                freq_patterns = [
                    (r'\b(?:OD|Once\s+daily|1\s*[x×]\s*day)\b', 'Once daily'),
                    (r'\b(?:BD|Twice\s+daily|2\s*[x×]\s*day)\b', 'Twice daily'),
                    (r'\b(?:TDS|Thrice\s+daily|3\s*[x×]\s*day)\b', 'Three times daily'),
                    (r'\b(?:QID|Four\s+times\s+daily|4\s*[x×]\s*day)\b', 'Four times daily'),
                ]
                for freq_pat, freq_text in freq_patterns:
                    if re.search(freq_pat, context, re.IGNORECASE):
                        freq = freq_text
                        break
                
                # Check if medication already added
                if not any(m['name'] == name for m in extracted["medications"]):
                    extracted["medications"].append({
                        "name": name, "dosage": dose, "frequency": freq,
                        "route": route, "instructions": "As prescribed"
                    })

        return extracted
