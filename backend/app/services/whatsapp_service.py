import urllib.parse
from typing import Dict, Any, Optional
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

class WhatsAppService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.whatsapp_from = settings.WHATSAPP_FROM_NUMBER or "whatsapp:+14155238886"

    def generate_whatsapp_link(self, phone: Optional[str], message: str) -> str:
        """Generate a direct WhatsApp click-to-chat URL."""
        encoded_text = urllib.parse.quote(message)
        if phone and phone.strip():
            clean_phone = "".join(filter(str.isdigit, phone))
            if not clean_phone.startswith("91") and len(clean_phone) == 10:
                clean_phone = "91" + clean_phone
            return f"https://api.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"
        return f"https://api.whatsapp.com/send?text={encoded_text}"

    async def send_medication_reminder(
        self,
        patient_name: str,
        phone: Optional[str],
        medication_name: str,
        dosage: str,
        instructions: str = "",
        scheduled_time: str = "09:00 AM"
    ) -> Dict[str, Any]:
        """Send a WhatsApp medication reminder."""
        msg = (
            f"⏰ *MEDCARE AI: MEDICATION REMINDER*\n\n"
            f"Hello, this is a reminder for *{patient_name}*:\n\n"
            f"💊 *Medicine:* {medication_name} ({dosage})\n"
            f"🕒 *Scheduled Time:* {scheduled_time}\n"
            f"📝 *Instructions:* {instructions or 'Take as prescribed by doctor'}\n\n"
            f"Stay healthy and please confirm once taken! 🩺"
        )

        wa_link = self.generate_whatsapp_link(phone, msg)

        # If Twilio WhatsApp API credentials exist, send directly via API
        if self.account_sid and self.auth_token:
            try:
                import httpx
                clean_phone = "".join(filter(str.isdigit, phone))
                to_number = f"whatsapp:+{clean_phone}"
                auth = (self.account_sid, self.auth_token)
                async with httpx.AsyncClient() as client:
                    res = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json",
                        auth=auth,
                        data={
                            "To": to_number,
                            "From": self.whatsapp_from,
                            "Body": msg
                        }
                    )
                    if res.status_code in [200, 201]:
                        return {
                            "success": True,
                            "provider": "twilio_whatsapp",
                            "status": "delivered",
                            "whatsapp_link": wa_link,
                            "message": "WhatsApp reminder sent via API."
                        }
            except Exception as e:
                logger.warning(f"Twilio WhatsApp dispatch error: {e}")

        return {
            "success": True,
            "provider": "whatsapp_web",
            "whatsapp_link": wa_link,
            "message_text": msg,
            "status": "ready"
        }
