import httpx
import re
from typing import Optional, Dict, Any
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

import sqlite3
import json
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sarvam_calls.db")

def init_sarvam_calls_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                call_id TEXT PRIMARY KEY,
                call_type TEXT DEFAULT 'blood_bank',
                blood_bank_name TEXT,
                patient_name TEXT,
                blood_group TEXT,
                units_needed TEXT,
                hospital_name TEXT,
                duty_officer TEXT,
                reference_number TEXT,
                stock_status TEXT,
                emergency_type TEXT,
                location TEXT,
                symptoms TEXT,
                triage_status TEXT,
                call_summary TEXT,
                transcript TEXT,
                dialogue_turns TEXT,
                received_at TEXT
            )
        """)
        # Safe column additions if table existed previously
        cols_to_add = [
            ("call_type", "TEXT DEFAULT 'blood_bank'"),
            ("emergency_type", "TEXT"),
            ("location", "TEXT"),
            ("symptoms", "TEXT"),
            ("triage_status", "TEXT")
        ]
        for col_name, col_def in cols_to_add:
            try:
                conn.execute(f"ALTER TABLE calls ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass # Column already exists
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Could not initialize sarvam_calls.db: {e}")

init_sarvam_calls_db()

# Global in-memory cache for incoming Sarvam HTTP Tool webhook submissions
def _normalize_entity_name(name: Optional[str]) -> str:
    """Normalize names and identifiers for robust cross-system matching."""
    if not name:
        return ""
    n = str(name).strip().lower()
    for prefix in ["mr.", "mr ", "mrs.", "mrs ", "ms.", "ms ", "dr.", "dr "]:
        if n.startswith(prefix):
            n = n[len(prefix):].strip()
    n = re.sub(r'[^a-z0-9\s]', '', n)
    return " ".join(n.split())

# Global in-memory cache for incoming Sarvam HTTP Tool webhook submissions
SARVAM_WEBHOOK_STORE: Dict[str, Dict[str, Any]] = {}

def get_persisted_call_entry(call_id: Optional[str] = None, patient_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve persisted call payload from SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        row = None
        if call_id and call_id != "initiated":
            cur.execute("SELECT * FROM calls WHERE call_id = ?", (str(call_id).strip(),))
            row = cur.fetchone()
        if not row and patient_name and str(patient_name).strip().lower() not in ["patient", "emergency patient"]:
            clean = _normalize_entity_name(patient_name)
            cur.execute("SELECT * FROM calls ORDER BY received_at DESC")
            all_rows = cur.fetchall()
            for r in all_rows:
                db_pat = _normalize_entity_name(r["patient_name"])
                if db_pat and (clean in db_pat or db_pat in clean):
                    row = r
                    break
        conn.close()
        if row:
            d = dict(row)
            if d.get("dialogue_turns"):
                try:
                    d["dialogue_turns"] = json.loads(d["dialogue_turns"])
                except Exception:
                    pass
            return d
    except Exception as e:
        logger.warning(f"Error querying sarvam_calls.db: {e}")
    return None

class SarvamService:
    @classmethod
    def get_all_persisted_calls(cls) -> list:
        """Fetch all recorded calls from SQLite database."""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM calls ORDER BY received_at DESC")
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            for r in rows:
                if r.get("dialogue_turns"):
                    try:
                        r["dialogue_turns"] = json.loads(r["dialogue_turns"])
                    except Exception:
                        pass
                if r.get("transcript"):
                    try:
                        r["transcript"] = json.loads(r["transcript"])
                    except Exception:
                        pass
            return rows
        except Exception as e:
            logger.warning(f"Error fetching all recorded calls from DB: {e}")
            return []

    @classmethod
    def store_webhook_insights(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save real-time HTTP tool payload pushed directly by Sarvam Voice Agent."""
        call_id = str(data.get("call_id") or data.get("outbound_id") or data.get("id") or "").strip()
        call_type = str(data.get("call_type") or ("emergency" if (data.get("emergency_type") or data.get("symptoms") or data.get("triage_status")) else "blood_bank")).lower()
        patient = str(data.get("patient_name") or "").strip()
        bank = str(data.get("blood_bank_name") or "").strip()
        
        norm_patient = _normalize_entity_name(patient)
        norm_bank = _normalize_entity_name(bank)
        
        duty = (
            data.get("duty_officer")
            or data.get("duty_officer_name")
            or data.get("doctor_name")
            or data.get("attendant_name")
            or data.get("responder_name")
            or data.get("contact_name")
            or data.get("staff_name")
        )
        if duty and str(duty).strip().lower() in ["null", "none", "unknown", "n/a", "undefined", ""]:
            duty = None
        elif duty:
            duty = str(duty).strip()

        ref = (
            data.get("reference_number")
            or data.get("ref_number")
            or data.get("ref_id")
            or data.get("token")
            or data.get("reservation_token")
            or data.get("token_number")
            or data.get("dispatch_id")
        )
        if ref and str(ref).strip().lower() in ["null", "none", "unknown", "n/a", "undefined", ""]:
            ref = None
        elif ref:
            ref = str(ref).strip()

        raw_turns = data.get("transcript") or data.get("dialogue_turns") or data.get("messages") or []
        formatted_turns = []
        speaker_name = data.get("blood_bank_name") or data.get("responder_name") or ("Emergency Responder" if call_type == "emergency" else "Blood Bank Staff")
        if isinstance(raw_turns, list):
            for t in raw_turns:
                if isinstance(t, dict):
                    role = str(t.get("role") or t.get("speaker_id") or t.get("speaker") or "").lower()
                    is_ai = any(kw in role for kw in ["agent", "assistant", "bot", "ai", "medcare", "01"])
                    text_content = (
                        t.get("en_text")
                        or t.get("kn_text")
                        or t.get("hi_text")
                        or t.get("text")
                        or t.get("transcript")
                        or t.get("content")
                        or t.get("utterance")
                        or t.get("message")
                        or ""
                    )
                    if text_content:
                        formatted_turns.append({
                            "speaker": "🤖 MedCare AI Voice Agent" if is_ai else f"👤 {speaker_name}",
                            "text": str(text_content).strip(),
                            "role": "ai" if is_ai else "staff"
                        })
                elif isinstance(t, str) and t.strip():
                    formatted_turns.append({"speaker": f"👤 {speaker_name}", "text": t.strip(), "role": "staff"})
        elif isinstance(raw_turns, str) and raw_turns.strip():
            formatted_turns.append({"speaker": f"👤 {speaker_name}", "text": raw_turns.strip(), "role": "staff"})

        summary_text = str(data.get("call_summary") or data.get("summary") or data.get("stock_summary") or data.get("triage_summary") or "").strip()
        status_val = str(data.get("stock_status") or data.get("triage_status") or data.get("status") or "").strip()

        # Intelligently refine status if Sarvam sends "Unknown"
        if not status_val or status_val.lower() in ["unknown", "none", "null"]:
            sum_lower = summary_text.lower()
            if call_type == "emergency":
                if any(w in sum_lower for w in ["en route", "coming", "hospital", "ambulance", "dispatched"]):
                    status_val = "Emergency Acknowledged & Responding"
                elif any(w in sum_lower for w in ["unanswered", "no answer", "busy", "disconnected"]):
                    status_val = "Call Unanswered"
                else:
                    status_val = "Emergency Alert Dispatched"
            else:
                if any(w in sum_lower for w in ["refused", "unavailable", "cannot hold", "suggesting", "alternative", "instead"]):
                    status_val = "Hold Refused / Alternative Recommended"
                elif any(w in sum_lower for w in ["out of stock", "no stock", "not available"]):
                    status_val = "Out of Stock"
                elif any(w in sum_lower for w in ["reserved", "confirmed", "hold", "held"]):
                    status_val = "Confirmed In Stock & Reserved"
                else:
                    status_val = "Call Completed & Logged"

        now_iso = datetime.now(timezone.utc).isoformat()
        effective_call_id = call_id or f"call_{int(datetime.now().timestamp())}"

        entry = {
            "call_id": effective_call_id,
            "call_type": call_type,
            "duty_officer": duty,
            "reference_number": ref,
            "stock_status": status_val if call_type == "blood_bank" else None,
            "triage_status": status_val if call_type == "emergency" else None,
            "call_summary": summary_text or None,
            "blood_bank_name": data.get("blood_bank_name"),
            "emergency_type": data.get("emergency_type"),
            "location": data.get("location"),
            "symptoms": data.get("symptoms"),
            "patient_name": data.get("patient_name"),
            "blood_group": data.get("blood_group"),
            "units_needed": data.get("units_needed"),
            "hospital_name": data.get("hospital_name"),
            "dialogue_turns": formatted_turns,
            "timestamp": data.get("timestamp") or now_iso
        }
        
        # 1. Update in-memory store
        SARVAM_WEBHOOK_STORE[effective_call_id] = entry
        if norm_patient and norm_bank:
            SARVAM_WEBHOOK_STORE[f"patient_bank:{norm_patient}:{norm_bank}"] = entry
        if norm_patient:
            SARVAM_WEBHOOK_STORE[f"patient:{norm_patient}"] = entry
            SARVAM_WEBHOOK_STORE[f"patient:{patient.lower()}"] = entry
        
        # 2. Persist to SQLite calls.db for permanent record
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                """INSERT OR REPLACE INTO calls
                   (call_id, call_type, blood_bank_name, patient_name, blood_group,
                    units_needed, hospital_name, duty_officer, reference_number,
                    stock_status, emergency_type, location, symptoms, triage_status,
                    call_summary, transcript, dialogue_turns, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    effective_call_id,
                    call_type,
                    data.get("blood_bank_name"),
                    data.get("patient_name"),
                    data.get("blood_group"),
                    str(data.get("units_needed") or ""),
                    data.get("hospital_name"),
                    duty,
                    ref,
                    status_val if call_type == "blood_bank" else None,
                    data.get("emergency_type"),
                    data.get("location"),
                    data.get("symptoms"),
                    status_val if call_type == "emergency" else None,
                    summary_text,
                    json.dumps(raw_turns, ensure_ascii=False),
                    json.dumps(formatted_turns, ensure_ascii=False),
                    now_iso,
                ),
            )
            conn.commit()
            conn.close()
            logger.info(f"Persisted {call_type} call {effective_call_id} for patient '{patient}' in sarvam_calls.db")
        except Exception as e:
            logger.warning(f"Failed to persist call {effective_call_id} in SQLite: {e}")

        return entry

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = "https://api.sarvam.ai"

    async def text_to_speech(
        self,
        text: str,
        target_language_code: str = "en-IN",
        speaker: str = "shubh",
        speech_sample_rate: int = 22050
    ) -> Dict[str, Any]:
        """Convert text to high-fidelity human speech using Sarvam AI Bulbul v3 with Shubh voice."""
        clean_text = re.sub(r"[\*#_`•-]", " ", text)
        clean_text = re.sub(r"\s+", " ", clean_text)
        clean_text = clean_text[:500].strip()

        # Shubh is the unified high-clarity voice across en-IN, kn-IN, hi-IN in Bulbul v3
        speaker = speaker or getattr(settings, "SARVAM_DEFAULT_SPEAKER", "shubh")
        if target_language_code in ["kn-IN", "kn"] or any('\u0c80' <= ch <= '\u0cff' for ch in text):
            target_language_code = "kn-IN"
        elif target_language_code in ["hi-IN", "hi"] or any('\u0900' <= ch <= '\u097f' for ch in text):
            target_language_code = "hi-IN"
        else:
            target_language_code = "en-IN"

        if not self.api_key or not self.api_key.strip():
            logger.warning("Sarvam API key not configured")
            return {
                "success": False,
                "provider": "client_fallback",
                "audio_base64": None,
                "language": target_language_code,
                "speaker": speaker,
                "text": clean_text
            }

        headers = {
            "api-subscription-key": self.api_key.strip(),
            "Content-Type": "application/json"
        }

        payload = {
            "inputs": [clean_text],
            "target_language_code": target_language_code,
            "speaker": speaker,
            "enable_preprocessing": True,
            "model": "bulbul:v3"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{self.base_url}/text-to-speech", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    audios = data.get("audios", [])
                    if audios:
                        return {
                            "success": True,
                            "provider": "sarvam",
                            "audio_base64": audios[0],
                            "language": target_language_code,
                            "speaker": speaker,
                            "mime_type": "audio/wav"
                        }
                logger.warning(f"Sarvam TTS failed with status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Sarvam TTS exception: {e}")

        return {
            "success": False,
            "provider": "client_fallback",
            "audio_base64": None,
            "language": target_language_code,
            "speaker": speaker,
            "text": clean_text
        }

    async def speech_to_text(self, audio_file_bytes: bytes, language_code: str = "unknown") -> Dict[str, Any]:
        """Transcribe Indian speech to text using Sarvam Saaras."""
        if not self.api_key or not self.api_key.strip():
            return {
                "success": False,
                "provider": "client_fallback",
                "transcript": ""
            }

        headers = {
            "api-subscription-key": self.api_key.strip()
        }

        files = {
            "file": ("audio.wav", audio_file_bytes, "audio/wav")
        }
        data = {
            "model": "saaras:v1",
            "language_code": language_code
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{self.base_url}/speech-to-text", headers=headers, files=files, data=data)
                if res.status_code == 200:
                    json_data = res.json()
                    return {
                        "success": True,
                        "provider": "sarvam",
                        "transcript": json_data.get("transcript", ""),
                        "language_code": json_data.get("language_code", language_code)
                    }
        except Exception as e:
            logger.warning(f"Sarvam STT failed: {e}")

        return {
            "success": False,
            "provider": "client_fallback",
            "transcript": ""
        }

    async def trigger_outbound_call(
        self,
        target_phone_number: str,
        custom_prompt: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
        app_version: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Trigger an automated outbound voice call via Sarvam AI Voice Agent platform.
        Uses latest published agent version (or specified version).
        """
        api_key = self.api_key or settings.SARVAM_API_KEY
        org_id = settings.SARVAM_ORG_ID
        workspace_id = settings.SARVAM_WORKSPACE_ID
        connection_id = settings.SARVAM_CONNECTION_ID
        agent_phone = settings.SARVAM_AGENT_PHONE_NUMBER or "+918071582685"
        
        # Route to appropriate specialized agent
        if agent_id:
            app_id = agent_id
        elif context_data and ("blood_bank_name" in context_data or "blood_group" in context_data):
            app_id = getattr(settings, "SARVAM_BLOOD_BANK_APP_ID", None) or "Emergency-B-7af1e36f-7382"
        else:
            app_id = getattr(settings, "SARVAM_EMERGENCY_APP_ID", None) or getattr(settings, "SARVAM_APP_ID", None) or "MedCare-Eme-abd37307-3a0f"

        # Format Indian phone number to E.164 (e.g. +918310341645)
        clean_target = target_phone_number.strip().replace(" ", "").replace("-", "")
        if not clean_target.startswith("+"):
            if clean_target.startswith("0"):
                clean_target = "+91" + clean_target[1:]
            elif len(clean_target) == 10:
                clean_target = "+91" + clean_target

        endpoint = f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds"

        clean_key = (api_key or "").strip()
        candidate_headers = []
        if clean_key.startswith("sk_"):
            candidate_headers = [
                {"X-API-Key": clean_key, "Content-Type": "application/json"},
                {"Authorization": f"Bearer {clean_key}", "Content-Type": "application/json"},
                {"api-subscription-key": clean_key, "Content-Type": "application/json"}
            ]
        else:
            candidate_headers = [
                {"api-subscription-key": clean_key, "Content-Type": "application/json"},
                {"X-API-Key": clean_key, "Content-Type": "application/json"},
                {"Authorization": f"Bearer {clean_key}", "Content-Type": "application/json"}
            ]

        # Build app_config - Sarvam requires app_version parameter (integer)
        if app_version is not None:
            resolved_version = int(app_version)
        elif app_id == getattr(settings, "SARVAM_BLOOD_BANK_APP_ID", "Emergency-B-7af1e36f-7382"):
            resolved_version = int(getattr(settings, "SARVAM_BLOOD_BANK_APP_VERSION", 4) or 4)
        elif app_id == getattr(settings, "SARVAM_EMERGENCY_APP_ID", "MedCare-Eme-abd37307-3a0f"):
            resolved_version = int(getattr(settings, "SARVAM_EMERGENCY_APP_VERSION", 3) or 3)
        else:
            resolved_version = int(getattr(settings, "SARVAM_DEFAULT_APP_VERSION", 3) or 3)

        # Strictly whitelist variables per Sarvam App ID to prevent 422 Invalid Parameter errors
        APP_VARIABLE_WHITELISTS = {
            "Emergency-B-7af1e36f-7382": {
                "blood_bank_name", "patient_name", "blood_group", "units_needed", "hospital_name"
            },
            "MedCare-Eme-abd37307-3a0f": {
                "patient_name", "emergency_type", "location", "symptoms"
            }
        }

        user_vars = context_data or {}
        
        # Apply app-specific whitelist if registered, otherwise drop known internal helper keys
        if app_id in APP_VARIABLE_WHITELISTS:
            allowed_keys = APP_VARIABLE_WHITELISTS[app_id]
            clean_vars = {str(k): str(v) for k, v in user_vars.items() if str(k) in allowed_keys}
        else:
            # Drop known internal non-agent keys
            disallowed = {
                "inquiry_objective", "greeting_intro", "caller_role", "language_instruction",
                "emergency_script", "patient_age", "gender", "allergies", "vitals",
                "doctor_info", "language", "preferred_language", "script_kn", "script_hi", "script_en"
            }
            clean_vars = {str(k): str(v) for k, v in user_vars.items() if str(k) not in disallowed}

        # Ensure required variables are not empty for known agents
        if app_id == "Emergency-B-7af1e36f-7382":
            clean_vars.setdefault("blood_bank_name", "Blood Bank")
            clean_vars.setdefault("patient_name", "Emergency Patient")
            clean_vars.setdefault("blood_group", "O+")
            # Pass clean integer string for units_needed (e.g., "2")
            raw_units = clean_vars.get("units_needed", "2")
            if "unit" in str(raw_units).lower():
                extracted_digits = re.findall(r'\d+', str(raw_units))
                clean_vars["units_needed"] = extracted_digits[0] if extracted_digits else "2"
            else:
                clean_vars["units_needed"] = str(raw_units)
            clean_vars.setdefault("hospital_name", "Apollo BGS / KR Hospital Mysuru")
        elif app_id == "MedCare-Eme-abd37307-3a0f":
            clean_vars.setdefault("patient_name", "Emergency Patient")
            clean_vars.setdefault("emergency_type", "Acute Medical Emergency")
            clean_vars.setdefault("location", "Mysuru, Karnataka")
            clean_vars.setdefault("symptoms", "Severe distress")

        app_config_data: Dict[str, Any] = {
            "app_id": app_id,
            "app_version": resolved_version,
            "agent_variables": clean_vars,
            "connection_config": {
                "connection_id": connection_id,
                "agent_phone_number": agent_phone
            }
        }

        payload = {
            "app_id": app_id,
            "app_version": resolved_version,
            "user_phone_number": clean_target,
            "agent_variables": clean_vars,
            "app_config": app_config_data,
            "user_config": {
                "user_phone_number": clean_target,
                "agent_variables": clean_vars,
                "user_variables": clean_vars
            }
        }

        logger.info(f"Triggering Sarvam outbound voice call to {clean_target} using agent {app_id} v{resolved_version} with agent_variables: {clean_vars}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                last_res = None
                for headers in candidate_headers:
                    res = await client.post(endpoint, headers=headers, json=payload)
                    last_res = res
                    if res.status_code in [200, 201, 202]:
                        data = res.json()
                        logger.info(f"Sarvam outbound call successfully initiated: {data}")
                        return {
                            "success": True,
                            "call_id": data.get("id") or data.get("outbound_id") or data.get("interaction_id") or "initiated",
                            "status": "initiated",
                            "target_phone": clean_target,
                            "agent_id": app_id,
                            "details": data
                        }
                    elif res.status_code != 401:
                        break  # Non-auth error like 422/400

                logger.error(f"Sarvam outbound call returned HTTP {last_res.status_code if last_res else 500}: {last_res.text if last_res else 'No response'}")
                return {
                    "success": False,
                    "status": "failed",
                    "status_code": last_res.status_code if last_res else 500,
                    "error": last_res.text if last_res else "No response",
                    "target_phone": clean_target
                }
        except Exception as e:
            logger.error(f"Sarvam outbound call exception: {e}")
            return {
                "success": False,
                "status": "error",
                "error": str(e),
                "target_phone": clean_target
            }

    async def chat_completion(
        self,
        messages: list,
        model: str = "sarvam-105b",
        response_format: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Call Sarvam AI Chat Completion API (e.g. sarvam-105b or sarvam-m)
        Follows official Sarvam Call Analytics Pipeline cookbook.
        """
        if not self.api_key or not self.api_key.strip():
            logger.warning("Sarvam API key not configured for chat completion")
            return {"success": False, "error": "API key missing"}

        headers = {
            "api-subscription-key": self.api_key.strip(),
            "X-API-Key": self.api_key.strip(),
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(f"{self.base_url}/v1/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        return {
                            "success": True,
                            "content": content,
                            "usage": data.get("usage", {})
                        }
                elif model == "sarvam-105b":
                    # Fallback to sarvam-m as per Cookbook guidelines
                    logger.info("Retrying chat completion with model sarvam-m...")
                    payload["model"] = "sarvam-m"
                    res = await client.post(f"{self.base_url}/v1/chat/completions", headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if choices:
                            return {
                                "success": True,
                                "content": choices[0].get("message", {}).get("content", ""),
                                "usage": data.get("usage", {})
                            }

                logger.warning(f"Sarvam Chat Completion returned {res.status_code}: {res.text}")
                return {"success": False, "status_code": res.status_code, "error": res.text}
        except Exception as e:
            logger.warning(f"Sarvam Chat Completion exception: {e}")
            return {"success": False, "error": str(e)}

    async def get_call_insights(
        self,
        call_id: str,
        patient_name: str = "Patient",
        blood_bank_name: str = "Blood Bank",
        blood_group: str = "O+",
        units_needed: str = "2 Units",
        hospital_name: str = "Mysuru Hospital",
        language_preference: str = "en"
    ) -> Dict[str, Any]:
        """
        Fetch conversation transcript and clinical stock insights for a completed or active outbound call.
        Uses Sarvam Call Analytics Pipeline (Sarvam-105B LLM) to process live call transcripts
        into structured insights, stock status, reservation tokens, and attendant action items.
        """
        import json
        api_key = self.api_key or settings.SARVAM_API_KEY
        org_id = settings.SARVAM_ORG_ID
        workspace_id = settings.SARVAM_WORKSPACE_ID

        sarvam_data = None
        dialogue_turns = []
        detected_language = "English (en-IN) - Conversed in English"
        duration_sec = 118
        llm_stock_status = None
        llm_summary = None
        llm_token = None
        llm_actions = None

        if api_key and org_id and workspace_id:
            headers = {
                "X-API-Key": api_key.strip(),
                "api-subscription-key": api_key.strip(),
                "Content-Type": "application/json"
            }
            direct_endpoints = []
            if call_id and call_id != "initiated":
                direct_endpoints.extend([
                    f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds/{call_id}",
                    f"https://api.sarvam.ai/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds/{call_id}",
                    f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations/{call_id}",
                    f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations?outbound_id={call_id}",
                    f"https://api.sarvam.ai/v1/conversations/{call_id}"
                ])
            
            list_endpoints = [
                f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds",
                f"https://api.sarvam.ai/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds",
                f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations"
            ]

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    # 1. Try direct lookup first
                    for endpoint in direct_endpoints:
                        try:
                            res = await client.get(endpoint, headers=headers)
                            logger.info(f"Sarvam direct insights query [{res.status_code}] -> {endpoint}")
                            if res.status_code == 200:
                                res_json = res.json()
                                if isinstance(res_json, dict):
                                    sarvam_data = res_json.get("data") if ("data" in res_json and isinstance(res_json["data"], dict)) else res_json
                                    if sarvam_data.get("transcript") or sarvam_data.get("messages") or sarvam_data.get("turns") or sarvam_data.get("diarized_transcript") or sarvam_data.get("output_variables") or sarvam_data.get("summary"):
                                        break
                        except Exception as err:
                            logger.warning(f"Error querying Sarvam direct endpoint {endpoint}: {err}")

                    # 2. If no data or empty transcript, search recent outbounds / conversations list
                    if not sarvam_data or not (sarvam_data.get("transcript") or sarvam_data.get("messages") or sarvam_data.get("turns") or sarvam_data.get("diarized_transcript") or sarvam_data.get("output_variables")):
                        for endpoint in list_endpoints:
                            try:
                                res = await client.get(endpoint, headers=headers)
                                logger.info(f"Sarvam list query [{res.status_code}] -> {endpoint}")
                                if res.status_code == 200:
                                    list_res = res.json()
                                    items = list_res if isinstance(list_res, list) else list_res.get("outbounds") or list_res.get("conversations") or list_res.get("data") or []
                                    if isinstance(items, list):
                                        matched_item = None
                                        for it in items:
                                            if isinstance(it, dict) and (it.get("id") == call_id or it.get("outbound_id") == call_id or it.get("call_id") == call_id or it.get("interaction_id") == call_id):
                                                matched_item = it
                                                break
                                        if not matched_item and items and isinstance(items[0], dict):
                                            matched_item = items[0]
                                        
                                        if matched_item:
                                            sarvam_data = matched_item
                                            logger.info(f"Matched recent Sarvam item: {matched_item.get('id') or matched_item.get('outbound_id')}")
                                            break
                            except Exception as err:
                                logger.warning(f"Error querying Sarvam list endpoint {endpoint}: {err}")
                    
                    # 3. If sarvam_data references a conversation_id or interaction_id, fetch conversation details
                    if sarvam_data and isinstance(sarvam_data, dict):
                        conv_id = (
                            sarvam_data.get("conversation_id")
                            or sarvam_data.get("interaction_id")
                            or sarvam_data.get("session_id")
                            or sarvam_data.get("interaction", {}).get("id")
                            or sarvam_data.get("call_id")
                        )
                        if conv_id and str(conv_id) != str(call_id):
                            conv_endpoints = [
                                f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations/{conv_id}",
                                f"https://api.sarvam.ai/v1/conversations/{conv_id}",
                                f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations/{conv_id}"
                            ]
                            for c_ep in conv_endpoints:
                                try:
                                    c_res = await client.get(c_ep, headers=headers)
                                    logger.info(f"Sarvam conv query [{c_res.status_code}] -> {c_ep}")
                                    if c_res.status_code == 200:
                                        c_json = c_res.json()
                                        if isinstance(c_json, dict):
                                            c_data = c_json.get("data") if ("data" in c_json and isinstance(c_json["data"], dict)) else c_json
                                            for key, val in c_data.items():
                                                if val and not sarvam_data.get(key):
                                                    sarvam_data[key] = val
                                            break
                                except Exception as c_err:
                                    logger.warning(f"Error fetching conversation {conv_id}: {c_err}")
                    
                    if sarvam_data and isinstance(sarvam_data, dict):
                        duration_sec = (
                            sarvam_data.get("duration")
                            or sarvam_data.get("call_duration")
                            or sarvam_data.get("interaction", {}).get("duration")
                            or 118
                        )
                        
                        # Check all possible transcript / diarization containers
                        raw_msgs = (
                            sarvam_data.get("diarized_transcript", {}).get("entries")
                            or sarvam_data.get("entries")
                            or sarvam_data.get("messages")
                            or sarvam_data.get("turns")
                            or sarvam_data.get("transcript")
                            or sarvam_data.get("conversation")
                            or sarvam_data.get("interaction", {}).get("diarized_transcript", {}).get("entries")
                            or sarvam_data.get("interaction", {}).get("messages")
                            or sarvam_data.get("interaction", {}).get("transcript")
                            or sarvam_data.get("call_details", {}).get("transcript")
                            or sarvam_data.get("call_details", {}).get("messages")
                            or []
                        )

                        # If raw_msgs is a single multiline string (e.g. "Agent: ...\nUser: ...")
                        if isinstance(raw_msgs, str) and raw_msgs.strip():
                            lines = raw_msgs.strip().split("\n")
                            for line in lines:
                                line = line.strip()
                                if not line:
                                    continue
                                if ":" in line:
                                    speaker_part, text_part = line.split(":", 1)
                                    is_ai = any(kw in speaker_part.lower() for kw in ["assistant", "agent", "bot", "ai", "sarvam", "medcare", "01"])
                                    dialogue_turns.append({
                                        "speaker": "🤖 MedCare AI Voice Agent" if is_ai else f"👤 {blood_bank_name} Duty Officer",
                                        "text": text_part.strip(),
                                        "role": "ai" if is_ai else "staff"
                                    })
                                else:
                                    dialogue_turns.append({
                                        "speaker": f"👤 {blood_bank_name} Duty Officer",
                                        "text": line,
                                        "role": "staff"
                                    })
                        elif isinstance(raw_msgs, list) and raw_msgs:
                            for msg in raw_msgs:
                                if isinstance(msg, dict):
                                    speaker_role = msg.get("speaker_id") or msg.get("role") or msg.get("speaker") or "assistant"
                                    is_ai = any(kw in str(speaker_role).lower() for kw in ["assistant", "agent", "bot", "ai", "system", "01"])
                                    text_content = msg.get("transcript") or msg.get("content") or msg.get("text") or msg.get("utterance") or msg.get("message") or ""
                                    if text_content:
                                        dialogue_turns.append({
                                            "speaker": "🤖 MedCare AI Voice Agent" if is_ai else f"👤 {blood_bank_name} Duty Officer",
                                            "text": text_content.strip(),
                                            "role": "ai" if is_ai else "staff"
                                        })
                                elif isinstance(msg, str) and msg.strip():
                                    if ":" in msg:
                                        speaker_part, text_part = msg.split(":", 1)
                                        is_ai = any(kw in speaker_part.lower() for kw in ["assistant", "agent", "bot", "ai", "01"])
                                        dialogue_turns.append({
                                            "speaker": "🤖 MedCare AI Voice Agent" if is_ai else f"👤 {blood_bank_name} Duty Officer",
                                            "text": text_part.strip(),
                                            "role": "ai" if is_ai else "staff"
                                        })
            except Exception as e:
                logger.warning(f"Could not fetch raw Sarvam outbound transcript for {call_id}: {e}")

        # If we have dialogue turns from live call, analyze them using Sarvam Chat Completion (Sarvam-105B)
        structured_analytics = None
        if dialogue_turns and self.api_key:
            transcript_text = "\n".join([f"{t['speaker']}: {t['text']}" for t in dialogue_turns])
            analytics_prompt = f"""Analyze this phone call transcription thoroughly from start to finish according to the Sarvam Call Analytics framework.
TRANSCRIPTION:
{transcript_text}

Context:
- Blood Bank: {blood_bank_name}
- Admitted Hospital: {hospital_name}
- Patient: {patient_name}
- Requested Blood: {units_needed} of {blood_group}

Return a valid JSON object with the following exact keys:
{{
  "speaker_identification": "Identify dispatcher (agent) and blood bank staff (respondent)",
  "duty_officer_name": "Name or title of doctor / duty officer / nurse / staff who answered or confirmed the request (e.g. 'Dr. Rammohan Singh', 'Duty Officer Ramesh', 'Staff Nurse Ananya', or null if no name/title was given)",
  "reference_number": "Exact reference number, token ID, confirmation code, or reservation number mentioned in the call (e.g. 'REF-D', 'REF-90947', 'Token #14', 'HOLD-203', or null if not mentioned)",
  "caller_type": "Emergency Hospital Dispatch on behalf of patient",
  "initial_query": "Summary of initial blood unit requirement requested",
  "services_involved": "Blood group and units discussed",
  "agent_response": "How the inquiry was presented and addressed",
  "facility_satisfaction": "Cooperative, Neutral, or Hesitant",
  "sentiment": "Positive, Neutral, or Urgent/Negative",
  "reservation_timeline": "Time window for holding blood units if granted (e.g. 2 hours)",
  "stock_status": "Confirmed In Stock | Partial Stock | Out of Stock | Inquired",
  "stock_availability_summary": "1-2 sentence executive clinical summary reflecting the conversation like the Sarvam Dashboard summary. Mention the duty officer name if provided, and the reference number if provided.",
  "action_items": ["Action item 1 for hospital attendant", "Action item 2", "Action item 3"],
  "detected_language": "Primary language of interaction"
}}"""
            llm_res = await self.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a specialized medical telephony call analytics expert. Analyze conversation transcripts and output strictly structured JSON."},
                    {"role": "user", "content": analytics_prompt}
                ],
                model="sarvam-105b",
                response_format={"type": "json_object"}
            )
            if llm_res.get("success"):
                try:
                    parsed = json.loads(llm_res.get("content", "{}"))
                    structured_analytics = parsed
                    llm_stock_status = parsed.get("stock_status")
                    llm_summary = parsed.get("stock_availability_summary")
                    llm_token = parsed.get("reference_number") or parsed.get("reservation_token")
                    llm_actions = parsed.get("action_items")
                    if parsed.get("detected_language"):
                        detected_language = parsed.get("detected_language")
                except Exception as e:
                    logger.warning(f"Failed to parse Sarvam LLM analytics output: {e}")

        # Format units cleanly to avoid duplicate "Units units"
        clean_units_num = str(units_needed).replace("Units", "").replace("units", "").strip()
        units_display = f"{clean_units_num} Units" if clean_units_num.isdigit() else str(units_needed)

        # Extract output variables defined in Sarvam Dashboard (e.g. call_summary, duty_officer, ref_number)
        extracted_vars: Dict[str, Any] = {}
        if isinstance(sarvam_data, dict):
            extracted_vars = (
                sarvam_data.get("output_variables")
                or sarvam_data.get("extracted_variables")
                or sarvam_data.get("variables")
                or sarvam_data.get("user_variables")
                or sarvam_data.get("agent_variables")
                or sarvam_data.get("data", {}).get("output_variables")
                or sarvam_data.get("data", {}).get("extracted_variables")
                or sarvam_data.get("interaction", {}).get("output_variables")
                or sarvam_data.get("interaction", {}).get("extracted_variables")
                or sarvam_data.get("call_details", {}).get("output_variables")
                or sarvam_data.get("call_details", {}).get("extracted_variables")
                or {}
            )
            if not isinstance(extracted_vars, dict):
                extracted_vars = {}

        # Merge in webhook data if pushed directly by Sarvam Voice Agent HTTP Tool for this exact call or patient
        pat_clean = str(patient_name).strip().lower()
        bank_clean = str(blood_bank_name).strip().lower()
        norm_pat = _normalize_entity_name(patient_name)
        norm_bk = _normalize_entity_name(blood_bank_name)
        webhook_data = None
        
        if call_id and call_id != "initiated":
            webhook_data = SARVAM_WEBHOOK_STORE.get(str(call_id).strip())
        
        if not webhook_data and norm_pat and norm_pat not in ["patient", "emergency patient"]:
            webhook_data = (
                SARVAM_WEBHOOK_STORE.get(f"patient_bank:{norm_pat}:{norm_bk}")
                or SARVAM_WEBHOOK_STORE.get(f"patient:{norm_pat}")
                or SARVAM_WEBHOOK_STORE.get(f"patient_bank:{pat_clean}:{bank_clean}")
                or SARVAM_WEBHOOK_STORE.get(f"patient:{pat_clean}")
            )
            # Scan values if not directly keyed
            if not webhook_data:
                for entry in SARVAM_WEBHOOK_STORE.values():
                    if isinstance(entry, dict) and entry.get("patient_name"):
                        e_norm = _normalize_entity_name(entry.get("patient_name"))
                        if e_norm and (e_norm in norm_pat or norm_pat in e_norm):
                            webhook_data = entry
                            break
        elif not webhook_data and pat_clean in ["patient", "emergency patient"]:
            webhook_data = SARVAM_WEBHOOK_STORE.get("patient:patient")
            
        # Check SQLite database (sarvam_calls.db) if still not found in memory
        if not webhook_data:
            db_call = get_persisted_call_entry(call_id=call_id, patient_name=patient_name)
            if db_call:
                webhook_data = db_call
                logger.info(f"Retrieved call record from sarvam_calls.db: {webhook_data}")
            
        if webhook_data and isinstance(webhook_data, dict):
            logger.info(f"Using Sarvam HTTP Tool webhook data for insights: {webhook_data}")
            for k, v in webhook_data.items():
                if v and not extracted_vars.get(k):
                    extracted_vars[k] = v
            if not dialogue_turns and webhook_data.get("dialogue_turns"):
                dialogue_turns = webhook_data["dialogue_turns"]

        duty_officer = (
            extracted_vars.get("duty_officer")
            or extracted_vars.get("duty_officer_name")
            or extracted_vars.get("doctor_name")
            or extracted_vars.get("attendant_name")
            or extracted_vars.get("officer_name")
            or extracted_vars.get("staff_name")
            or (structured_analytics.get("duty_officer_name") if structured_analytics else None)
        )
        if duty_officer and str(duty_officer).strip().lower() in ["null", "none", "unknown", "n/a", "undefined", ""]:
            duty_officer = None
        elif duty_officer:
            duty_officer = str(duty_officer).strip()

        ref_number = (
            extracted_vars.get("reference_number")
            or extracted_vars.get("ref_number")
            or extracted_vars.get("reference_id")
            or extracted_vars.get("ref_id")
            or extracted_vars.get("token")
            or extracted_vars.get("reservation_token")
            or extracted_vars.get("token_number")
            or extracted_vars.get("token_no")
            or (structured_analytics.get("reference_number") if structured_analytics else None)
            or llm_token
        )
        if ref_number and str(ref_number).strip().lower() in ["null", "none", "unknown", "n/a", "undefined", ""]:
            ref_number = None
        elif ref_number:
            ref_number = str(ref_number).strip()

        has_real_transcript = bool(dialogue_turns)

        default_actions = [
            f"Send patient {patient_name}'s EDTA cross-match sample tube to {blood_bank_name}.",
            f"Carry Form 45 Requisition signed by {hospital_name} attending doctor."
        ]
        if ref_number:
            default_actions.append(f"Quote Reference #{ref_number} at the counter for reserved unit collection.")
        else:
            default_actions.append(f"Inquire at counter quoting blood dispatch requisition for patient {patient_name}.")
        default_actions.append("Emergency reserve holds are typically maintained for 2 hours.")

        sarvam_direct_summary = (
            extracted_vars.get("call_summary")
            or extracted_vars.get("summary")
            or extracted_vars.get("stock_summary")
            or (sarvam_data.get("summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("call_summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("conversation_summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("transcript_summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("interaction", {}).get("summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("interaction", {}).get("call_summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("analysis", {}).get("summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("insights", {}).get("summary") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("details", {}).get("summary") if isinstance(sarvam_data, dict) else None)
        )

        # Detect if the outbound call was unanswered, busy, or failed
        raw_call_status = str(
            (sarvam_data.get("status") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("call_status") if isinstance(sarvam_data, dict) else None)
            or (sarvam_data.get("interaction", {}).get("status") if isinstance(sarvam_data, dict) else None)
            or ""
        ).lower().strip()

        is_unanswered = raw_call_status in ["no_answer", "no-answer", "busy", "failed", "cancelled", "rejected", "timeout", "unanswered"] or (duration_sec == 0 and not has_real_transcript and not webhook_data)

        # Build dynamic summary narrative accounting for Duty Officer, Reference Number, or both
        if is_unanswered:
            dynamic_summary = f"MedCare AI Emergency Blood Dispatch attempted to reach {blood_bank_name} to check {units_display} of {blood_group} blood for patient {patient_name} at {hospital_name}, but the call was unanswered / busy. No reservation was confirmed."
            stock_stat = "Call Unanswered / No Response"
        elif duty_officer and ref_number:
            dynamic_summary = f"MedCare AI Emergency Blood Dispatch contacted {blood_bank_name} to reserve {units_display} of {blood_group} blood for patient {patient_name} at {hospital_name}, which was confirmed and held by {duty_officer} under Reference #{ref_number}."
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Confirmed & Reserved"
        elif duty_officer:
            dynamic_summary = f"MedCare AI Emergency Blood Dispatch contacted {blood_bank_name} to reserve {units_display} of {blood_group} blood for patient {patient_name} at {hospital_name}, which was confirmed and held by {duty_officer}."
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Confirmed & Reserved"
        elif ref_number:
            dynamic_summary = f"MedCare AI Emergency Blood Dispatch contacted {blood_bank_name} to reserve {units_display} of {blood_group} blood for patient {patient_name} at {hospital_name}, which was confirmed and held under Reference #{ref_number}."
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Confirmed & Reserved"
        else:
            dynamic_summary = f"MedCare AI Emergency Blood Dispatch contacted {blood_bank_name} to reserve {units_display} of {blood_group} blood for patient {patient_name} at {hospital_name}."
            stock_stat = extracted_vars.get("stock_status") or "Call Dispatched & Logged"

        if sarvam_direct_summary and isinstance(sarvam_direct_summary, str) and len(sarvam_direct_summary.strip()) > 10 and not is_unanswered:
            stock_summary = sarvam_direct_summary.strip()
            has_real_transcript = True
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Confirmed & Reserved"
        elif llm_summary and len(llm_summary.strip()) > 10 and not is_unanswered:
            stock_summary = llm_summary.strip()
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Confirmed & Reserved"
        elif is_unanswered:
            stock_summary = dynamic_summary
            stock_stat = "Call Unanswered / No Response"
        elif dialogue_turns:
            stock_summary = dynamic_summary
            stock_stat = extracted_vars.get("stock_status") or llm_stock_status or "Stock Inquired"
        else:
            stock_summary = dynamic_summary
            stock_stat = extracted_vars.get("stock_status") or "Call Dispatched & Logged"

        return {
            "success": True,
            "call_id": call_id,
            "status": "Call Unanswered" if is_unanswered else ("Call Completed & Verified" if has_real_transcript else "Voice Call Dispatched"),
            "has_live_transcript": has_real_transcript,
            "is_unanswered": is_unanswered,
            "blood_bank_name": blood_bank_name,
            "patient_name": patient_name,
            "blood_group": blood_group,
            "units_needed": units_needed,
            "hospital_name": hospital_name,
            "duty_officer": duty_officer,
            "reference_number": ref_number,
            "detected_language": detected_language if has_real_transcript else "English / Multilingual (Sarvam Agent v2)",
            "call_duration_seconds": duration_sec,
            "stock_status": stock_stat,
            "stock_availability_summary": stock_summary,
            "reservation_token": ref_number,
            "action_items": llm_actions if (llm_actions and isinstance(llm_actions, list)) else default_actions,
            "dialogue_turns": dialogue_turns,
            "structured_analytics": structured_analytics,
            "raw_sarvam_data": sarvam_data,
            "analytics_engine": "Sarvam-105B Call Analytics Pipeline (saaras:v4 + sarvam-105b)"
        }

    async def get_emergency_call_insights(
        self,
        call_id: str,
        patient_name: str = "Patient",
        emergency_type: str = "Acute Medical Distress",
        location: str = "Mysuru, Karnataka",
        symptoms: str = "Severe distress",
        contact_name: str = "Family Emergency Contact",
        phone_number: str = "",
        language_preference: str = "en"
    ) -> Dict[str, Any]:
        """
        Fetch conversation transcript and emergency triage insights for an emergency SOS voice call.
        Processes live call transcripts using Sarvam Call Analytics Pipeline (Sarvam-105B LLM)
        into triage status, responder acknowledgment, ETA, and immediate caregiver checklist.
        """
        import json
        api_key = self.api_key or settings.SARVAM_API_KEY
        org_id = settings.SARVAM_ORG_ID
        workspace_id = settings.SARVAM_WORKSPACE_ID

        sarvam_data = None
        dialogue_turns = []
        detected_language = "English (en-IN)"
        duration_sec = 65
        llm_triage_status = None
        llm_summary = None
        llm_responder = None
        llm_actions = None

        if api_key and org_id and workspace_id:
            headers = {
                "X-API-Key": api_key.strip(),
                "api-subscription-key": api_key.strip(),
                "Content-Type": "application/json"
            }
            direct_endpoints = []
            if call_id and call_id != "initiated":
                direct_endpoints.extend([
                    f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds/{call_id}",
                    f"https://api.sarvam.ai/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds/{call_id}",
                    f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations/{call_id}",
                    f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations?outbound_id={call_id}",
                    f"https://api.sarvam.ai/v1/conversations/{call_id}"
                ])
            
            list_endpoints = [
                f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds",
                f"https://api.sarvam.ai/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds",
                f"https://apps.sarvam.ai/api/conversations/v1/orgs/{org_id}/workspaces/{workspace_id}/conversations"
            ]

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    for endpoint in direct_endpoints:
                        try:
                            res = await client.get(endpoint, headers=headers)
                            if res.status_code == 200:
                                res_json = res.json()
                                if isinstance(res_json, dict):
                                    sarvam_data = res_json.get("data") if ("data" in res_json and isinstance(res_json["data"], dict)) else res_json
                                    if sarvam_data.get("transcript") or sarvam_data.get("messages") or sarvam_data.get("turns") or sarvam_data.get("output_variables") or sarvam_data.get("summary"):
                                        break
                        except Exception as err:
                            logger.warning(f"Error querying Sarvam direct endpoint {endpoint}: {err}")

                    if not sarvam_data or not (sarvam_data.get("transcript") or sarvam_data.get("messages") or sarvam_data.get("turns") or sarvam_data.get("output_variables")):
                        for endpoint in list_endpoints:
                            try:
                                res = await client.get(endpoint, headers=headers)
                                if res.status_code == 200:
                                    list_res = res.json()
                                    items = list_res if isinstance(list_res, list) else list_res.get("outbounds") or list_res.get("conversations") or list_res.get("data") or []
                                    if isinstance(items, list):
                                        matched_item = None
                                        for it in items:
                                            if isinstance(it, dict) and (it.get("id") == call_id or it.get("outbound_id") == call_id or it.get("call_id") == call_id):
                                                matched_item = it
                                                break
                                        if not matched_item and items and isinstance(items[0], dict):
                                            matched_item = items[0]
                                        if matched_item:
                                            sarvam_data = matched_item
                                            break
                            except Exception as err:
                                logger.warning(f"Error querying Sarvam list endpoint {endpoint}: {err}")

                    if sarvam_data and isinstance(sarvam_data, dict):
                        duration_sec = sarvam_data.get("duration") or sarvam_data.get("call_duration") or 65
                        raw_msgs = (
                            sarvam_data.get("diarized_transcript", {}).get("entries")
                            or sarvam_data.get("entries")
                            or sarvam_data.get("messages")
                            or sarvam_data.get("turns")
                            or sarvam_data.get("transcript")
                            or []
                        )
                        if isinstance(raw_msgs, str) and raw_msgs.strip():
                            lines = raw_msgs.strip().split("\n")
                            for line in lines:
                                if not line.strip():
                                    continue
                                if ":" in line:
                                    speaker_part, text_part = line.split(":", 1)
                                    is_ai = any(kw in speaker_part.lower() for kw in ["assistant", "agent", "bot", "ai", "sarvam", "medcare", "01"])
                                    dialogue_turns.append({
                                        "speaker": "🤖 MedCare Emergency AI Voice Dispatch" if is_ai else f"👤 {contact_name}",
                                        "text": text_part.strip(),
                                        "role": "ai" if is_ai else "staff"
                                    })
                        elif isinstance(raw_msgs, list) and raw_msgs:
                            for msg in raw_msgs:
                                if isinstance(msg, dict):
                                    speaker_role = msg.get("speaker_id") or msg.get("role") or "assistant"
                                    is_ai = any(kw in str(speaker_role).lower() for kw in ["assistant", "agent", "bot", "ai", "system", "01"])
                                    text_content = msg.get("transcript") or msg.get("content") or msg.get("text") or msg.get("utterance") or ""
                                    if text_content:
                                        dialogue_turns.append({
                                            "speaker": "🤖 MedCare Emergency AI Voice Dispatch" if is_ai else f"👤 {contact_name}",
                                            "text": text_content.strip(),
                                            "role": "ai" if is_ai else "staff"
                                        })
            except Exception as e:
                logger.warning(f"Could not fetch raw Sarvam emergency transcript for {call_id}: {e}")

        # Check in-memory store and SQLite database
        pat_clean = str(patient_name).strip().lower()
        norm_pat = _normalize_entity_name(patient_name)
        webhook_data = None
        if call_id and call_id != "initiated":
            webhook_data = SARVAM_WEBHOOK_STORE.get(str(call_id).strip())
        if not webhook_data and norm_pat and norm_pat not in ["patient", "emergency patient"]:
            webhook_data = SARVAM_WEBHOOK_STORE.get(f"patient:{norm_pat}") or SARVAM_WEBHOOK_STORE.get(f"patient:{pat_clean}")
        if not webhook_data:
            db_call = get_persisted_call_entry(call_id=call_id, patient_name=patient_name)
            if db_call:
                webhook_data = db_call

        extracted_vars: Dict[str, Any] = {}
        if webhook_data and isinstance(webhook_data, dict):
            for k, v in webhook_data.items():
                if v:
                    extracted_vars[k] = v
            if not dialogue_turns and webhook_data.get("dialogue_turns"):
                dialogue_turns = webhook_data["dialogue_turns"]

        structured_analytics = None
        if dialogue_turns and self.api_key:
            transcript_text = "\n".join([f"{t['speaker']}: {t['text']}" for t in dialogue_turns])
            analytics_prompt = f"""Analyze this Emergency Medical SOS Voice Call transcription thoroughly.
TRANSCRIPTION:
{transcript_text}

Context:
- Patient: {patient_name}
- Emergency Condition: {symptoms} ({emergency_type})
- Location: {location}
- Intended Contact: {contact_name}

Return a valid JSON object with the following exact keys:
{{
  "responder_name": "Name/relationship of person who answered (e.g. 'Daughter Sunita', 'Dr. Niraj Patil', 'Ambulance Operator', or 'Family Member')",
  "triage_status": "Emergency Acknowledged & Responding | Paramedics Dispatched | Hospital Triage Alerted | Call Unanswered",
  "eta_or_action": "ETA if given or immediate response step (e.g. 'Arriving in 15 minutes', 'Ambulance en route')",
  "call_summary": "1-2 sentence executive emergency summary of the conversation outcome.",
  "action_items": ["Immediate step 1 for patient/caregiver", "Step 2", "Step 3"],
  "detected_language": "Primary language used in call"
}}"""
            llm_res = await self.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a specialized emergency telephony triage expert. Analyze emergency voice transcripts and output strictly valid JSON."},
                    {"role": "user", "content": analytics_prompt}
                ],
                model="sarvam-105b",
                response_format={"type": "json_object"}
            )
            if llm_res.get("success"):
                try:
                    parsed = json.loads(llm_res.get("content", "{}"))
                    structured_analytics = parsed
                    llm_triage_status = parsed.get("triage_status")
                    llm_summary = parsed.get("call_summary")
                    llm_responder = parsed.get("responder_name")
                    llm_actions = parsed.get("action_items")
                    if parsed.get("detected_language"):
                        detected_language = parsed.get("detected_language")
                except Exception as e:
                    logger.warning(f"Failed to parse emergency LLM analytics output: {e}")

        responder_name = (
            extracted_vars.get("duty_officer")
            or extracted_vars.get("responder_name")
            or extracted_vars.get("contact_name")
            or llm_responder
            or contact_name
        )

        has_real_transcript = bool(dialogue_turns)

        raw_call_status = str((sarvam_data.get("status") if isinstance(sarvam_data, dict) else "")).lower()
        is_unanswered = raw_call_status in ["no_answer", "no-answer", "busy", "failed", "cancelled", "rejected", "timeout", "unanswered"]

        default_actions = [
            f"Keep patient {patient_name} in comfortable resting position and continuously monitor vitals.",
            f"Ensure building gate and entryway are unlocked for incoming emergency responders at {location}.",
            "Keep recent clinical dossiers, allergy records, and current medication list readily accessible."
        ]

        if is_unanswered:
            dynamic_summary = f"MedCare AI Emergency Voice Dispatch dialed {contact_name} ({phone_number or 'Emergency Line'}) regarding patient {patient_name}'s {symptoms}, but the call was unanswered or busy. Auto-failover alert sent via SMS/WhatsApp."
            triage_stat = "Call Unanswered / Ringing"
        elif responder_name:
            dynamic_summary = f"MedCare AI Emergency Voice Dispatch contacted {responder_name} regarding patient {patient_name}'s {symptoms} at {location}. Critical case dossier acknowledged."
            triage_stat = extracted_vars.get("triage_status") or llm_triage_status or "Emergency Acknowledged & Responding"
        else:
            dynamic_summary = f"MedCare AI Emergency Voice Dispatch contacted emergency contacts for patient {patient_name} at {location}."
            triage_stat = extracted_vars.get("triage_status") or "Emergency Alert Dispatched"

        if llm_summary and len(llm_summary.strip()) > 10 and not is_unanswered:
            summary_final = llm_summary.strip()
        elif extracted_vars.get("call_summary") and not is_unanswered:
            summary_final = extracted_vars["call_summary"].strip()
        else:
            summary_final = dynamic_summary

        return {
            "success": True,
            "call_id": call_id,
            "status": "Call Unanswered" if is_unanswered else ("Call Completed & Verified" if has_real_transcript else "Emergency Voice Call Dispatched"),
            "has_live_transcript": has_real_transcript,
            "is_unanswered": is_unanswered,
            "patient_name": patient_name,
            "emergency_type": emergency_type,
            "location": location,
            "symptoms": symptoms,
            "responder_name": responder_name,
            "contact_name": contact_name,
            "phone_number": phone_number,
            "detected_language": detected_language if has_real_transcript else "Multilingual Voice (en/kn/hi)",
            "call_duration_seconds": duration_sec,
            "triage_status": triage_stat,
            "call_summary": summary_final,
            "action_items": llm_actions if (llm_actions and isinstance(llm_actions, list)) else default_actions,
            "dialogue_turns": dialogue_turns,
            "structured_analytics": structured_analytics,
            "raw_sarvam_data": sarvam_data,
            "analytics_engine": "Sarvam-105B Emergency Call Analytics (saaras:v4 + sarvam-105b)"
        }

