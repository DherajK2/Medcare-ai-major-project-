from uuid import UUID
from typing import Optional
from app.services.gemini_service import GeminiService
from app.services.rag_service import RAGService
from app.services.safety_service import SafetyService, SafetySeverity
from app.services.alert_service import AlertService
from app.services.map_service import MapService
from app.utils.logger import get_logger

logger = get_logger(__name__)

def format_metric_value(val) -> str:
    if val is None:
        return ""
    try:
        f = float(val)
        if f.is_integer():
            return str(int(f))
        return f"{f:.2f}".rstrip('0').rstrip('.')
    except (ValueError, TypeError):
        return str(val)

def is_valid_metric(mtype: str, val) -> bool:
    try:
        f = float(val)
        if mtype == "temperature" and (f < 90 or f > 115):
            return False
        if mtype == "blood_glucose" and (f < 20 or f > 650):
            return False
        if mtype == "heart_rate" and (f < 30 or f > 220):
            return False
        if mtype == "oxygen_saturation" and (f < 50 or f > 100):
            return False
        if mtype == "hemoglobin" and (f < 2 or f > 25):
            return False
        return True
    except (ValueError, TypeError):
        return True

from app.services.mysuru_doctors import (
    MYSURU_DOCTORS_LIST,
    get_doctors_by_domain,
    search_doctors,
)

VERIFIED_SPECIALISTS_DIRECTORY = {}
for doc in MYSURU_DOCTORS_LIST:
    dom = doc.get("domain", "general")
    VERIFIED_SPECIALISTS_DIRECTORY.setdefault(dom, []).append({
        "name": doc["name"],
        "specialty": doc["specialty"],
        "hospital": doc["hospital"],
        "area": doc.get("city", "Mysuru"),
        "phone": doc["phone"],
        "experience": doc.get("experience", "")
    })

def detect_relevant_specialty(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["skin", "derma", "rash", "itch", "itching", "itchy", "allergy", "allergies", "hives", "acne", "eczema", "blister", "boil", "ಚರ್ಮ", "ತ್ವಚೆ", "ತುರಿಕೆ", "ಅಲರ್ಜಿ", "त्वचा", "खुजली", "एलर्जी"]):
        return "dermatology"
    if any(w in t for w in ["bone", "joint", "fracture", "knee", "knee pain", "back pain", "leg pain", "ortho", "orthopedic", "spine", "ligament", "sprain", "swollen knee", "ಮೂಳೆ", "ಕೀಲು", "ಮೊಣಕಾಲು", "ಹಳ್ಳಿ", "हड्डी", "जोड़ों", "घुटने", "घुटनों"]):
        return "orthopedics"
    if any(w in t for w in ["period", "menstrua", "menses", "cramp", "spotting", "gynec", "gynaec", "pregnancy", "pregnant", "vaginal", "pcos", "pcod", "ovary", "uterus", "ಮುಟ್ಟ", "ಋತು", "ತಿಂಗಳ", "ಪೀರಿಯಡ್", "पीरियड", "मासिक", "माहवारी"]):
        return "gynecology"
    if any(w in t for w in ["heart", "cardio", "cardiac", "chest pain", "palpitation", "bp", "blood pressure", "ಎದೆ", "ಹಾರ್ಟ್", "ಹೃದಯ", "दिल", "सीने"]):
        return "cardiology"
    if any(w in t for w in ["sugar", "diabetes", "diabetic", "glucose", "insulin", "thyroid", "endocrin", "ಶುಗರ್", "ಮಧುಮೇಹ", "शुगर", "डायबिटीज"]):
        return "diabetology"
    if any(w in t for w in ["cancer", "oncol", "tumor", "radiation oncology", "surgical oncology", "ಕ್ಯಾನ್ಸರ್", "ಗಡ್ಡೆ", "कैंसर"]):
        return "oncology"
    if any(w in t for w in ["kidney", "renal", "nephro", "dialysis", "ಮೂತ್ರಪಿಂಡ", "ಕಿಡ್ನಿ", "गुर्दे"]):
        return "nephrology"
    if any(w in t for w in ["stomach", "liver", "gastro", "digest", "hepatol", "acid", "gastric", "abdominal", "belly", "loose motion", "diarrhea", "vomit", "ಜಠರ", "ಯಕೃತ್", "ಹೊಟ್ಟೆ", "पेट", "लिवर", "दस्त", "उल्टी"]):
        return "gastroenterology"
    if any(w in t for w in ["brain", "neuro", "paralysis", "nerve", "headache", "stroke", "migraine", "dizziness", "ಮೆದುಳು", "ನರ", "ತಲೆನೋವು", "दिमाग", "नसों", "सिरदर्द"]):
        return "neurology"
    if any(w in t for w in ["child", "baby", "kid", "pediatric", "neonat", "infant", "ಮಗು", "ಮಕ್ಕಳ", "बच्चा", "शिशु"]):
        return "pediatrics"
    if any(w in t for w in ["urine", "bladder", "prostate", "urol", "burning urine", "ಮೂತ್ರ", "मूत्र"]):
        return "urology"
    if any(w in t for w in ["breath", "lung", "cough", "asthma", "pulmon", "respirat", "cold", "wheezing", "ಉಸಿರಾಟ", "ಶ್ವಾಸಕೋಶ", "ಕೆಮ್ಮು", "फेफड़े", "सांस", "खांसी"]):
        return "pulmonology"
    if any(w in t for w in ["ent", "ear", "nose", "throat", "sinus", "hearing", "earache", "sore throat", "tonsil", "ಕಿವಿ", "ಮೂಗು", "ಗಂಟಲು", "कान", "नाक", "गला"]):
        return "ent"
    if any(w in t for w in ["eye", "vision", "ophthal", "cataract", "glaucoma", "blurry", "ಕಣ್ಣು", "ಆಪ್ಟಿಕ್", "ಆಂಜನಾ", "आंखों", "मोतियाबिंद"]):
        return "ophthalmology"
    if any(w in t for w in ["mental", "depress", "anxiety", "psych", "stress", "insomnia", "sleepless", "ಮಾನಸಿಕ", "ಡಿಪ್ರೆಶನ್", "ನಿದ್ರೆ", "मानसिक", "तनाव", "नींद"]):
        return "psychiatry"
    if any(w in t for w in ["rheumat", "arthritis", "gout", "joint stiffness", "ಸಂಧಿವಾತ", "ಗಂಟು ನೋವು", "ಗೌಟ್", "गठिया"]):
        return "rheumatology"
    if any(w in t for w in ["surgery", "surgeon", "operation", "appendix", "hernia", "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ", "ಆಪರೇಷನ್", "सर्जरी"]):
        return "general_surgery"
    return "general"

class ConversationService:
    """AI Orchestrator - routes user messages to appropriate services."""

    def __init__(self, gemini: GeminiService, rag: RAGService, safety_svc: SafetyService,
                 alert_svc: AlertService, map_svc: MapService):
        self.gemini = gemini
        self.rag = rag
        self.safety = safety_svc
        self.alert_svc = alert_svc
        self.map_svc = map_svc

    async def process_message(
        self,
        message: str,
        user_id: UUID,
        patient_id: Optional[UUID],
        db,
        conversation_history: list[dict] = None,
    ) -> dict:
        # ALWAYS check safety first - deterministic check before any LLM routing (including multi-turn emergency dialogue)
        if self.safety.is_safety_message(message, conversation_history):
            assessment = self.safety.assess_safety(message, conversation_history)
            
            # Auto-trigger voice dispatch call in background if phone provided or immediate emergency
            if assessment.target_phone or (assessment.severity == SafetySeverity.IMMEDIATE and patient_id):
                try:
                    import asyncio
                    from app.services.emergency_calling_service import EmergencyCallingService
                    from app.core.dependencies import AsyncSessionLocal

                    async def run_bg_call(pid, phone, script):
                        try:
                            async with AsyncSessionLocal() as bg_db:
                                dispatch_svc = EmergencyCallingService(bg_db)
                                await dispatch_svc.initiate_voice_call(
                                    phone_number=phone or "",
                                    speech_script=script,
                                    patient_id=pid
                                )
                        except Exception as ex:
                            logger.warning(f"Background emergency voice dispatch failed: {ex}")

                    asyncio.create_task(
                        run_bg_call(
                            patient_id,
                            assessment.target_phone or "",
                            assessment.calm_response
                        )
                    )
                except Exception as call_err:
                    logger.warning(f"Auto voice dispatch call trigger error: {call_err}")

            return {
                "answer": assessment.calm_response,
                "sources": [],
                "intent": "safety_concern",
                "is_safety_response": True,
                "safety_severity": assessment.severity.value,
                "should_notify_family": assessment.should_notify_family,
                "should_suggest_911": assessment.should_suggest_911,
                "target_phone": assessment.target_phone,
            }

        # Clean, concise greetings - DO NOT dump patient medical charts or specialist directories unsolicited
        q_lower = message.lower().strip()
        is_greeting = q_lower in [
            'hi', 'hello', 'hey', 'hey there', 'hi there', 'namaste', 'namaskara', 'namaskar',
            'good morning', 'good afternoon', 'good evening', 'how are you', 'howdy',
            'ನಮಸ್ಕಾರ', 'ಹಲೋ', 'ಹಾಯ್',
            'नमस्ते', 'नमस्कार', 'हेलो', 'हाय'
        ] or q_lower == 'hi' or q_lower == 'hello' or q_lower.startswith('hi ') or q_lower.startswith('hello ')

        is_kn = any('\u0c80' <= ch <= '\u0cff' for ch in message) or any(w in message.lower() for w in ['kannada', 'aushadha', 'samaya', 'tilisi', 'mathe', 'namaskara', 'nanna', 'nimage', 'yaru'])
        is_hi = any('\u0900' <= ch <= '\u097f' for ch in message) or any(w in message.lower() for w in ['hindi', 'dawai', 'davai', 'batao', 'saransh', 'kya', 'kaun', 'hai'])

        if is_greeting and not any(w in q_lower for w in ['pain', 'sugar', 'bp', 'doctor', 'medicine', 'report', 'vital', 'emergency', 'help', 'chest', 'symptom']):
            if is_kn:
                return {
                    "answer": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ MedCare AI ವೈದ್ಯಕೀಯ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನಿಮ್ಮ ಆರೋಗ್ಯ, ಔಷಧಿಗಳು, ಅಥವಾ ವೈದ್ಯರ ವಿವರಗಳ ಬಗ್ಗೆ ನೀವು ಕೇಳಬಹುದು.",
                    "sources": [],
                    "intent": "greeting",
                    "is_safety_response": False
                }
            elif is_hi:
                return {
                    "answer": "नमस्ते! मैं आपका MedCare AI मेडिकल असिस्टेंट हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ? आप मुझसे दवाओं, हालिया रिपोर्ट्स या स्वास्थ्य संबंधी प्रश्नों के बारे में पूछ सकते हैं।",
                    "sources": [],
                    "intent": "greeting",
                    "is_safety_response": False
                }
            else:
                return {
                    "answer": "Hello! I am your MedCare AI assistant. How can I help you today? You can ask me about your medications, lab reports, health questions, or find verified specialists in Mysuru.",
                    "sources": [],
                    "intent": "greeting",
                    "is_safety_response": False
                }

        # Classify intent
        intent = await self.gemini.classify_intent(message)

        # Build real clinical context for the patient from DB
        patient_context_lines = []
        p_obj = None
        active_meds = []
        patient_metrics = []
        attending_docs = []
        uploaded_docs = []

        if patient_id and db:
            try:
                from sqlalchemy import select
                from app.models.patient import Patient
                from app.models.medication import Medication
                from app.models.health import HealthMetric
                from app.models.document import MedicalDocument
                from app.models.user import Doctor

                p_obj = await db.get(Patient, patient_id)
                if p_obj:
                    dob_str = str(p_obj.date_of_birth) if p_obj.date_of_birth else "N/A"
                    patient_context_lines.append(f"PATIENT: {p_obj.first_name} {p_obj.last_name}, DOB: {dob_str}, Gender: {p_obj.gender or 'N/A'}, Address: {p_obj.address or 'N/A'}")
                    if p_obj.medical_notes:
                        patient_context_lines.append(f"CLINICAL NOTES / DIAGNOSIS: {p_obj.medical_notes}")
                    
                    # Allergies
                    raw_allergies = p_obj.allergies if p_obj.allergies else []
                    if isinstance(raw_allergies, str):
                        allergies_list = [a.strip() for a in raw_allergies.split(",") if a.strip()]
                    elif isinstance(raw_allergies, list):
                        allergies_list = [str(a).strip() for a in raw_allergies if str(a).strip()]
                    else:
                        allergies_list = []
                    
                    if allergies_list:
                        patient_context_lines.append(f"KNOWN DRUG ALLERGIES: {', '.join(allergies_list)}")
                    else:
                        patient_context_lines.append("KNOWN DRUG ALLERGIES: None recorded")

                # Medications
                meds_res = await db.execute(select(Medication).where(Medication.patient_id == patient_id, Medication.is_active == True))
                active_meds = list(meds_res.scalars().all())
                if active_meds:
                    med_list = [f"- {m.name} ({m.dosage}): {m.frequency}, Route: {m.route or 'oral'}, Instructions: {m.instructions or 'None'}" for m in active_meds]
                    patient_context_lines.append("ACTIVE PRESCRIBED MEDICATIONS:\n" + "\n".join(med_list))

                # Latest Vitals / Health Metrics (filtered for realistic physiological values)
                metrics_res = await db.execute(select(HealthMetric).where(HealthMetric.patient_id == patient_id))
                raw_metrics = list(metrics_res.scalars().all())
                patient_metrics = [m for m in raw_metrics if is_valid_metric(m.metric_type, m.latest_value)]
                
                if patient_metrics:
                    metric_list = [f"- {m.metric_type}: {format_metric_value(m.latest_value)} {m.latest_unit or ''} (Trend: {m.trend_direction or 'stable'})" for m in patient_metrics]
                    patient_context_lines.append("LATEST VITALS & METRICS:\n" + "\n".join(metric_list))

                # Doctors
                docs_res = await db.execute(select(Doctor).where(Doctor.patient_id == patient_id))
                attending_docs = list(docs_res.scalars().all())
                if attending_docs:
                    doc_list = [f"- {d.name} ({d.specialty} at {d.hospital or 'Hospital'}, Phone: {d.phone or 'N/A'})" for d in attending_docs]
                    patient_context_lines.append("REGISTERED ATTENDING DOCTORS:\n" + "\n".join(doc_list))

                # Uploaded Medical Documents
                docs_res2 = await db.execute(select(MedicalDocument).where(MedicalDocument.patient_id == patient_id).order_by(MedicalDocument.created_at.desc()).limit(3))
                uploaded_docs = list(docs_res2.scalars().all())
                if uploaded_docs:
                    doc_snippets = []
                    for doc in uploaded_docs:
                        snippet = f"Document: {doc.file_name} ({doc.document_type})\nExtracted Data: {doc.extracted_data}"
                        if doc.extracted_text:
                            snippet += f"\nKey Text: {doc.extracted_text[:400]}"
                        doc_snippets.append(snippet)
                    patient_context_lines.append("RECENT MEDICAL DOCUMENTS:\n" + "\n\n".join(doc_snippets))
            except Exception as e:
                logger.warning(f"Failed to fetch clinical context for AI: {e}")

        # Add verified Mysuru doctors & specialists directory to context
        specialists_context = []
        for domain, docs in VERIFIED_SPECIALISTS_DIRECTORY.items():
            specialists_context.append(f"[{domain.upper()} SPECIALISTS]:")
            for d in docs:
                specialists_context.append(f"  • {d['name']} — {d['specialty']} | {d['hospital']}, {d['area']} (Phone: {d['phone']})")
        patient_context_lines.append("VERIFIED MYSURU SPECIALISTS DIRECTORY:\n" + "\n".join(specialists_context))

        clinical_context_block = "\n\n".join(patient_context_lines) if patient_context_lines else "No historical records."

        if intent == "map_request":
            return {
                "answer": "I can help you locate nearby Indian hospitals, emergency trauma wings, and 24x7 pharmacies. Please check the Healthcare Facilities Map in your navigation.",
                "sources": [],
                "intent": intent,
                "is_safety_response": False,
            }

        # Prompt Gemini with complete real-time clinical context
        history_text = ""
        if conversation_history:
            for msg in conversation_history[-6:]:
                history_text += f"{msg['role'].capitalize()}: {msg['content']}\n"

        prompt = f"""You are an intelligent, compassionate AI Medical Assistant for a family health monitoring platform.
You are conversing with a patient or family caregiver.
Answer their question accurately and concisely based on their actual medical records and clinical context provided below.

REAL PATIENT MEDICAL RECORD CONTEXT:
\"\"\"
{clinical_context_block}
\"\"\"

Conversation history:
{history_text}
User question: {message}

CRITICAL RULES:
1. NO INTERNAL MONOLOGUE OR META-REASONING: Output ONLY the direct patient-facing response. NEVER output preambles or thoughts like "Since the user said...", "Given the context...", "I will respond in...".
2. STAY DIRECT AND ON-TOPIC:
   - For simple greetings ("hi", "hello"), reply with a short, warm greeting and ask how you can help. DO NOT dump unrequested summaries or specialist lists.
   - ONLY recommend specialists or quote lab tests if the user's current message specifically asks about them or mentions related symptoms.
3. LANGUAGE MATCHING: Respond in the EXACT same language and script as the user (Kannada ಕನ್ನಡ, Hindi हिन्दी, or English).

Assistant Answer:"""

        try:
            import re
            answer = await self.gemini.generate(prompt)
            if answer and len(answer.strip()) > 10:
                cleaned_answer = re.sub(r'^(Since the user|Given the context|Based on the instructions|Here is the response|In English,|In Kannada,|In Hindi,).*?\n\n', '', answer.strip(), flags=re.DOTALL | re.IGNORECASE).strip()
                return {
                    "answer": cleaned_answer or answer.strip(),
                    "sources": [],
                    "intent": intent,
                    "is_safety_response": False,
                }
        except Exception as e:
            logger.warning(f"Gemini generation fallback engaged: {e}")

        # Combine current query with recent dialogue history for accurate context awareness
        combined_text = message
        if conversation_history:
            for h in conversation_history[-4:]:
                combined_text += " " + str(h.get("content", ""))

        q_lower = message.lower().strip()
        combined_lower = combined_text.lower().strip()

        # Affirmative follow-up detection (e.g. "yes", "sure", "suggest", "tell me")
        is_affirmative = q_lower in [
            'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please', 'yes please', 'suggest', 'tell me', 'show me', 'who', 'doctors', 'which doctor', 'recommend',
            'ಹೌದು', 'ತಿಳಿಸಿ', 'ಖಂಡಿತ', 'ತೋರಿಸಿ', 'ಯಾವ ವೈದ್ಯರು', 'ಹೌದು ತಿಳಿಸಿ',
            'हाँ', 'हां', 'बताओ', 'अवश्य', 'कौन से डॉक्टर', 'हाँ बताओ', 'जी हाँ'
        ]

        # Greeting detection (never trigger greeting if affirmative or symptom follow-up)
        is_greeting = not is_affirmative and (q_lower in [
            'hi', 'hello', 'hey', 'hey there', 'hi there', 'namaste', 'namaskara', 'namaskar',
            'good morning', 'good afternoon', 'good evening', 'how are you', 'howdy',
            'ನಮಸ್ಕಾರ', 'ಹಲೋ', 'ಹಾಯ್',
            'नमस्ते', 'नमस्कार', 'हेलो', 'हाय'
        ] or q_lower.startswith('hi ') or q_lower.startswith('hello '))

        # Specific Query Intent Detection
        is_allergy_query = any(w in combined_lower for w in [
            'allergy', 'allergies', 'allergic', 'alery', 'alergy', 'alergi', 'allergi', 'contraindication', 'reaction',
            'ಅಲರ್ಜಿ', 'ಪ್ರತಿಕೂಲ',
            'एलर्जी', 'अलर्जी'
        ]) and any(w in q_lower for w in ['allergy', 'allergies', 'what is', 'allergic', 'reaction', 'drug', 'medicine'])

        is_doctor_query = is_affirmative or any(w in q_lower for w in [
            'doctor', 'physician', 'specialist', 'consultant', 'dr', 'dr.', 'who is my doctor', 'who is the doctor',
            'suggest', 'visit', 'recommend', 'who can i visit', 'which doctor', 'hospital for', 'clinic for',
            'ವೈದ್ಯ', 'ಡಾಕ್ಟರ್', 'ತಜ್ಞ', 'ಭೇಟಿ',
            'डॉक्टर', 'चिकित्सक', 'विशेषज्ञ', 'दिखाऊं'
        ])

        is_med_query = not is_allergy_query and any(w in q_lower for w in [
            'medication', 'medicine', 'drug', 'dose', 'schedule', 'timing', 'pill', 'tablet', 'prescription',
            'ಔಷಧ', 'ಮಾತ್ರೆ', 'ಸಮಯ',
            'दवा', 'खुराक', 'गोली', 'दवाइयां'
        ])
        is_report_query = any(w in q_lower for w in [
            'report', 'summary', 'diagnosis', 'discharge', 'hospital', 'condition', 'disease',
            'suffered', 'suffer', 'happen', 'happened', 'history', 'illness', 'problem', 'issue',
            'what did', 'what does', 'what is wrong', 'what was', 'what had', 'how is', 'status',
            'ಸಾರಾಂಶ', 'ವರದಿ', 'ರೋಗನಿರ್ಣಯ', 'ಆಸ್ಪತ್ರೆ', 'ವಿವರ', 'ಕಾಯಿಲೆ', 'ತೊಂದರೆ', 'ಏನಾಗಿದೆ', 'ಆಗಿದೆ', 'ಹೇಗಿದ್ದಾರೆ', 'ಅಪ್ಪ', 'ಅಮ್ಮ', 'ಆರೋಗ್ಯ',
            'रिपोर्ट', 'सारांश', 'निदान', 'बीमारी', 'अस्पताल', 'क्या हुआ', 'तबीयत', 'परेशानी', 'पिताजी', 'माताजी', 'हाल'
        ])
        is_vital_query = any(w in q_lower for w in [
            'vital', 'vitals', 'bp', 'blood pressure', 'glucose', 'sugar', 'heart', 'pulse', 'temp', 'temperature', 'spo2', 'oxygen',
            'ಜ್ವರ', 'ರಕ್ತದೊತ್ತಡ', 'ಬಿಪಿ', 'ರಕ್ತ', 'ನಾಡಿ',
            'तापमान', 'रक्तचाप', 'बीपी', 'शुगर', 'नाड़ी'
        ])

        p_name = f"{p_obj.first_name} {p_obj.last_name}" if p_obj else "Patient"
        p_notes = p_obj.medical_notes if (p_obj and p_obj.medical_notes) else "Clinical assessment and routine monitoring active."
        
        # Allergies
        raw_allergies = p_obj.allergies if (p_obj and p_obj.allergies) else []
        if isinstance(raw_allergies, str):
            allergies_list = [a.strip() for a in raw_allergies.split(",") if a.strip()]
        elif isinstance(raw_allergies, list):
            allergies_list = [str(a).strip() for a in raw_allergies if str(a).strip()]
        else:
            allergies_list = []

        # Primary Doctor
        primary_doc = attending_docs[0] if attending_docs else None
        doc_name_str = primary_doc.name if primary_doc else "your attending physician"
        hospital_str = primary_doc.hospital if (primary_doc and primary_doc.hospital) else "Hospital"

        # Extracted Diagnosis from Document or Notes
        doc_diag = None
        if uploaded_docs:
            extracted = uploaded_docs[0].extracted_data or {}
            doc_diag = extracted.get('diagnosis') or extracted.get('summary')
        diag_summary = doc_diag or p_notes

        # Detect specialty from combined context (current query + history)
        detected_spec = detect_relevant_specialty(combined_text)
        spec_docs = search_doctors(combined_text, limit=5) or get_doctors_by_domain(detected_spec, limit=5) or get_doctors_by_domain("general", limit=5)

        # Check for period / menstrual symptoms
        is_menstrual_query = any(w in combined_lower for w in [
            "period", "periods", "menstrua", "menses", "cramp", "cramps", "spotting", "bleeding in periods", "periods bleeding",
            "heavy period", "gynec", "gynaec", "pcos", "pcod", "ಮುಟ್ಟು", "ಋತುಸ್ರಾವ", "ತಿಂಗಳ ಮುಟ್ಟು", "ಮುಟ್ಟಿನ ರಕ್ತಸ್ರಾವ",
            "पीरियड्स", "मासिक धर्म", "माहवारी", "पीरियड में ब್ಲೀಡಿಂಗ್", "मासिक स्राव"
        ])

        # Specialty title maps
        spec_display_en = {
            "orthopedics": "Orthopedics & Joint Care",
            "dermatology": "Dermatology & Skin Care",
            "cardiology": "Cardiology & Heart Specialists",
            "gynecology": "Obstetrics & Gynaecology",
            "neurology": "Neurology & Brain/Spine",
            "gastroenterology": "Gastroenterology & Digestive Health",
            "pulmonology": "Pulmonology & Respiratory Care",
            "ent": "ENT (Ear, Nose & Throat)",
            "ophthalmology": "Ophthalmology & Eye Care",
            "pediatrics": "Pediatrics & Child Care",
            "diabetology": "Endocrinology & Diabetology",
            "nephrology": "Nephrology & Kidney Care",
            "urology": "Urology",
            "psychiatry": "Psychiatry & Mental Wellness",
            "rheumatology": "Rheumatology & Arthritis",
            "general_surgery": "General & Laparoscopic Surgery"
        }.get(detected_spec, "Verified Medical Specialists")

        if is_kn:
            # Dynamic Kannada response
            if is_greeting:
                answer = f"ನಮಸ್ಕಾರ! ನಾನು **{p_name}** ಅವರ MedCare AI ವೈದ್ಯಕೀಯ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನೀವು ಇತ್ತೀಚಿನ ಲ್ಯಾಬ್ ವರದಿಗಳು, ಔಷಧಿಗಳು, ಅಥವಾ ಆರೋಗ್ಯ ವಿವರಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು."
            elif is_doctor_query or is_menstrual_query or detected_spec != "general":
                doc_lines = "\n".join([f"• **{d['name']}** — {d['specialty']} | {d['hospital']}, {d.get('area') or d.get('city') or 'Mysuru'} (Phone: {d['phone']})" for d in spec_docs[:4]])
                
                if detected_spec == "orthopedics":
                    care_kn = "**ಮೊಣಕಾಲು / ಕೀಲು ನೋವಿಗೆ ಸಲಹೆ**: ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ, ತಕ್ಷಣದ ನೋವು ಶಮನಕ್ಕೆ ಐಸ್ ಪ್ಯಾಕ್ ಇಡಿ. ಭಾರ ಹೊರುವುದು ಅಥವಾ ಅತಿಯಾಗಿ ಬಗ್ಗುವುದನ್ನು ತಪ್ಪಿಸಿ."
                elif detected_spec == "dermatology":
                    care_kn = "**ಚರ್ಮ / ಅಲರ್ಜಿ ತುರಿಕೆಗೆ ಸಲಹೆ**: ಚರ್ಮವನ್ನು ಕೆರೆಯಬೇಡಿ, ತಂಪಾದ ನೀರಿನ ಶಾಖ ನೀಡಿ. ತೀವ್ರ ತುರಿಕೆಗೆ ತಜ್ಞರ ಸಲಹೆ ಪಡೆಯಿರಿ."
                else:
                    care_kn = "**ಆರೋಗ್ಯ ಸಲಹೆ**: ಸೂಕ್ತ ತಪಾಸಣೆಗಾಗಿ ತಜ್ಞ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."

                answer = (
                    f"ಮೈಸೂರಿನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಪ್ರಮುಖ **{spec_display_en}** ತಜ್ಞ ವೈದ್ಯರು:\n\n"
                    f"{doc_lines}\n\n"
                    f"{care_kn}\n\n"
                    f"ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಾಗಿ ಮೇಲೆ ನೀಡಿರುವ ದೂರವಾಣಿ ಸಂಖ್ಯೆಗಳಿಗೆ ನೇರವಾಗಿ ಕರೆ ಮಾಡಬಹುದು."
                )
            elif is_allergy_query:
                if allergies_list:
                    answer = (
                        f"**{p_name} ಅವರ ತಿಳಿದಿರುವ ಔಷಧಿ ಅಲರ್ಜಿಗಳು:**\n"
                        f"• **{', '.join(allergies_list)}**\n\n"
                        f"ಯಾವುದೇ ಹೊಸ ಔಷಧಿ ಅಥವಾ ಪ್ರತಿಜೀವಕಗಳನ್ನು ನೀಡುವ ಮುನ್ನ ದಯವಿಟ್ಟು ವೈದ್ಯರಿಗೆ ಈ ಅಲರ್ಜಿ ಬಗ್ಗೆ ತಿಳಿಸಿ."
                    )
                else:
                    answer = f"**{p_name}** ಅವರ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳಲ್ಲಿ ಯಾವುದೇ ತಿಳಿದಿರುವ ಔಷಧಿ ಅಲರ್ಜಿಗಳು ದಾಖಲಾಗಿಲ್ಲ."
            elif is_med_query:
                if active_meds:
                    lines = [f"**{p_name} ಅವರ ಪ್ರಸ್ತುತ ಸಕ್ರಿಯ ಔಷಧಿಗಳು ಮತ್ತು ವೇಳಾಪಟ್ಟಿ:**\n"]
                    for idx, m in enumerate(active_meds, 1):
                        lines.append(f"{idx}. **{m.name} ({m.dosage or ''})**: {m.frequency} ({m.instructions or m.route or 'ಸೂಚಿಸಿದಂತೆ'}).")
                    lines.append(f"\nವೈದ್ಯರಾದ **{doc_name_str}** ({hospital_str}) ಅವರ ಸಲಹೆಯಂತೆ ಮುಂದುವರಿಸಿ.")
                    answer = "\n".join(lines)
                else:
                    answer = f"**{p_name}** ಅವರಿಗೆ ಪ್ರಸ್ತುತ ಯಾವುದೇ ಸಕ್ರಿಯ ಔಷಧಿಗಳನ್ನು ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ. ಹೊಸ ವೈದ್ಯಕೀಯ ವರದಿಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿದರೆ ಔಷಧಿಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನವೀಕರಣಗೊಳ್ಳುತ್ತವೆ."
            elif is_report_query:
                lines = [
                    f"**{p_name} ಅವರ ಆರೋಗ್ಯ ಮತ್ತು ವೈದ್ಯಕೀಯ ವಿವರ:**\n",
                    f"• **ರೋಗನಿರ್ಣಯ / ಸ್ಥಿತಿ**: {diag_summary}",
                    f"• **ಸಲಹೆಗಾರ ವೈದ್ಯರು**: {doc_name_str} ({hospital_str})",
                ]
                if patient_metrics:
                    vitals_str = ", ".join(f"{m.metric_type.replace('_',' ').title()}: {format_metric_value(m.latest_value)} {m.latest_unit or ''}" for m in patient_metrics[:3])
                    lines.append(f"• **ಇತ್ತೀಚಿನ Vitals**: {vitals_str}")
                if active_meds:
                    lines.append(f"• **ಸೂಚಿಸಲಾದ ಔಷಧಿಗಳು**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
            elif is_vital_query:
                if patient_metrics:
                    lines = [f"**{p_name} ಅವರ ಇತ್ತೀಚಿನ ಆರೋಗ್ಯ ಅಂಕಿಅಂಶಗಳು (Vitals):**\n"]
                    for m in patient_metrics:
                        lines.append(f"• **{m.metric_type.replace('_', ' ').title()}**: {format_metric_value(m.latest_value)} {m.latest_unit or ''} (ಸ್ಥಿತಿ: {m.trend_direction or 'ಸ್ಥಿರ'})")
                    answer = "\n".join(lines)
                else:
                    answer = f"**{p_name}** ಅವರ ಇತ್ತೀಚಿನ ಪ್ರಮುಖ ಅಂಕಿಅಂಶಗಳು (Vitals) ಸಾಮಾನ್ಯವಾಗಿವೆ."
            else:
                lines = [
                    f"**{p_name} ಅವರ ಪ್ರಸ್ತುತ ಆರೋಗ್ಯ ಸಾರಾಂಶ:**\n",
                    f"• **ಸ್ಥಿತಿ ಮತ್ತು ರೋಗನಿರ್ಣಯ**: {diag_summary}",
                    f"• **ಸಲಹೆಗಾರ ವೈದ್ಯರು**: {doc_name_str} ({hospital_str})",
                ]
                if active_meds:
                    lines.append(f"• **ಸಕ್ರಿಯ ಔಷಧಿಗಳು**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
        elif is_hi:
            # Dynamic Hindi response
            if is_greeting:
                answer = f"नमस्ते! मैं **{p_name}** का MedCare AI मेडिकल असिस्टेंट हूँ। आज मैं आपकी क्या मदद कर सकता हूँ? आप मुझसे दवाओं के समय, हालिया लैब रिपोर्ट्स, वाइटल्स या स्वास्थ्य सलाह के बारे में पूछ सकते हैं।"
            elif is_doctor_query or is_menstrual_query or detected_spec != "general":
                doc_lines = "\n".join([f"• **{d['name']}** — {d['specialty']} | {d['hospital']}, {d.get('area') or d.get('city') or 'Mysuru'} (Phone: {d['phone']})" for d in spec_docs[:4]])
                
                if detected_spec == "orthopedics":
                    care_hi = "**घुटने / जोड़ों के दर्द के लिए सलाह**: जोड़ पर अधिक दबाव न डालें, 15-20 मिनट के लिए बर्फ की सिकाई (Ice pack) करें और भारी झुकने या सीढ़ियां चढ़ने से बचें।"
                elif detected_spec == "dermatology":
                    care_hi = "**त्वचा / खुजली के लिए सलाह**: त्वचा को खुजलाने से बचें, ठंडी सिकाई करें और सुगंधित साबुनों का प्रयोग न करें।"
                else:
                    care_hi = "**स्वास्थ्य सलाह**: उचित जांच व उपचार के लिए विशेषज्ञ डॉक्टर से परामर्श लें।"

                answer = (
                    f"मैसूर में उपलब्ध प्रमुख **{spec_display_en}** विशेषज्ञ डॉक्टर:\n\n"
                    f"{doc_lines}\n\n"
                    f"{care_hi}\n\n"
                    f"परामर्श या अपॉइंटमेंट के लिए आप ऊपर दिए गए नंबरों पर सीधे संपर्क कर सकते हैं।"
                )
            elif is_allergy_query:
                if allergies_list:
                    answer = (
                        f"**{p_name} की ज्ञात दवा एलर्जी (Allergies):**\n"
                        f"• **{', '.join(allergies_list)}**\n\n"
                        f"कृपया कोई भी नई दवा या एंटीबायोटिक लेने से पहले डॉक्टर या फार्मासिस्ट को इस एलर्जी के बारे में अवश्य सूचित करें।"
                    )
                else:
                    answer = f"**{p_name}** के मेडिकल रिकॉर्ड में कोई ज्ञात दवा एलर्जी दर्ज नहीं है।"
            elif is_med_query:
                if active_meds:
                    lines = [f"**{p_name} की वर्तमान में सक्रिय दवाइयां और समय सारणी:**\n"]
                    for idx, m in enumerate(active_meds, 1):
                        lines.append(f"{idx}. **{m.name} ({m.dosage or ''})**: {m.frequency} ({m.instructions or m.route or 'निर्देशानुसार'})।")
                    lines.append(f"\nकृपया चिकित्सक **{doc_name_str}** ({hospital_str}) के परामर्श अनुसार नियमित दवाएं लें।")
                    answer = "\n".join(lines)
                else:
                    answer = f"**{p_name}** के लिए वर्तमान में कोई सक्रिय दवा दर्ज नहीं है। नई मेडिकल रिपोर्ट अपलोड करने पर दवाएं अपने आप जुड़ जाएंगी।"
            elif is_report_query:
                lines = [
                    f"**{p_name} की स्वास्थ्य स्थिति और मेडिकल रिपोर्ट:**\n",
                    f"• **निदान और स्थिति**: {diag_summary}",
                    f"• **परामर्शदाता डॉक्टर**: {doc_name_str} ({hospital_str})",
                ]
                if patient_metrics:
                    vitals_str = ", ".join(f"{m.metric_type.replace('_',' ').title()}: {format_metric_value(m.latest_value)} {m.latest_unit or ''}" for m in patient_metrics[:3])
                    lines.append(f"• **हालिया Vitals**: {vitals_str}")
                if active_meds:
                    lines.append(f"• **निर्धारित दवाएं**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
            elif is_vital_query:
                if patient_metrics:
                    lines = [f"**{p_name} के नवीनतम स्वास्थ्य पैरामीटर (Vitals):**\n"]
                    for m in patient_metrics:
                        lines.append(f"• **{m.metric_type.replace('_', ' ').title()}**: {format_metric_value(m.latest_value)} {m.latest_unit or ''} (स्थिति: {m.trend_direction or 'स्थिर'})")
                    answer = "\n".join(lines)
                else:
                    answer = f"**{p_name}** के नवीनतम स्वास्थ्य पैरामीटर सामान्य हैं।"
            else:
                lines = [
                    f"**{p_name} का वर्तमान स्वास्थ्य सारांश:**\n",
                    f"• **निदान और स्थिति**: {diag_summary}",
                    f"• **परामर्शदाता डॉक्टर**: {doc_name_str} ({hospital_str})",
                ]
                if active_meds:
                    lines.append(f"• **सक्रिय दवाएं**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
        else:
            # Dynamic English response
            if is_greeting:
                answer = f"Hello! I am your MedCare AI clinical assistant for **{p_name}**. How can I help you today? You can ask me about medications, recent lab reports, vital trends, or find verified specialists in Mysuru."
            elif is_doctor_query or is_menstrual_query or detected_spec != "general":
                doc_lines = "\n".join([f"• **{d['name']}** — {d['specialty']} | {d['hospital']}, {d.get('area') or d.get('city') or 'Mysuru'} (Phone: {d['phone']})" for d in spec_docs[:4]])
                
                if detected_spec == "orthopedics":
                    care_en = "**Care Guidance for Knee / Joint Pain**: Rest the leg, apply an ice pack wrapped in a towel for 15–20 minutes to relieve inflammation, and avoid strenuous walking, stairs, or deep knee bending."
                elif detected_spec == "dermatology":
                    care_en = "**Care Guidance for Skin Allergies & Itching**: Avoid scratching to protect skin integrity, apply a cool damp compress, avoid perfumed soaps or hot showers, and seek medical advice if swelling, hives, or redness worsens."
                elif detected_spec == "gynecology":
                    care_en = "**Care Guidance**: Stay well-hydrated, rest, and use a warm compress for cramps."
                elif detected_spec == "cardiology":
                    care_en = "**Cardiology Notice**: If you experience severe chest heaviness, shortness of breath, or sweating, immediately connect with emergency trauma services (112 / 108 / 1066)."
                else:
                    care_en = "**Clinical Guidance**: Please consult the verified specialist above for clinical diagnosis and customized treatment."

                answer = (
                    f"Here are top verified **{spec_display_en}** in Mysuru you can consult:\n\n"
                    f"{doc_lines}\n\n"
                    f"{care_en}\n\n"
                    f"You can contact any of the clinics or hospital departments directly at the numbers listed above for appointment scheduling."
                )
            elif is_allergy_query:
                if allergies_list:
                    answer = (
                        f"**Known Drug Allergies for {p_name}:**\n"
                        f"• **{', '.join(allergies_list)}**\n\n"
                        f"Please ensure treating physicians, nurses, and pharmacists are informed of this allergy before administering any related medications or antibiotics."
                    )
                else:
                    answer = f"**No known drug allergies** are recorded in the medical profile for **{p_name}**. If they have developed any adverse reactions or sensitivities, you can update their profile in the Patients directory."
            elif is_med_query:
                if active_meds:
                    lines = [f"**Active Prescribed Medications & Schedule for {p_name}:**\n"]
                    for idx, m in enumerate(active_meds, 1):
                        lines.append(f"{idx}. **{m.name} ({m.dosage or ''})**: {m.frequency} ({m.instructions or m.route or 'as directed'})")
                    lines.append(f"\nPrescribed by **{doc_name_str}** ({hospital_str}). Please adhere to the physician's instructions.")
                    answer = "\n".join(lines)
                else:
                    answer = f"There are currently no active medications on file for **{p_name}**. Uploading a medical report or prescription will automatically populate their medication list."
            elif is_report_query:
                lines = [
                    f"**Medical Report & Clinical Summary for {p_name}:**\n",
                    f"• **Patient**: {p_name}",
                    f"• **Diagnosis / Clinical Summary**: {diag_summary}",
                    f"• **Attending Physician**: {doc_name_str} ({hospital_str})",
                ]
                if active_meds:
                    lines.append(f"• **Active Prescriptions**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
            elif is_vital_query:
                if patient_metrics:
                    lines = [f"**Latest Recorded Health Metrics for {p_name}:**\n"]
                    for m in patient_metrics:
                        lines.append(f"• **{m.metric_type.replace('_', ' ').title()}**: {format_metric_value(m.latest_value)} {m.latest_unit or ''} (Trend: {m.trend_direction or 'stable'})")
                    answer = "\n".join(lines)
                else:
                    answer = f"The latest recorded vital signs and physiological metrics for **{p_name}** are within normal ranges."
            else:
                lines = [
                    f"**Current Health Summary for {p_name}:**\n",
                    f"• **Clinical Status**: {diag_summary}",
                    f"• **Attending Physician**: {doc_name_str} ({hospital_str})",
                ]
                if active_meds:
                    lines.append(f"• **Active Medications**: {', '.join(m.name for m in active_meds)}")
                answer = "\n".join(lines)
        return {
            "answer": answer,
            "sources": [],
            "intent": intent,
            "is_safety_response": False,
        }
