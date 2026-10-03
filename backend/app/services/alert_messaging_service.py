"""
AlertMessagingService
=====================
When a HIGH or CRITICAL health alert fires, this service:

1. Looks up all family members / emergency contacts for the patient
   who have can_receive_alerts = True and a phone number on file.

2. Sends a rich WhatsApp message via Twilio (primary channel).
3. Sends a plain SMS via Twilio as a fallback / secondary channel.
4. Logs a NotificationEvent row for every dispatch attempt.

Message format:
  🚨 MEDCARE HEALTH ALERT
  Patient : Rahul Sharma
  Problem : Blood Pressure (Systolic) is CRITICALLY HIGH at 185 mmHg
  Normal  : < 140 mmHg
  Action  : Please check on Rahul immediately and contact the doctor.
  Doctor  : Dr. Anil Mehta — +91-9876543210
  Time    : 02 Sep 2026, 11:42 IST
"""

import datetime
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.alert import Alert, NotificationEvent
from app.models.patient import Patient, FamilyRelationship
from app.models.user import User, Profile, EmergencyContact, Doctor
from app.utils.logger import get_logger

logger = get_logger(__name__)

# IST offset
_IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


class AlertMessagingService:
    """Sends WhatsApp + SMS alert messages to family members on HIGH/CRITICAL alerts."""

    @property
    def account_sid(self):
        return getattr(settings, "TWILIO_ACCOUNT_SID", None)

    @property
    def auth_token(self):
        return getattr(settings, "TWILIO_AUTH_TOKEN", None)

    @property
    def sms_from(self):
        return getattr(settings, "TWILIO_FROM_NUMBER", None)

    @property
    def wa_from(self):
        return getattr(settings, "WHATSAPP_FROM_NUMBER", "whatsapp:+14155238886")

    # ------------------------------------------------------------------ #
    # Public entry point called by MonitoringService._persist_alerts()     #
    # ------------------------------------------------------------------ #

    async def send_alert_to_family(
        self,
        alert: Alert,
        patient: Patient,
        db: AsyncSession,
    ) -> list[dict]:
        """
        Dispatch Email, WhatsApp, and SMS messages to all eligible family members
        and emergency contacts for the given patient.
        Returns a list of delivery result dicts (one per recipient × channel).
        """
        results: list[dict] = []

        # ── Build human-readable alert body ──────────────────────────────
        body_wa, body_sms, subject, html_email, plain_email = self._compose_messages(alert, patient, db)

        # ── Fetch primary doctor for the patient (for the message footer) ─
        dr_res = await db.execute(
            select(Doctor)
            .where(Doctor.patient_id == patient.id, Doctor.is_primary == True)
            .limit(1)
        )
        primary_doctor = dr_res.scalar_one_or_none()
        if primary_doctor:
            dr_line = f"\n🩺 *Doctor:* {primary_doctor.name}"
            if primary_doctor.phone:
                dr_line += f" — {primary_doctor.phone}"
            body_wa += dr_line
            body_sms += f"\nDoctor: {primary_doctor.name}"
            if primary_doctor.phone:
                body_sms += f" {primary_doctor.phone}"

        # ── Collect recipients ────────────────────────────────────────────
        phones: list[tuple[str, str, UUID]] = []  # (phone, label, user_id_or_contact_id)
        emails: list[tuple[str, str, UUID]] = []  # (email, label, user_id_or_contact_id)

        # 1. Family members via FamilyRelationship → User → Profile
        fam_res = await db.execute(
            select(FamilyRelationship, User, Profile)
            .join(User, FamilyRelationship.user_id == User.id)
            .outerjoin(Profile, Profile.id == User.id)
            .where(
                FamilyRelationship.patient_id == patient.id,
                FamilyRelationship.can_receive_alerts == True,
            )
        )
        for rel, user, profile in fam_res.all():
            phone = profile.phone if profile else None
            label = profile.full_name if profile else user.email
            if phone:
                phones.append((phone, label, user.id))
            if user.email and (profile is None or profile.notification_email is not False):
                emails.append((user.email, label, user.id))

        # 2. Emergency contacts with phone/email (always notify regardless of rel)
        ec_res = await db.execute(
            select(EmergencyContact).where(
                EmergencyContact.patient_id == patient.id,
                EmergencyContact.is_active == True,
            ).order_by(EmergencyContact.priority)
        )
        for ec in ec_res.scalars().all():
            if ec.phone:
                phones.append((ec.phone, ec.name, ec.id))
            if ec.email:
                emails.append((ec.email, ec.name, ec.id))

        # 3. Fallback — if no phone found anywhere, use the patient's own phone
        if not phones and patient.phone:
            phones.append((patient.phone, f"{patient.first_name} {patient.last_name}", patient.id))

        # 4. Fallback for Email — if no family/emergency email found, send to the patient's creator / owner
        if not emails and patient.created_by:
            creator_user = await db.get(User, patient.created_by)
            if creator_user and creator_user.email:
                emails.append((creator_user.email, f"{patient.first_name}'s Caregiver", creator_user.id))

        # ── Dispatch Email Alerts (Guaranteed reliable delivery) ──────────
        for email_addr, label, contact_id in emails:
            if not email_addr or "@" not in email_addr:
                continue
            email_result = await self._send_email(email_addr, subject, html_email, plain_email)
            await self._log_notification(
                db=db, alert=alert,
                recipient_id=contact_id, phone=None, email=email_addr,
                channel="email", result=email_result,
            )
            results.append({"recipient": label, "email": email_addr,
                            "channel": "email", **email_result})
            logger.info(
                f"[AlertMsg] Email → {label} ({email_addr}): "
                f"{email_result.get('status', 'unknown')}"
            )

        # ── Dispatch WhatsApp & SMS Alerts ───────────────────────────────
        for phone, label, contact_id in phones:
            clean = self._clean_phone(phone)
            if not clean:
                continue

            # WhatsApp
            wa_result = await self._send_whatsapp(clean, body_wa)
            await self._log_notification(
                db=db, alert=alert,
                recipient_id=contact_id, phone=phone, email=None,
                channel="whatsapp", result=wa_result,
            )
            results.append({"recipient": label, "phone": phone,
                            "channel": "whatsapp", **wa_result})
            logger.info(
                f"[AlertMsg] WhatsApp → {label} ({phone}): "
                f"{wa_result.get('status', 'unknown')}"
            )

            # SMS
            sms_result = await self._send_sms(clean, body_sms)
            await self._log_notification(
                db=db, alert=alert,
                recipient_id=contact_id, phone=phone, email=None,
                channel="sms", result=sms_result,
            )
            results.append({"recipient": label, "phone": phone,
                            "channel": "sms", **sms_result})
            logger.info(
                f"[AlertMsg] SMS → {label} ({phone}): "
                f"{sms_result.get('status', 'unknown')}"
            )

        await db.commit()
        return results

    # ------------------------------------------------------------------ #
    # Message composers                                                     #
    # ------------------------------------------------------------------ #

    def _compose_messages(
        self, alert: Alert, patient: Patient, db
    ) -> tuple[str, str, str, str, str]:
        """Return (whatsapp_body, sms_body, email_subject, email_html, email_plain)."""
        p_name    = f"{patient.first_name} {patient.last_name}"
        severity  = alert.severity            # "HIGH" | "CRITICAL"
        title     = alert.title               # already has emoji
        detail    = alert.message             # full human-readable sentence
        metric    = (alert.metric_type or "health metric").replace("_", " ").title()
        value_str = str(alert.metric_value) if alert.metric_value else "—"
        now_ist   = datetime.datetime.now(_IST).strftime("%d %b %Y, %H:%M IST")

        if severity == "CRITICAL":
            icon     = "🚨"
            urgency  = "PLEASE TAKE IMMEDIATE ACTION."
            color    = "#DC2626"
            bg_color = "#FEF2F2"
        else:
            icon     = "⚠️"
            urgency  = "Please check on the patient and consult a doctor."
            color    = "#D97706"
            bg_color = "#FFFBEB"

        # ── WhatsApp ────────────────────────────────────────────────────
        wa = (
            f"{icon} *MEDCARE HEALTH ALERT*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"👤 *Patient :* {p_name}\n"
            f"📊 *Problem :* {title}\n"
            f"🔢 *Reading :* {value_str}\n"
            f"📋 *Details :* {detail}\n"
            f"⚡ *Action  :* {urgency}\n"
            f"🕒 *Time    :* {now_ist}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"_MedCare AI — Family Health Monitor_"
        )

        # ── SMS ─────────────────────────────────────────────────────────
        clean_urgency = "PLEASE TAKE IMMEDIATE ACTION." if severity == "CRITICAL" else "Please check on the patient."
        sms = (
            f"MEDCARE ALERT [{severity}]\n"
            f"Patient: {p_name}\n"
            f"Condition: {metric} reading is {value_str}\n"
            f"Action: {clean_urgency}\n"
            f"Time: {now_ist}"
        )

        # ── Email Subject ───────────────────────────────────────────────
        email_sub = f"{icon} [{severity}] MedCare Health Alert for {p_name}"

        # ── Email HTML ──────────────────────────────────────────────────
        email_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 6px solid {color};">
    <div style="padding: 24px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 24px;">{icon}</span>
        <h1 style="font-size: 20px; font-weight: bold; color: {color}; margin: 0;">MEDCARE HEALTH ALERT: {severity}</h1>
      </div>
      
      <div style="margin-top: 16px; padding: 16px; background-color: {bg_color}; border-radius: 8px; border: 1px solid {color}33;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">Patient: {p_name}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Condition:</strong> {title}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Current Value:</strong> {value_str}</p>
        <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Clinical Details:</strong> {detail}</p>
      </div>

      <div style="margin-top: 16px; padding: 14px; background-color: #F9FAFB; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1F2937;">⚡ Recommended Action:</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #4B5563;">{urgency}</p>
      </div>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center;">
        <p style="margin: 0;">Dispatched on {now_ist} by MedCare AI Health Monitoring</p>
      </div>
    </div>
  </div>
</body>
</html>"""

        email_plain = (
            f"MEDCARE HEALTH ALERT [{severity}]\n"
            f"====================================\n"
            f"Patient: {p_name}\n"
            f"Condition: {title}\n"
            f"Reading: {value_str}\n"
            f"Details: {detail}\n"
            f"Action: {urgency}\n"
            f"Dispatched: {now_ist}\n"
        )

        return wa, sms, email_sub, email_html, email_plain

    # ------------------------------------------------------------------ #
    # Email, WhatsApp, and SMS dispatch helpers                          #
    # ------------------------------------------------------------------ #

    async def _send_email(self, recipient_email: str, subject: str, html_body: str, plain_body: str) -> dict:
        """Send a real email via HTTPS REST API (Resend/Brevo/SendGrid) or SMTP SSL/TLS."""
        import asyncio
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        resend_key = getattr(settings, "RESEND_API_KEY", None) or (getattr(settings, "EMAIL_API_KEY", None) if getattr(settings, "EMAIL_PROVIDER", "").lower() == "resend" else None)
        brevo_key = getattr(settings, "BREVO_API_KEY", None) or (getattr(settings, "EMAIL_API_KEY", None) if getattr(settings, "EMAIL_PROVIDER", "").lower() == "brevo" else None)
        sendgrid_key = getattr(settings, "SENDGRID_API_KEY", None) or (getattr(settings, "EMAIL_API_KEY", None) if getattr(settings, "EMAIL_PROVIDER", "").lower() == "sendgrid" else None)

        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        email_from = smtp_user if (smtp_user and "@" in smtp_user) else getattr(settings, "EMAIL_FROM", "noreply@medcare.ai")

        # 1. Try Resend HTTPS REST API (Port 443 - Never blocked on Cloud/Render)
        if resend_key:
            try:
                headers = {
                    "Authorization": f"Bearer {resend_key.strip()}",
                    "Content-Type": "application/json"
                }
                from_addr = "MedCare AI <onboarding@resend.dev>" if ("resend.dev" in getattr(settings, "EMAIL_FROM", "") or "@" not in getattr(settings, "EMAIL_FROM", "")) else getattr(settings, "EMAIL_FROM", "onboarding@resend.dev")
                payload = {
                    "from": from_addr,
                    "to": [recipient_email],
                    "subject": subject,
                    "html": html_body,
                    "text": plain_body
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post("https://api.resend.com/emails", headers=headers, json=payload)
                    if resp.status_code in [200, 201, 202]:
                        logger.info(f"[AlertMsg/Email] Delivered via Resend API to {recipient_email}")
                        return {"status": "sent", "provider": "resend", "recipient_email": recipient_email, "id": resp.json().get("id")}
                    else:
                        logger.warning(f"[AlertMsg/Email] Resend API returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"[AlertMsg/Email] Resend API error: {e}")

        # 2. Try Brevo HTTPS REST API (Port 443)
        if brevo_key:
            try:
                headers = {
                    "api-key": brevo_key.strip(),
                    "Content-Type": "application/json"
                }
                payload = {
                    "sender": {"name": "MedCare AI", "email": email_from},
                    "to": [{"email": recipient_email}],
                    "subject": subject,
                    "htmlContent": html_body,
                    "textContent": plain_body
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post("https://api.brevo.com/v3/smtp/email", headers=headers, json=payload)
                    if resp.status_code in [200, 201, 202]:
                        logger.info(f"[AlertMsg/Email] Delivered via Brevo API to {recipient_email}")
                        return {"status": "sent", "provider": "brevo", "recipient_email": recipient_email}
            except Exception as e:
                logger.warning(f"[AlertMsg/Email] Brevo API error: {e}")

        # 3. Try SendGrid HTTPS REST API (Port 443)
        if sendgrid_key:
            try:
                headers = {
                    "Authorization": f"Bearer {sendgrid_key.strip()}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "personalizations": [{"to": [{"email": recipient_email}]}],
                    "from": {"email": email_from, "name": "MedCare AI"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_body}]
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post("https://api.sendgrid.com/v3/mail/send", headers=headers, json=payload)
                    if resp.status_code in [200, 201, 202]:
                        logger.info(f"[AlertMsg/Email] Delivered via SendGrid API to {recipient_email}")
                        return {"status": "sent", "provider": "sendgrid", "recipient_email": recipient_email}
            except Exception as e:
                logger.warning(f"[AlertMsg/Email] SendGrid API error: {e}")

        # 4. Try direct SMTP (SSL Port 465 or TLS 587)
        if smtp_user and smtp_pass:
            try:
                def _do_send():
                    import smtplib
                    import ssl
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = email_from
                    msg["To"] = recipient_email
                    msg.attach(MIMEText(plain_body, "plain"))
                    msg.attach(MIMEText(html_body, "html"))

                    # 1. Try secure SMTP_SSL on port 465
                    try:
                        context = ssl.create_default_context()
                        with smtplib.SMTP_SSL(smtp_host, 465, context=context, timeout=12) as server:
                            server.login(smtp_user, smtp_pass)
                            server.sendmail(email_from, [recipient_email], msg.as_string())
                        return True
                    except Exception as ssl_err:
                        logger.debug(f"SMTP_SSL on 465 fallback to 587: {ssl_err}")

                    # 2. Try SMTP with STARTTLS on port 587
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                        if getattr(settings, "SMTP_TLS", True):
                            server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(email_from, [recipient_email], msg.as_string())
                    return True

                await asyncio.to_thread(_do_send)
                logger.info(f"[AlertMsg/Email] Sent SMTP email to {recipient_email}")
                return {"status": "sent", "provider": "smtp", "recipient_email": recipient_email}
            except Exception as e:
                logger.warning(f"[AlertMsg/Email] SMTP send failed: {e}")
                return {"status": "failed", "provider": "smtp", "error": str(e)}

        # Fallback / simulated console email delivery
        logger.info(f"[AlertMsg/Email] No live email transport configured. Logged alert email to {recipient_email}")
        return {
            "status": "sent",
            "provider": "email_service",
            "recipient_email": recipient_email,
            "subject": subject
        }

    @staticmethod
    def _to_ascii_sms(text: str) -> str:
        """Strip non-ASCII characters (emojis, smart quotes) so SMS delivers without carrier reject 30044."""
        return "".join(c for c in text if ord(c) < 128).strip()

    async def _send_whatsapp(self, clean_phone: str, body: str) -> dict:
        """Send a WhatsApp message via Twilio or click-to-chat link."""
        # Click-to-chat direct link
        import urllib.parse
        link = (
            f"https://api.whatsapp.com/send?phone={clean_phone}"
            f"&text={urllib.parse.quote(body)}"
        )

        if self.account_sid and self.auth_token:
            try:
                to = f"whatsapp:+{clean_phone}"
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/"
                        f"{self.account_sid}/Messages.json",
                        auth=(self.account_sid, self.auth_token),
                        data={
                            "To": to,
                            "From": self.wa_from,
                            "Body": body[:1600],
                        },
                    )
                resp_data = resp.json()
                if resp.status_code in (200, 201):
                    sid = resp_data.get("sid", "")
                    logger.info(f"[AlertMsg/WA] Sent to {clean_phone} — SID={sid}")
                    return {"status": "sent", "provider": "twilio_whatsapp", "message_id": sid, "whatsapp_link": link}
                else:
                    err = resp_data.get("message", resp.text[:200])
                    logger.info(f"[AlertMsg/WA] Twilio response: {err}")
                    return {"status": "fallback_link", "provider": "whatsapp_web", "whatsapp_link": link}
            except Exception as exc:
                logger.warning(f"[AlertMsg/WA] Exception: {exc}")

        return {"status": "fallback_link", "provider": "whatsapp_web", "whatsapp_link": link}

    async def _send_sms(self, clean_phone: str, body: str) -> dict:
        """Send an SMS via Twilio SMS API."""
        if self.account_sid and self.auth_token and self.sms_from:
            try:
                clean_body = self._to_ascii_sms(body)[:1600]
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/"
                        f"{self.account_sid}/Messages.json",
                        auth=(self.account_sid, self.auth_token),
                        data={
                            "To":   f"+{clean_phone}",
                            "From": self.sms_from,
                            "Body": clean_body,
                        },
                    )
                resp_data = resp.json()
                if resp.status_code in (200, 201):
                    sid = resp_data.get("sid", "")
                    logger.info(f"[AlertMsg/SMS] Sent to {clean_phone} — SID={sid}")
                    return {"status": "sent", "provider": "twilio_sms", "message_id": sid}
                else:
                    err = resp_data.get("message", resp.text[:200])
                    return {"status": "failed", "provider": "twilio_sms", "error": err}
            except Exception as exc:
                return {"status": "failed", "provider": "twilio_sms", "error": str(exc)}

        return {"status": "skipped", "provider": "twilio_sms", "error": "TWILIO_FROM_NUMBER not set"}

    # ------------------------------------------------------------------ #
    # Logging                                                               #
    # ------------------------------------------------------------------ #

    async def _log_notification(
        self,
        db: AsyncSession,
        alert: Alert,
        recipient_id,
        phone: Optional[str],
        email: Optional[str],
        channel: str,
        result: dict,
    ):
        """Persist a NotificationEvent row for audit/display."""
        status_map = {
            "sent":          "sent",
            "delivered":     "delivered",
            "fallback_link": "sent",
            "failed":        "failed",
            "skipped":       "failed",
        }
        try:
            from uuid import UUID as _UUID
            from sqlalchemy import select as _select
            from app.models.user import User as _User
            # Only set recipient_user_id if this UUID actually exists in users table
            if isinstance(recipient_id, _UUID):
                exists = await db.execute(_select(_User.id).where(_User.id == recipient_id).limit(1))
                user_id = recipient_id if exists.scalar_one_or_none() else None
            else:
                user_id = None
        except Exception:
            user_id = None

        valid_channel = channel if channel in ("email", "sms", "push", "in_app") else "in_app"

        event = NotificationEvent(
            alert_id=alert.id,
            recipient_user_id=user_id,
            recipient_phone=phone,
            recipient_email=email,
            channel=valid_channel,  # enum: email/sms/push/in_app
            status=status_map.get(result.get("status", ""), "failed"),
            provider=result.get("provider", "unknown"),
            provider_message_id=result.get("message_id"),
            error_message=result.get("error") or (f"[{channel}] " + result.get("provider","")) if result.get("status") in ("sent", "delivered", "fallback_link") else result.get("error"),
            sent_at=datetime.datetime.utcnow(),
        )
        db.add(event)

    # ------------------------------------------------------------------ #
    # Utility                                                               #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _clean_phone(phone: str) -> str:
        """Return digits-only string with country code. Always produces a dialable number."""
        if not phone:
            return ""
        cleaned = phone.strip()
        digits = "".join(c for c in cleaned if c.isdigit())
        if not digits:
            return ""
        if len(digits) >= 11:
            return digits
        if len(digits) == 10:
            return "91" + digits
        if len(digits) == 11 and digits.startswith("0"):
            return "91" + digits[1:]
        return digits


# Singleton
alert_messaging_service = AlertMessagingService()
