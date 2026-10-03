from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from uuid import UUID
import uuid
import re
from pydantic import BaseModel
from typing import Optional, List
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.patient import FamilyRelationship, Patient
from app.models.user import User, EmergencyContact
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

def format_phone_e164(phone: Optional[str]) -> Optional[str]:
    """Format any Indian or international phone number cleanly with + country code."""
    if not phone:
        return None
    cleaned = phone.strip()
    digits = re.sub(r'\D', '', cleaned)
    if not digits:
        return None
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    if cleaned.startswith("+"):
        return f"+{digits}"
    return f"+91{digits}"

class FamilyMemberAdd(BaseModel):
    patient_id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_label: str = "Family Member"
    role: str = "caregiver"
    can_view_records: bool = True
    can_manage_meds: bool = True
    can_receive_alerts: bool = True
    is_emergency_contact: bool = True

@router.get("/{patient_id}")
async def get_family_members(
    patient_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied to this patient's records")

    # 1. Query all family relationships
    fam_res = await db.execute(
        select(FamilyRelationship).where(FamilyRelationship.patient_id == patient_id).order_by(FamilyRelationship.created_at.desc())
    )
    relationships = list(fam_res.scalars().all())

    # 2. Query emergency contacts for phone & contact info
    ec_res = await db.execute(
        select(EmergencyContact).where(EmergencyContact.patient_id == patient_id).order_by(EmergencyContact.priority)
    )
    emergency_contacts = list(ec_res.scalars().all())
    ec_by_email = {ec.email.lower(): ec for ec in emergency_contacts if ec.email}
    ec_by_rel = {ec.relationship_label.lower(): ec for ec in emergency_contacts if ec.relationship_label}

    enriched_members = []
    seen_ec_ids = set()

    for rel in relationships:
        user = await db.get(User, rel.user_id) if rel.user_id else None
        user_email = user.email if user else None
        
        # Match with corresponding emergency contact if available
        matched_ec = None
        if user_email and user_email.lower() in ec_by_email:
            matched_ec = ec_by_email[user_email.lower()]
        elif rel.relationship_label and rel.relationship_label.lower() in ec_by_rel:
            matched_ec = ec_by_rel[rel.relationship_label.lower()]

        if matched_ec:
            seen_ec_ids.add(matched_ec.id)

        phone = matched_ec.phone if matched_ec else None
        name = matched_ec.name if (matched_ec and matched_ec.name) else (
            f"{user.first_name or ''} {user.last_name or ''}".strip() if user else rel.relationship_label
        )
        if not name:
            name = rel.relationship_label or "Family Member"

        role_str = str(rel.role).lower().replace("relationshiprole.", "")
        enriched_members.append({
            "id": str(rel.id),
            "relationship_id": str(rel.id),
            "user_id": str(rel.user_id) if rel.user_id else None,
            "name": name,
            "email": user_email or (matched_ec.email if matched_ec else None),
            "phone": phone,
            "relationship_label": rel.relationship_label or "Family Member",
            "role": role_str,
            "can_view_records": rel.can_view_records,
            "can_manage_meds": rel.can_manage_medications,
            "can_receive_alerts": rel.can_receive_alerts,
            "is_emergency_contact": rel.is_emergency_contact or (matched_ec is not None and matched_ec.is_active),
            "created_at": rel.created_at.isoformat() if rel.created_at else None,
        })

    # 3. Add any emergency contacts that aren't already represented
    for ec in emergency_contacts:
        if ec.id not in seen_ec_ids:
            enriched_members.append({
                "id": str(ec.id),
                "emergency_contact_id": str(ec.id),
                "user_id": None,
                "name": ec.name,
                "email": ec.email,
                "phone": ec.phone,
                "relationship_label": ec.relationship_label or "Emergency Contact",
                "role": "caregiver",
                "can_view_records": True,
                "can_manage_meds": True,
                "can_receive_alerts": True,
                "is_emergency_contact": ec.is_active,
                "created_at": ec.created_at.isoformat() if ec.created_at else None,
            })

    return enriched_members

@router.post("")
@router.post("/")
async def add_family_member(
    data: FamilyMemberAdd,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied to manage family for this patient")

    patient = await db.get(Patient, data.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    role_str = (data.role or "caregiver").lower()
    if role_str not in ["owner", "caregiver", "viewer", "doctor"]:
        role_str = "caregiver"

    clean_phone = format_phone_e164(data.phone)
    email_clean = data.email.strip().lower() if data.email else None

    # Resolve or create target User account for shared login
    target_user_id = current_user.id
    if email_clean:
        email_res = await db.execute(select(User).where(User.email == email_clean))
        existing_user = email_res.scalar_one_or_none()
        if existing_user:
            target_user_id = existing_user.id
        else:
            # Deterministic pre-created UUID for invited user
            new_uid = uuid.uuid5(uuid.NAMESPACE_DNS, f"firebase:user:{email_clean}")
            first_n = data.name.split()[0] if (data.name and data.name.strip()) else data.relationship_label
            last_n = " ".join(data.name.split()[1:]) if (data.name and len(data.name.split()) > 1) else ""
            placeholder_user = User(
                id=new_uid,
                email=email_clean,
                first_name=first_n,
                last_name=last_n,
                role="patient"
            )
            db.add(placeholder_user)
            await db.flush()
            target_user_id = placeholder_user.id
            logger.info(f"Created invited user placeholder: {new_uid} ({email_clean})")

    # Create or update FamilyRelationship
    rel_res = await db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.patient_id == data.patient_id,
            FamilyRelationship.user_id == target_user_id
        )
    )
    rel = rel_res.scalar_one_or_none()
    if rel:
        rel.relationship_label = data.relationship_label
        rel.role = role_str
        rel.can_view_records = data.can_view_records
        rel.can_manage_medications = data.can_manage_meds
        rel.can_receive_alerts = data.can_receive_alerts
        rel.is_emergency_contact = data.is_emergency_contact
    else:
        rel = FamilyRelationship(
            user_id=target_user_id,
            patient_id=data.patient_id,
            relationship_label=data.relationship_label,
            role=role_str,
            can_view_records=data.can_view_records,
            can_manage_medications=data.can_manage_meds,
            can_receive_alerts=data.can_receive_alerts,
            is_emergency_contact=data.is_emergency_contact,
            authorized_by=current_user.id
        )
        db.add(rel)

    # Automatically synchronize with EmergencyContact for live SOS Calling & WhatsApp alerts
    if clean_phone or data.is_emergency_contact or data.can_receive_alerts:
        contact_phone = clean_phone or patient.phone or "+919876543210"
        contact_name = data.name if (data.name and data.name.strip()) else f"{data.relationship_label} ({email_clean or 'Family'})"
        
        # Check existing emergency contact by phone or email
        ec_query = select(EmergencyContact).where(
            EmergencyContact.patient_id == data.patient_id,
            or_(
                EmergencyContact.phone == contact_phone,
                EmergencyContact.email == email_clean if email_clean else False,
                EmergencyContact.relationship_label == data.relationship_label
            )
        )
        ec_res = await db.execute(ec_query)
        existing_ec = ec_res.scalars().first()
        if existing_ec:
            existing_ec.name = contact_name
            existing_ec.relationship_label = data.relationship_label
            existing_ec.phone = contact_phone
            if email_clean:
                existing_ec.email = email_clean
            existing_ec.is_active = True
        else:
            new_ec = EmergencyContact(
                patient_id=data.patient_id,
                name=contact_name,
                relationship_label=data.relationship_label,
                phone=contact_phone,
                email=email_clean,
                priority=1 if data.is_emergency_contact else 2,
                is_active=True,
                added_by=current_user.id
            )
            db.add(new_ec)
            logger.info(f"Synchronized emergency contact {contact_name} ({contact_phone}) for patient {patient.id}")

    # Dispatch Invitation Email if email is provided
    email_status = "not_requested"
    if email_clean and "@" in email_clean:
        try:
            from app.services.alert_messaging_service import alert_messaging_service
            p_name = f"{patient.first_name} {patient.last_name or ''}".strip()
            inviter_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email or "Your Family"
            subject = f"🏥 You're invited as a Family Caregiver for {p_name} — MedCare AI"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #F8FAFC; color: #1E293B;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="background: linear-gradient(135deg, #2563EB, #1D4ED8); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">MedCare AI</h1>
                    <p style="color: #DBEAFE; margin: 8px 0 0 0; font-size: 14px;">Family Caregiver & Emergency Health Access</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 24px;">
                    <p style="font-size: 16px; line-height: 24px; margin-top: 0;">Hello <strong>{data.name or data.relationship_label}</strong>,</p>
                    <p style="font-size: 15px; line-height: 24px; color: #475569;">
                      <strong>{inviter_name}</strong> has invited you to access and co-manage health records for patient <strong style="color: #1E293B;">{p_name}</strong> on MedCare AI.
                    </p>
                    
                    <div style="background-color: #F1F5F9; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #E2E8F0;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                        <tr>
                          <td style="padding: 6px 0; color: #64748B; width: 140px;">Patient:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">{p_name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748B;">Relationship:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">{data.relationship_label}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748B;">Access Role:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: #2563EB; text-transform: capitalize;">{role_str}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748B;">Linked Phone:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">{contact_phone}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748B;">SOS Calling:</td>
                          <td style="padding: 6px 0; font-weight: 600; color: {'#16A34A' if data.is_emergency_contact else '#64748B'};">{'✅ Active Emergency Voice Call Recipient' if data.is_emergency_contact else 'Standard Notifications'}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 24px;">
                      With your caregiver access, you can view live vitals, review medications, and stay informed on health alerts in real time.
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                      <a href="http://localhost:5173/login" style="background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        Accept Invitation & Access Patient Dashboard &rarr;
                      </a>
                    </div>

                    <p style="font-size: 12px; line-height: 18px; color: #94A3B8; text-align: center; margin-top: 24px;">
                      Log in or sign up using <strong>{email_clean}</strong> to automatically see {p_name}'s medical records.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
                    MedCare AI Health & Emergency Platform • Mysuru, Karnataka
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """
            
            plain_body = f"""
MedCare AI — Family Caregiver Invitation

Hello {data.name or data.relationship_label},

{inviter_name} has invited you to access and co-manage health records for patient {p_name} on MedCare AI.

Details:
- Patient: {p_name}
- Relationship: {data.relationship_label}
- Role: {role_str.title()}
- Linked Phone: {contact_phone}
- SOS Emergency Call Recipient: {'Yes' if data.is_emergency_contact else 'No'}

To accept and access the dashboard, click the link below or log in with {email_clean}:
http://localhost:5173/login

MedCare AI Platform
            """
            send_res = await alert_messaging_service._send_email(email_clean, subject, html_body, plain_body)
            email_status = send_res.get("status", "sent")
            logger.info(f"Dispatched invitation email to {email_clean}: {email_status}")
        except Exception as ex:
            logger.error(f"Failed to dispatch caregiver invite email: {ex}")
            email_status = "error"

    await db.commit()
    await db.refresh(rel)
    return {
        "success": True,
        "message": f"Successfully added {data.relationship_label} ({data.name or email_clean or 'Caregiver'})! Invitation email status: {email_status}.",
        "relationship_id": str(rel.id),
        "email_status": email_status
    }

@router.delete("/{item_id}")
async def delete_family_member(
    item_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Try finding FamilyRelationship
    rel = await db.get(FamilyRelationship, item_id)
    if rel:
        authorized = await verify_patient_access(current_user.id, rel.patient_id, db)
        if not authorized:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.delete(rel)
        await db.commit()
        return {"success": True, "message": "Family member removed"}

    # Try finding EmergencyContact
    ec = await db.get(EmergencyContact, item_id)
    if ec:
        authorized = await verify_patient_access(current_user.id, ec.patient_id, db)
        if not authorized:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.delete(ec)
        await db.commit()
        return {"success": True, "message": "Emergency contact removed"}

    raise HTTPException(status_code=404, detail="Member or contact not found")

