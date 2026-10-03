import re
from enum import Enum
from dataclasses import dataclass
from typing import Optional

class SafetySeverity(str, Enum):
    NONE = "none"
    CONCERN = "concern"
    MODERATE = "moderate"
    HIGH = "high"
    IMMEDIATE = "immediate"

DISTRESS_PATTERNS = [
    # English patterns (flexible word spacing & modifiers)
    (r"\b(help|help me|help!|save me)\b", SafetySeverity.HIGH),
    (r"\b(danger|dangerous|unsafe|not safe)\b", SafetySeverity.HIGH),
    (r"\b(scared|afraid|frightened|terrified)\b", SafetySeverity.MODERATE),
    (r"\b(someone\s+(?:is\s+)?following|being followed|stalker|following me)\b", SafetySeverity.IMMEDIATE),
    (r"\b(emergency|call 911|call 112|call 108|call 1066|call police|call ambulance)\b", SafetySeverity.IMMEDIATE),
    (r"\b(chest.{0,25}?(?:pain|tightness|pressure|discomfort)|can'?t breathe|cannot breathe|can not breathe|difficulty breathing|shortness of breath|heart attack|stroke)\b", SafetySeverity.IMMEDIATE),
    (r"\b(fell|fallen|can'?t get up|on the floor|collapsed|fainted|unconscious|passing out|losing consciousness)\b", SafetySeverity.IMMEDIATE),
    (r"\b(attack|attacked|hitting me|hurting me)\b", SafetySeverity.IMMEDIATE),
    (r"\b(i need help|need assistance|please help|severe pain|unbearable pain|arterial bleeding|massive blood loss|hemorrhagic shock)\b", SafetySeverity.HIGH),
    # Kannada patterns (ಕನ್ನಡ - flexible natural phrases)
    (r"(ಸಹಾಯ|ಕಾಪಾಡಿ|ತುರ್ತು|ಆಪತ್ತು|ಬಿದ್ದಿ|ಹೆದರಿಕೆ|ತಲೆ\s*ಸುತ್ತು)", SafetySeverity.HIGH),
    (r"(ಎದೆ.{0,20}?ನೋವು|ಹಾರ್ಟ್\s*ಅಟ್ಯಾಕ್|ಉಸಿರಾಟ|ಉಸಿರಾಡಲು|ಉಸಿರು\s*ಕಟ್ಟಿದೆ|ಪ್ರಜ್ಞೆ\s*ತಪ್ಪಿದೆ|ಸಾಯುತ್ತಿ|ಆಘಾತ)", SafetySeverity.IMMEDIATE),
    # Hindi patterns (हिन्दी - flexible natural phrases)
    (r"(मदद|बचाओ|आपातकालीन|खतरा|गिर गया|डर लग रहा|चक्कर)", SafetySeverity.HIGH),
    (r"((?:छाती|सीने|दिल).{0,25}?(?:दर्द|तकलीफ|भारीपन)|हार्ट\s*ಅटैक|सांस.{0,20}?(?:तकलीफ|दिक्कत|नहीं\s*आ\s*रही|बंद)|बेहोश|अत्यधिक\s*रक्तस್ರಾವ)", SafetySeverity.IMMEDIATE),
]

@dataclass
class SafetyAssessment:
    severity: SafetySeverity
    matched_patterns: list[str]
    requires_immediate_action: bool
    should_notify_family: bool
    should_suggest_911: bool
    calm_response: str
    record_event: bool
    target_phone: Optional[str] = None

class SafetyService:
    def is_menstrual_or_routine_query(self, text: str) -> bool:
        t = text.lower().strip()
        menstrual_terms = [
            "period", "menstrua", "menses", "cramp",
            "ovulation", "cycle", "spotting", "vaginal", "pcos", "pcod",
            "ಮುಟ್ಟ", "ಋತು", "ತಿಂಗಳ", "ಪೀರಿಯಡ್",
            "पीरियड", "मासिक", "माहवारी"
        ]
        has_menstrual = any(term in t for term in menstrual_terms)
        severe_trauma = any(w in t for w in [
            "unconscious", "collapsed", "fainted", "passing out", "heart attack", "stroke", "poison", "stab", "overdose",
            "ಪ್ರಜ್ಞೆ ತಪ್ಪಿ", "ಹಾರ್ಟ್ ಅಟ್ಯಾಕ್", "ಬೇಹೋಷ್", "दिल का दौरा"
        ])
        return has_menstrual and not severe_trauma

    def is_safety_continuation(self, message: str, conversation_history: Optional[list] = None) -> bool:
        """Check if user message is answering or continuing an active emergency safety dialogue."""
        if not conversation_history or len(conversation_history) == 0:
            return False
        
        # Check all recent messages in the last 4 turns for active emergency keywords
        recent_history = conversation_history[-4:]
        is_previous_emergency = False
        for msg in recent_history:
            c = msg.get("content", "").lower()
            if any(w in c for w in [
                "concerned about your safety", "call emergency services", "are you able to call for help",
                "alert your emergency contacts", "112 or ambulance 108", "1066", "ತುರ್ತು", "ಆಪತ್ತು", "ಆಘಾತ", "आपातकालीन",
                "phone number", "reach you", "call you right away", "emergency alert activated", "placing emergency call",
                "nausea", "chest pain", "vomiting", "dizziness", "shortness of breath"
            ]):
                is_previous_emergency = True
                break
        
        if not is_previous_emergency:
            return False

        t = message.lower().strip()
        cancel_words = ["i am fine", "false alarm", "cancel", "mistake", "feeling better", "no need", "all good", "ಚೆನ್ನಾಗಿದ್ದೇನೆ", "ಬೇಡ", "रद्द", "ठीक हूँ"]
        if any(w in t for w in cancel_words):
            return False

        return True

    def assess_safety(self, message: str, conversation_history: Optional[list] = None) -> SafetyAssessment:
        text = message.lower().strip()
        raw_digits = re.sub(r'\D', '', message)
        extracted_phone = None
        if len(raw_digits) >= 10:
            extracted_phone = f"+91{raw_digits[-10:]}"
        
        # 1. Check if this is continuing an active emergency dialogue
        if self.is_safety_continuation(message, conversation_history) or (extracted_phone and conversation_history and any("chest" in m.get("content", "").lower() or "emergency" in m.get("content", "").lower() or "call" in m.get("content", "").lower() for m in conversation_history[-4:])):
            is_kannada = any('\u0c80' <= ch <= '\u0cff' for ch in message) or (conversation_history and any(any('\u0c80' <= ch <= '\u0cff' for ch in m.get("content", "")) for m in conversation_history[-2:]))
            is_hindi = any('\u0900' <= ch <= '\u097f' for ch in message) or (conversation_history and any(any('\u0900' <= ch <= '\u097f' for ch in m.get("content", "")) for m in conversation_history[-2:]))
            
            if extracted_phone:
                if is_kannada:
                    response = f"🚨 **ತುರ್ತು ಕರೆ ಮಾಡಲಾಗುತ್ತಿದೆ**: ನಾವು ತಕ್ಷಣ **{extracted_phone}** ಸಂಖ್ಯೆಗೆ ತುರ್ತು ಕರೆಯನ್ನು ಜೋಡಿಸುತ್ತಿದ್ದೇವೆ ಮತ್ತು ತುರ್ತು ವೈದ್ಯಕೀಯ ತಂಡಕ್ಕೆ ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಕಳುಹಿಸುತ್ತಿದ್ದೇವೆ. ದಯವಿಟ್ಟು ಶಾಂತರಾಗಿರಿ, ಸಹಾಯ ಸಜ್ಜುಗೊಳಿಸಲಾಗುತ್ತಿದೆ."
                elif is_hindi:
                    response = f"🚨 **आपातकालीन कॉल डायल हो रही है**: हम तुरंत **{extracted_phone}** पर आपातकालीन कॉल कर रहे हैं और अस्पताल/पैरामेडिक टीम को मेडिकल केस भेज रहे हैं। कृपया आराम से बैठें, सहायता पहुँच रही है।"
                else:
                    response = f"🚨 **Emergency Call Placing Now**: I am placing an immediate emergency dispatch call to **{extracted_phone}** and transmitting your clinical emergency dossier to emergency responders. Please sit down comfortably, loosen tight clothing, and take slow deep breaths. Help is on the way!"
            else:
                if is_kannada:
                    response = "🚨 **ತುರ್ತು ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ**: ನಾವು ತಕ್ಷಣ ನಿಮ್ಮ ತುರ್ತು ಸಂಪರ್ಕ ವ್ಯಕ್ತಿಗಳಿಗೆ ಮತ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆಗೆ ತುರ್ತು ಕರೆ ಹಾಗೂ ಮಾಹಿತಿ ಕಳುಹಿಸುತ್ತಿದ್ದೇವೆ. ದಯವಿಟ್ಟು ಆರಾಮವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ, ಆಳವಾಗಿ ಉಸಿರಾಡಿ. ವೈದ್ಯಕೀಯ ನೆರವು ಸಜ್ಜುಗೊಳಿಸಲಾಗುತ್ತಿದೆ."
                elif is_hindi:
                    response = "🚨 **आपातकालीन अलर्ट सक्रिय**: हम तुरंत आपके आपातकालीन संपर्कों और एम्बुलेंस सेवा को कॉल व अलर्ट भेज रहे हैं। कृपया आराम से बैठ जाएं और गहरी सांस लें। सहायता तुरंत भेजी जा रही है।"
                else:
                    response = "🚨 **Emergency Alert Activated**: I am immediately dispatching emergency alerts to your designated emergency contacts and alerting nearby emergency responders for your symptoms. Please sit down comfortably, loosen tight clothing, and take slow, deep breaths. Help is being mobilized."

            return SafetyAssessment(
                severity=SafetySeverity.IMMEDIATE,
                matched_patterns=["emergency_continuation"],
                requires_immediate_action=True,
                should_notify_family=True,
                should_suggest_911=True,
                calm_response=response,
                record_event=True,
                target_phone=extracted_phone
            )

        # 2. Check if this is a normal menstrual query (periods bleeding, cramps, ovulation)
        if self.is_menstrual_or_routine_query(text):
            return SafetyAssessment(
                severity=SafetySeverity.NONE,
                matched_patterns=[],
                requires_immediate_action=False,
                should_notify_family=False,
                should_suggest_911=False,
                calm_response="",
                record_event=False,
            )

        matched = []
        highest_severity = SafetySeverity.NONE

        severity_rank = {
            SafetySeverity.NONE: 0,
            SafetySeverity.CONCERN: 1,
            SafetySeverity.MODERATE: 2,
            SafetySeverity.HIGH: 3,
            SafetySeverity.IMMEDIATE: 4,
        }

        for pattern, severity in DISTRESS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                matched.append(pattern)
                if severity_rank[severity] > severity_rank[highest_severity]:
                    highest_severity = severity

        requires_immediate = highest_severity == SafetySeverity.IMMEDIATE
        should_notify = highest_severity in [SafetySeverity.HIGH, SafetySeverity.IMMEDIATE]
        should_911 = highest_severity == SafetySeverity.IMMEDIATE
        record = highest_severity != SafetySeverity.NONE

        calm_response = self._build_calm_response(highest_severity, message)

        return SafetyAssessment(
            severity=highest_severity,
            matched_patterns=matched,
            requires_immediate_action=requires_immediate,
            should_notify_family=should_notify,
            should_suggest_911=should_911,
            calm_response=calm_response,
            record_event=record,
        )

    def _build_calm_response(self, severity: SafetySeverity, message: str = "") -> str:
        is_kannada = any('\u0c80' <= ch <= '\u0cff' for ch in message)
        is_hindi = any('\u0900' <= ch <= '\u097f' for ch in message)

        if severity == SafetySeverity.IMMEDIATE:
            if is_kannada:
                return ("ನಿಮ್ಮ ಸುರಕ್ಷತೆಯ ಬಗ್ಗೆ ನಾನು ಕಾಳಜಿ ವಹಿಸುತ್ತಿದ್ದೇನೆ. "
                        "**ದಯವಿಟ್ಟು ತಕ್ಷಣವೇ ತುರ್ತು ಸೇವೆಗಳಿಗೆ (112 ಅಥವಾ ಆಂಬ್ಯುಲೆನ್ಸ್ 108 / ಅಪೊಲೊ 1066) ಕರೆ ಮಾಡಿ.** "
                        "ನಾನು ನಿಮ್ಮ ತುರ್ತು ಸಂಪರ್ಕ ವ್ಯಕ್ತಿಗಳಿಗೂ ಎಚ್ಚರಿಕೆ ನೀಡಬಲ್ಲೆ. ನೀವು ಈಗ ಕರೆ ಮಾಡಬಹುದೇ?")
            elif is_hindi:
                return ("मैं आपकी सुरक्षा को लेकर चिंतित हूं। "
                        "**कृपया तुरंत आपातकालीन सेवाओं (112 या एम्बुलेंस 108 / अपोलो 1066) पर कॉल करें।** "
                        "मैं आपके आपातकालीन संपर्कों को भी सूचित कर सकता हूँ। क्या आप अभी कॉल करने में सक्षम हैं?")
            return ("I'm concerned about your safety right now. "
                    "**Please call emergency services (112 or Ambulance 108 / Apollo 1066) immediately if you are in danger.** "
                    "I can also alert your emergency contacts. Are you able to call for help right now?")
        elif severity == SafetySeverity.HIGH:
            if is_kannada:
                return ("ನೀವು ಕಷ್ಟಕರ ಪರಿಸ್ಥಿತಿಯಲ್ಲಿದ್ದೀರಿ ಎಂದು ತೋರುತ್ತಿದೆ. ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. "
                        "ಏನಾಗುತ್ತಿದೆ ಎಂದು ವಿವರವಾಗಿ ಹೇಳಬಲ್ಲಿರಾ? ನಾನು ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ತುರ್ತು ಸಂದೇಶ ಕಳುಹಿಸಬಲ್ಲೆ.")
            elif is_hindi:
                return ("लगता है आप किसी परेशानी में हैं। मैं आपके साथ हूँ। "
                        "क्या आप मुझे बता सकते हैं कि क्या हो रहा है? मैं आपके परिवार या आपातकालीन संपर्कों को सूचित कर सकता हूँ।")
            return ("It sounds like you might be in a difficult situation. I'm here with you. "
                    "Can you tell me more about what's happening? "
                    "I can alert your family members or emergency contacts if you need help.")
        elif severity == SafetySeverity.MODERATE:
            if is_kannada:
                return ("ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ. ನಿಮಗೆ ಈಗ ಯಾವ ರೀತಿಯ ಸಹಾಯ ಬೇಕು?")
            elif is_hindi:
                return ("मैं आपकी बात समझ रहा हूँ। आपको अभी किस प्रकार की सहायता चाहिए?")
            return ("I hear you, and I want to make sure you're okay. "
                    "You're not alone — your family members can be notified if you wish. "
                    "What would be most helpful right now?")
        elif severity == SafetySeverity.CONCERN:
            return ("I understand. I'm here to listen and help. "
                    "Would you like me to contact any of your family members or emergency contacts?")
        return ""

    def is_safety_message(self, message: str, conversation_history: Optional[list] = None) -> bool:
        assessment = self.assess_safety(message, conversation_history)
        return assessment.severity != SafetySeverity.NONE