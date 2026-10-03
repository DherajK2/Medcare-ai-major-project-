import pytest
from app.services.safety_service import SafetyService, SafetySeverity

class TestSafetyService:
    def test_immediate_danger_detected(self):
        svc = SafetyService()
        assessment = svc.assess_safety("Someone is following me and I need help")
        assert assessment.severity == SafetySeverity.IMMEDIATE
        assert assessment.requires_immediate_action == True
        assert assessment.should_suggest_911 == True

    def test_chest_pain_immediate(self):
        svc = SafetyService()
        assessment = svc.assess_safety("I have severe chest pain and can't breathe")
        assert assessment.severity == SafetySeverity.IMMEDIATE

    def test_scared_moderate(self):
        svc = SafetyService()
        assessment = svc.assess_safety("I'm feeling scared")
        assert assessment.severity in [SafetySeverity.MODERATE, SafetySeverity.HIGH]

    def test_normal_message_safe(self):
        svc = SafetyService()
        assessment = svc.assess_safety("What was my blood pressure yesterday?")
        assert assessment.severity == SafetySeverity.NONE
        assert assessment.requires_immediate_action == False

    def test_is_safety_message(self):
        svc = SafetyService()
        assert svc.is_safety_message("I need help right now") == True
        assert svc.is_safety_message("What medications am I taking?") == False

    def test_calm_response_generated(self):
        svc = SafetyService()
        assessment = svc.assess_safety("I need help")
        assert len(assessment.calm_response) > 0
        # Response should never claim the AI can physically help
        assert "physically" not in assessment.calm_response.lower() or "rescue" not in assessment.calm_response.lower()
