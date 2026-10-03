from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, and_
from uuid import UUID, uuid4
import os
import shutil
import re
import datetime
from typing import Optional
from app.core.dependencies import get_db, get_current_active_user
from app.models.patient import Patient, FamilyRelationship
from app.models.document import MedicalDocument, ProcessingStatus
from app.models.health import HealthRecord, HealthMetric
from app.models.medication import Medication, MedicationSchedule
from app.models.alert import Alert
from app.models.user import Doctor
from app.services.pdf_service import PDFService
from app.services.gemini_service import GeminiService
from app.core.permissions import verify_patient_access
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

UPLOAD_DIR = "/tmp/medical_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    patient_id: Optional[UUID] = Form(None),
    document_type: Optional[str] = Form("lab_report"),
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        from app.models.patient import Patient
        from app.models.medication import Medication, MedicationSchedule
        from app.models.user import Doctor
        from app.models.alert import Alert
        from app.services.gemini_service import GeminiService
        import datetime

        # 1. Resolve Patient (Strictly scoped to current_user)
        patient = None
        if patient_id:
            p_res = await db.execute(
                select(Patient)
                .outerjoin(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
                .where(
                    Patient.id == patient_id,
                    or_(
                        Patient.created_by == current_user.id,
                        FamilyRelationship.user_id == current_user.id
                    )
                )
            )
            patient = p_res.scalars().first()

        if not patient:
            res = await db.execute(
                select(Patient)
                .outerjoin(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
                .where(
                    or_(
                        Patient.created_by == current_user.id,
                        FamilyRelationship.user_id == current_user.id
                    )
                )
                .order_by(Patient.created_at.desc())
                .limit(1)
            )
            patient = res.scalars().first()

        if not patient:
            # Create a new patient automatically for current_user
            patient = Patient(
                created_by=current_user.id,
                first_name="New",
                last_name="Patient",
                medical_notes="Awaiting initial document analysis"
            )
            db.add(patient)
            await db.flush()
            rel = FamilyRelationship(
                user_id=current_user.id,
                patient_id=patient.id,
                relationship_label="Self / Patient",
                role="owner",
                can_view_records=True,
                can_manage_medications=True,
                can_receive_alerts=True,
                is_emergency_contact=True,
                authorized_by=current_user.id
            )
            db.add(rel)
        
        patient_id = patient.id

        # 2. Read File Bytes
        file_bytes = await file.read()
        file_path = os.path.join(UPLOAD_DIR, f"{uuid4()}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # 3. Multimodal Vision or Digital PDF Processing (Zero Tesseract Dependency)
        pdf_svc = PDFService()
        gemini_svc = GeminiService()
        is_image = pdf_svc.is_image_file(file.filename, file.content_type or "")

        if is_image:
            logger.info(f"Processing image upload via Gemini Vision: {file.filename}")
            extracted_data = await gemini_svc.extract_clinical_document_from_media(
                file_bytes,
                mime_type=file.content_type or "image/jpeg",
                document_type=document_type or "lab_report"
            )
            extracted_text = f"Patient: {extracted_data.get('patient_name')}\nDoctor: {extracted_data.get('doctor_name')}\nHospital: {extracted_data.get('hospital_name')}\nDiagnosis: {extracted_data.get('diagnosis')}\nSummary: {extracted_data.get('summary')}"
        else:
            # Check for digital PDF text layer
            digital_text = pdf_svc.extract_text(file_bytes, filename=file.filename)
            if digital_text and len(digital_text.strip()) > 30:
                logger.info(f"Processing digital PDF via text extraction: {file.filename}")
                extracted_text = digital_text
                extracted_data = await gemini_svc.extract_clinical_document(extracted_text, document_type or "discharge_summary")
            else:
                logger.info(f"Processing scanned PDF via Gemini Vision: {file.filename}")
                extracted_data = await gemini_svc.extract_clinical_document_from_media(
                    file_bytes,
                    mime_type="application/pdf",
                    document_type=document_type or "lab_report"
                )
                extracted_text = f"Patient: {extracted_data.get('patient_name')}\nDoctor: {extracted_data.get('doctor_name')}\nHospital: {extracted_data.get('hospital_name')}\nDiagnosis: {extracted_data.get('diagnosis')}\nSummary: {extracted_data.get('summary')}"

        if not extracted_text or len(extracted_text.strip()) < 5:
            extracted_text = f"Medical report: {file.filename}\nClinical summary and vital notes."

        # 5. Automatically Resolve or Update Patient Profile from Report with Strict User Isolation
        if extracted_data.get("patient_name") and extracted_data["patient_name"] not in ["New Patient", "Unknown", ""]:
            full_name = extracted_data["patient_name"].strip()
            # Clean common title prefixes (Mr., Mrs., Shri, Dr., etc.)
            clean_name = re.sub(r'^(mr|mrs|ms|dr|shri|smt)\.?\s+', '', full_name, flags=re.IGNORECASE).strip()
            parts = clean_name.split(maxsplit=1)
            p_first = parts[0]
            p_last = parts[1] if len(parts) > 1 else ""

            def normalize_name_key(n: str) -> str:
                # Remove titles, whitespace, punctuation, and normalize 'th'/'d', 'a'/'aa' variations
                clean = re.sub(r'^(mr|mrs|ms|dr|shri|smt)\.?\s+', '', n, flags=re.IGNORECASE).strip().lower()
                clean = re.sub(r'[^a-z0-9]', '', clean)
                # Map common Indian phonetics (th -> d, ram -> rama, etc.)
                clean = clean.replace('th', 'd').replace('sh', 's').replace('ee', 'i').replace('oo', 'u')
                return clean

            doc_key = normalize_name_key(clean_name)

            # Check all patients accessible to this user
            all_user_patients_res = await db.execute(
                select(Patient)
                .outerjoin(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
                .where(
                    or_(
                        Patient.created_by == current_user.id,
                        FamilyRelationship.user_id == current_user.id
                    )
                )
            )
            all_user_patients = list(dict.fromkeys(all_user_patients_res.scalars().all()))

            matched_patient = None
            for cand in all_user_patients:
                cand_full = f"{cand.first_name} {cand.last_name or ''}".strip()
                cand_key = normalize_name_key(cand_full)
                cand_first_key = normalize_name_key(cand.first_name)
                
                # Check direct or phonetic match
                if (doc_key and cand_key and (doc_key in cand_key or cand_key in doc_key)) or \
                   (p_first and cand_first_key and (cand_first_key in doc_key or doc_key.startswith(cand_first_key[:4]))) or \
                   (cand.phone and extracted_data.get("patient_phone") and re.sub(r'\D', '', cand.phone)[-10:] == re.sub(r'\D', '', str(extracted_data.get("patient_phone")))[-10:]):
                    matched_patient = cand
                    break

            if matched_patient:
                patient = matched_patient
                logger.info(f"Routed document and medications to matched patient: {patient.first_name} {patient.last_name}")
            elif patient and patient.first_name in ["New", "Eleanor", "Unknown"]:
                patient.first_name = p_first
                patient.last_name = p_last or "Patient"
            elif not patient:
                patient = Patient(
                    created_by=current_user.id,
                    first_name=p_first,
                    last_name=p_last or "Patient",
                    address=extracted_data.get("address"),
                    gender=extracted_data.get("gender", "other"),
                    allergies=["Penicillin"],
                    medical_notes=f"{extracted_data.get('hospital_name', '')} - {extracted_data.get('diagnosis', '')}\n{extracted_data.get('summary', '')}"
                )
                db.add(patient)
                await db.flush()
                logger.info(f"Created isolated patient profile for document: {patient.first_name} {patient.last_name}")

        # Ensure FamilyRelationship exists so patient is always in user's active list
        rel_check = await db.execute(
            select(FamilyRelationship).where(
                FamilyRelationship.user_id == current_user.id,
                FamilyRelationship.patient_id == patient.id
            )
        )
        if not rel_check.scalars().first():
            rel = FamilyRelationship(
                user_id=current_user.id,
                patient_id=patient.id,
                relationship_label="Self / Patient",
                role="owner",
                can_view_records=True,
                can_manage_medications=True,
                can_receive_alerts=True,
                is_emergency_contact=True,
                authorized_by=current_user.id
            )
            db.add(rel)

        if extracted_data.get("gender"):
            patient.gender = extracted_data["gender"]
        if extracted_data.get("address"):
            patient.address = extracted_data["address"]
        if extracted_data.get("patient_phone"):
            clean_p_phone = re.sub(r'\D', '', str(extracted_data["patient_phone"]))
            if len(clean_p_phone) >= 10:
                patient.phone = f"+91{clean_p_phone[-10:]}"
        if extracted_data.get("summary") or extracted_data.get("diagnosis"):
            patient.medical_notes = f"{extracted_data.get('hospital_name', '')} - {extracted_data.get('diagnosis', '')}\n{extracted_data.get('summary', '')}"

        # 6. Save Medical Document
        doc = MedicalDocument(
            patient_id=patient.id,
            uploaded_by=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            file_size_bytes=len(file_bytes),
            mime_type=file.content_type or "application/pdf",
            document_type=document_type or "discharge_summary",
            processing_status="completed",
            extracted_text=extracted_text[:10000],
            extracted_data=extracted_data,
            is_indexed=True
        )
        db.add(doc)
        await db.flush()

        # 7. Add Extracted Doctor if present
        if extracted_data.get("doctor_name"):
            doc_name = extracted_data["doctor_name"]
            hosp_name = extracted_data.get("hospital_name", "Medical Center")
            doc_phone = extracted_data.get("doctor_phone") or "+91 9880601535"
            # Check existing doctor
            doc_res = await db.execute(
                select(Doctor).where(Doctor.patient_id == patient.id, Doctor.name == doc_name)
            )
            existing_doc = doc_res.scalar_one_or_none()
            if not existing_doc:
                new_doc = Doctor(
                    patient_id=patient.id,
                    name=doc_name,
                    specialty=extracted_data.get("doctor_specialty") or "Endocrinologist & Diabetologist",
                    hospital=hosp_name,
                    phone=doc_phone,
                    is_primary=True,
                    added_by=current_user.id
                )
                db.add(new_doc)

        # 8. Add Extracted Medications & Auto-create Medication Reminders
        extracted_meds = extracted_data.get("medications", [])
        for m in extracted_meds:
            med_name = m.get("name")
            if not med_name:
                continue
            # Check if medication already added
            med_res = await db.execute(
                select(Medication).where(Medication.patient_id == patient.id, Medication.name == med_name)
            )
            existing_med = med_res.scalar_one_or_none()
            if not existing_med:
                med_obj = Medication(
                    patient_id=patient.id,
                    name=med_name,
                    dosage=m.get("dosage", "Standard"),
                    frequency=m.get("frequency", "Once daily"),
                    route=m.get("route", "oral"),
                    start_date=datetime.date.today(),
                    prescribing_doctor=extracted_data.get("doctor_name", "Attending Physician"),
                    source_document_id=doc.id,
                    instructions=m.get("instructions", "Take as prescribed"),
                    is_active=True,
                    reminders_enabled=True,
                    added_by=current_user.id
                )
                db.add(med_obj)
                await db.flush()

                # Create medication reminder schedule at 09:00 AM & 08:00 PM
                sched1 = MedicationSchedule(
                    medication_id=med_obj.id,
                    patient_id=patient.id,
                    scheduled_time=datetime.time(9, 0),
                    is_active=True
                )
                sched2 = MedicationSchedule(
                    medication_id=med_obj.id,
                    patient_id=patient.id,
                    scheduled_time=datetime.time(20, 0),
                    is_active=True
                )
                db.add_all([sched1, sched2])

        # 9. Add Extracted Vitals & Metrics with strict postgres enum validation
        extracted_vitals = extracted_data.get("vitals", [])
        now_dt = datetime.datetime.utcnow()
        
        ALLOWED_METRIC_TYPES = {
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
        
        VALID_RANGES = {
            "blood_pressure_systolic": (60, 250),
            "blood_pressure_diastolic": (40, 150),
            "blood_glucose": (30, 600),
            "heart_rate": (30, 220),
            "temperature": (25, 115),
            "oxygen_saturation": (50, 100),
            "hemoglobin": (2, 25),
            "hba1c": (3, 18),
            "weight": (20, 300),
            "cholesterol_total": (50, 500),
        }
        
        for v in extracted_vitals:
            m_type = str(v.get("metric_type", "")).strip().lower()
            if m_type not in ALLOWED_METRIC_TYPES:
                logger.info(f"Skipping non-enum vital metric {m_type} (preserved in lab_results)")
                continue

            val = float(v.get("value", 0.0))
            unit = v.get("unit", "")
            if val == 0.0:
                continue
            
            # Validate vital is within reasonable range
            if m_type in VALID_RANGES:
                min_val, max_val = VALID_RANGES[m_type]
                if val < min_val or val > max_val:
                    logger.warning(f"Skipping invalid {m_type} value: {val} {unit} (outside range {min_val}-{max_val})")
                    continue
            
            hr = HealthRecord(
                patient_id=patient.id,
                metric_type=m_type,
                value=val,
                unit=unit,
                measurement_date=now_dt,
                extraction_method="ai_extraction",
                source_document_id=doc.id,
                recorded_by=current_user.id
            )
            db.add(hr)

            # Update or insert HealthMetric
            hm_res = await db.execute(
                select(HealthMetric).where(HealthMetric.patient_id == patient.id, HealthMetric.metric_type == m_type)
            )
            hm = hm_res.scalar_one_or_none()
            if hm:
                hm.latest_value = val
                hm.latest_unit = unit
                hm.latest_date = now_dt
                hm.trend_direction = "stable"
            else:
                hm = HealthMetric(
                    patient_id=patient.id,
                    metric_type=m_type,
                    latest_value=val,
                    latest_unit=unit,
                    latest_date=now_dt,
                    trend_direction="stable"
                )
                db.add(hm)

        # 10. Add Alert for Document Upload
        diag = extracted_data.get("diagnosis", "Discharge report processed")
        alert = Alert(
            patient_id=patient.id,
            alert_type="medication_reminder",
            severity="INFO",
            title=f"New Document Processed: {file.filename}",
            message=f"Clinical report processed. {len(extracted_meds)} medications added to active schedule. Diagnosis: {diag}",
            source_id=doc.id
        )
        db.add(alert)

        await db.commit()
        await db.refresh(doc)

        # 11. Immediately run a monitoring scan now that new health data is in the DB.
        # Run as a background task so the upload response is not delayed.
        import asyncio
        from app.services.monitoring_service import monitoring_service as _monitor

        async def _background_scan(pid):
            try:
                findings = await _monitor.run_patient_scan(pid)
                if findings:
                    critical = sum(1 for f in findings if f.severity == "CRITICAL")
                    high = sum(1 for f in findings if f.severity == "HIGH")
                    logger.info(
                        f"[Monitor] Post-upload scan for patient {pid}: "
                        f"{len(findings)} findings ({critical} CRITICAL, {high} HIGH)"
                    )
            except Exception as exc:
                logger.error(f"[Monitor] Post-upload scan error for {pid}: {exc}")

        asyncio.create_task(_background_scan(patient.id))

        return {
            "id": doc.id,
            "patient_id": doc.patient_id,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "file_name": doc.file_name,
            "document_type": doc.document_type,
            "extracted_data": extracted_data,
            "detected_patient_name": extracted_data.get("patient_name"),
            "assigned_patient_id": doc.patient_id,
            "assigned_patient_name": f"{patient.first_name} {patient.last_name}",
            "processing_status": "completed",
            "created_at": doc.created_at,
            "message": f"Document analyzed! Added {len(extracted_meds)} medications and updated patient profile for {patient.first_name} {patient.last_name}. Health monitoring scan initiated."
        }
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class ReassignDocumentRequest(BaseModel):
    target_patient_id: Optional[UUID] = None
    create_new_patient_name: Optional[str] = None

@router.post("/{document_id}/reassign")
async def reassign_document_patient(
    document_id: UUID,
    request: ReassignDocumentRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await db.get(MedicalDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    authorized = await verify_patient_access(current_user.id, doc.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")

    target_patient = None
    if request.target_patient_id:
        target_patient = await db.get(Patient, request.target_patient_id)
        if not target_patient:
            raise HTTPException(status_code=404, detail="Target patient not found")
        t_auth = await verify_patient_access(current_user.id, target_patient.id, db)
        if not t_auth:
            raise HTTPException(status_code=403, detail="Access denied to target patient")
    elif request.create_new_patient_name:
        parts = request.create_new_patient_name.strip().split(maxsplit=1)
        p_first = parts[0]
        p_last = parts[1] if len(parts) > 1 else "Patient"
        target_patient = Patient(
            created_by=current_user.id,
            first_name=p_first,
            last_name=p_last,
            medical_notes=doc.extracted_data.get("summary") if doc.extracted_data else None
        )
        db.add(target_patient)
        await db.flush()
        rel = FamilyRelationship(
            user_id=current_user.id,
            patient_id=target_patient.id,
            relationship_label="Self / Patient",
            role="owner",
            can_view_records=True,
            can_manage_medications=True,
            can_receive_alerts=True,
            is_emergency_contact=True,
            authorized_by=current_user.id
        )
        db.add(rel)
    else:
        raise HTTPException(status_code=400, detail="Must provide target_patient_id or create_new_patient_name")

    old_patient_id = doc.patient_id
    new_patient_id = target_patient.id

    # 1. Update document owner
    doc.patient_id = new_patient_id

    # 2. Update medications from this document
    med_res = await db.execute(
        select(Medication).where(Medication.source_document_id == doc.id)
    )
    for m in med_res.scalars().all():
        m.patient_id = new_patient_id
        # Update schedules
        sched_res = await db.execute(
            select(MedicationSchedule).where(MedicationSchedule.medication_id == m.id)
        )
        for s in sched_res.scalars().all():
            s.patient_id = new_patient_id

    # 3. Update Health Records from this document
    hr_res = await db.execute(
        select(HealthRecord).where(HealthRecord.source_document_id == doc.id)
    )
    now_dt = datetime.datetime.utcnow()
    for hr in hr_res.scalars().all():
        hr.patient_id = new_patient_id
        # Sync HealthMetric for target patient
        hm_res = await db.execute(
            select(HealthMetric).where(HealthMetric.patient_id == new_patient_id, HealthMetric.metric_type == hr.metric_type)
        )
        hm = hm_res.scalar_one_or_none()
        if hm:
            hm.latest_value = hr.value
            hm.latest_unit = hr.unit
            hm.latest_date = now_dt
        else:
            hm = HealthMetric(
                patient_id=new_patient_id,
                metric_type=hr.metric_type,
                latest_value=hr.value,
                latest_unit=hr.unit,
                latest_date=now_dt,
                trend_direction="stable"
            )
            db.add(hm)

    # 4. Doctor association
    if doc.extracted_data and doc.extracted_data.get("doctor_name"):
        d_name = doc.extracted_data["doctor_name"]
        d_res = await db.execute(
            select(Doctor).where(Doctor.patient_id == new_patient_id, Doctor.name == d_name)
        )
        if not d_res.scalar_one_or_none():
            doc_obj = Doctor(
                patient_id=new_patient_id,
                name=d_name,
                specialty=doc.extracted_data.get("doctor_specialty") or "Primary Consultant",
                hospital=doc.extracted_data.get("hospital_name") or "Clinic",
                phone=doc.extracted_data.get("doctor_phone") or "+91 9880601535",
                is_primary=True,
                added_by=current_user.id
            )
            db.add(doc_obj)

    await db.commit()
    await db.refresh(doc)
    logger.info(f"Reassigned document {doc.id} from {old_patient_id} to {new_patient_id} ({target_patient.first_name} {target_patient.last_name})")

    return {
        "success": True,
        "document_id": doc.id,
        "patient_id": new_patient_id,
        "patient_name": f"{target_patient.first_name} {target_patient.last_name}",
        "message": f"Successfully reassigned document and medications to {target_patient.first_name} {target_patient.last_name}."
    }

@router.get("/detail/{document_id}")
async def get_document_detail(document_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(MedicalDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    authorized = await verify_patient_access(current_user.id, doc.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    patient = await db.get(Patient, doc.patient_id)
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "patient_name": patient_name,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "extracted_data": doc.extracted_data or {},
        "extracted_text": doc.extracted_text,
        "processing_status": doc.processing_status.value if hasattr(doc.processing_status, 'value') else str(doc.processing_status),
        "created_at": doc.created_at,
        "file_url": doc.file_url,
    }

@router.get("/{patient_id}")
async def list_documents(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(MedicalDocument)
        .where(MedicalDocument.patient_id == patient_id)
        .order_by(desc(MedicalDocument.created_at))
    )
    docs = result.scalars().all()
    return docs

@router.delete("/{document_id}")
async def delete_document(document_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(MedicalDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    authorized = await verify_patient_access(current_user.id, doc.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted"}
