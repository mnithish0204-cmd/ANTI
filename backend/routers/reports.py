import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Report, User, Match, Notification, SystemConfig
from ..schemas import ReportResponse, ImageValidationResponse
from ..auth import get_current_user
from ..config import settings
from ..ai.fusion_engine import calculate_multimodal_match
from ..ai.relevance_engine import validate_image_relevance, IRRELEVANT_MESSAGE

router = APIRouter(prefix="/api/reports", tags=["Reports"])

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

import json

def trigger_ai_matching_for_report(new_report: Report, db: Session):
    """
    Automated Multimodal Matching Trigger:
    Compares the newly created report against existing active reports of the opposite type.
    Stores match results, evidence quality, contradiction detection, and notifications.
    """
    try:
        config = db.query(SystemConfig).first()
        weights = {
            "image_weight": config.image_weight if config else settings.IMAGE_WEIGHT,
            "text_weight": config.text_weight if config else settings.TEXT_WEIGHT,
            "location_weight": config.location_weight if config else settings.LOCATION_WEIGHT,
            "time_weight": config.time_weight if config else settings.TIME_WEIGHT,
        }
        thresholds = {
            "high_threshold": config.high_threshold if config else settings.HIGH_THRESHOLD,
            "possible_threshold": config.possible_threshold if config else settings.POSSIBLE_THRESHOLD,
        }

        # Opposite report type
        target_type = "found" if new_report.report_type == "lost" else "lost"
        candidate_reports = db.query(Report).filter(
            Report.report_type == target_type,
            Report.status.in_(["active", "matched"])
        ).all()

        for cand in candidate_reports:
            # Determine lost vs found
            if new_report.report_type == "lost":
                lost_rep = new_report
                found_rep = cand
            else:
                lost_rep = cand
                found_rep = new_report

            # Skip if user is matching against their own item
            if lost_rep.user_id == found_rep.user_id:
                continue

            # Dict representations for AI functions
            lost_dict = {
                "id": lost_rep.id,
                "item_name": lost_rep.item_name,
                "category": lost_rep.category,
                "description": lost_rep.description,
                "brand": lost_rep.brand,
                "color": lost_rep.color,
                "model": lost_rep.model,
                "distinctive_features": lost_rep.distinctive_features,
                "image_url": lost_rep.image_url,
                "location": lost_rep.location,
                "building": lost_rep.building,
                "floor": lost_rep.floor,
                "latitude": lost_rep.latitude,
                "longitude": lost_rep.longitude,
                "date": lost_rep.date,
                "time": lost_rep.time,
            }
            found_dict = {
                "id": found_rep.id,
                "item_name": found_rep.item_name,
                "category": found_rep.category,
                "description": found_rep.description,
                "brand": found_rep.brand,
                "color": found_rep.color,
                "model": found_rep.model,
                "distinctive_features": found_rep.distinctive_features,
                "image_url": found_rep.image_url,
                "location": found_rep.location,
                "building": found_rep.building,
                "floor": found_rep.floor,
                "latitude": found_rep.latitude,
                "longitude": found_rep.longitude,
                "date": found_rep.date,
                "time": found_rep.time,
            }

            img_s, txt_s, loc_s, tim_s, overall_s, classification, explanation, ev_data = calculate_multimodal_match(
                lost_dict, found_dict, weights, thresholds
            )

            # Check if match already exists
            existing_match = db.query(Match).filter(
                Match.lost_report_id == lost_rep.id,
                Match.found_report_id == found_rep.id
            ).first()

            supp_json = json.dumps(ev_data.get("supporting_evidence", []))
            conf_json = json.dumps(ev_data.get("conflicting_evidence", []))
            warn_msg = ev_data.get("contradiction_warning")
            ev_quality = ev_data.get("evidence_quality", "Good")

            if existing_match:
                existing_match.image_score = img_s
                existing_match.text_score = txt_s
                existing_match.location_score = loc_s
                existing_match.time_score = tim_s
                existing_match.overall_score = overall_s
                existing_match.classification = classification
                existing_match.explanation = explanation
                existing_match.evidence_quality = ev_quality
                existing_match.supporting_evidence = supp_json
                existing_match.conflicting_evidence = conf_json
                existing_match.contradiction_warning = warn_msg
                match_record = existing_match
            else:
                init_verif = "not_verified" if lost_rep.private_ownership_attribute else "unavailable"
                match_record = Match(
                    lost_report_id=lost_rep.id,
                    found_report_id=found_rep.id,
                    image_score=img_s,
                    text_score=txt_s,
                    location_score=loc_s,
                    time_score=tim_s,
                    overall_score=overall_s,
                    classification=classification,
                    explanation=explanation,
                    status="PENDING",
                    evidence_quality=ev_quality,
                    supporting_evidence=supp_json,
                    conflicting_evidence=conf_json,
                    contradiction_warning=warn_msg,
                    verification_status=init_verif
                )
                db.add(match_record)
            
            db.commit()
            db.refresh(match_record)

            # If score crosses possible or high threshold, create in-app notification
            if overall_s >= thresholds["possible_threshold"]:
                score_pct = int(overall_s * 100)
                lost_notif = Notification(
                    user_id=lost_rep.user_id,
                    match_id=match_record.id,
                    report_id=lost_rep.id,
                    type="POTENTIAL_MATCH",
                    title=f"Potential Match Found ({score_pct}%)",
                    message=f"AI detected a {classification.replace('_', ' ').title()} ({score_pct}%) for your lost '{lost_rep.item_name}' near {found_rep.location}."
                )
                db.add(lost_notif)

                finder_notif = Notification(
                    user_id=found_rep.user_id,
                    match_id=match_record.id,
                    report_id=found_rep.id,
                    type="FINDER_ALERT",
                    title=f"Potential Owner Match ({score_pct}%)",
                    message=f"A reported lost item ('{lost_rep.item_name}') may correspond to the item you reported finding."
                )
                db.add(finder_notif)
                db.commit()

    except Exception as e:
        print(f"Error in automatic multimodal matching: {e}")

@router.post("/validate-image", response_model=ImageValidationResponse)
async def validate_uploaded_image(
    image: UploadFile = File(...),
    item_name: str = Form(...),
    category: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    color: Optional[str] = Form(""),
    brand: Optional[str] = Form(""),
    model: Optional[str] = Form(""),
    distinctive_features: Optional[str] = Form("")
):
    """
    Validates whether the uploaded image is relevant to the entered item details
    (name, category, description, color, brand, model, features) using CLIP multimodal embeddings.
    """
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type. Accepted: JPEG, PNG, WEBP.")

    ext = os.path.splitext(image.filename)[1] or ".jpg"
    temp_filename = f"temp_val_{uuid.uuid4().hex}{ext}"
    temp_dest = os.path.join(settings.UPLOAD_DIR, temp_filename)

    try:
        with open(temp_dest, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        val_res = validate_image_relevance(
            image_path=temp_dest,
            item_name=item_name,
            category=category or "",
            description=description or "",
            color=color or "",
            brand=brand or "",
            model=model or "",
            distinctive_features=distinctive_features or ""
        )
        is_relevant, sim_score, thresh, message, val_status = val_res[:5]
        calibrated_score = getattr(val_res, "relevance_score", sim_score)

        return ImageValidationResponse(
            is_relevant=is_relevant,
            similarity_score=sim_score,
            relevanceScore=calibrated_score,
            threshold=thresh,
            status=val_status,
            message=message
        )
    except Exception as e:
        print(f"Image relevance validation error: {e}")
        return ImageValidationResponse(
            is_relevant=False,
            similarity_score=0.0,
            relevanceScore=0.0,
            threshold=settings.IMAGE_RELEVANCE_THRESHOLD,
            status="error",
            message=IRRELEVANT_MESSAGE
        )
    finally:
        if os.path.exists(temp_dest):
            try:
                os.remove(temp_dest)
            except Exception:
                pass

@router.post("", response_model=ReportResponse)
async def create_report(
    report_type: str = Form(...),
    item_name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    brand: Optional[str] = Form(""),
    color: Optional[str] = Form(""),
    model: Optional[str] = Form(""),
    distinctive_features: Optional[str] = Form(""),
    location: str = Form(...),
    building: Optional[str] = Form(""),
    floor: Optional[str] = Form(""),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    date: str = Form(...),
    time: str = Form(...),
    private_ownership_attribute: Optional[str] = Form(""),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if report_type not in ["lost", "found"]:
        raise HTTPException(status_code=400, detail="Invalid report type. Must be 'lost' or 'found'.")

    image_path = None
    img_rel_score = None
    img_rel_status = None

    if image and image.filename:
        # Validate MIME type
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Invalid image type. Accepted: JPEG, PNG, WEBP.")
        
        # Unique filename
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_dest = os.path.join(settings.UPLOAD_DIR, unique_name)
        
        with open(save_dest, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_path = save_dest

        val_res = validate_image_relevance(
            image_path=image_path,
            item_name=item_name,
            category=category,
            description=description,
            color=color or "",
            brand=brand or "",
            model=model or "",
            distinctive_features=distinctive_features or ""
        )
        is_relevant, sim_score, thresh, val_msg, val_status = val_res[:5]
        img_rel_score = getattr(val_res, "relevance_score", sim_score)
        img_rel_status = val_status

        if not is_relevant:
            # Clean up irrelevant uploaded image
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception:
                    pass
            raise HTTPException(
                status_code=400,
                detail=IRRELEVANT_MESSAGE
            )

    new_report = Report(
        user_id=current_user.id,
        report_type=report_type,
        item_name=item_name,
        category=category,
        description=description,
        brand=brand or "",
        color=color or "",
        model=model or "",
        distinctive_features=distinctive_features or "",
        image_url=image_path,
        location=location,
        building=building or "",
        floor=floor or "",
        latitude=latitude,
        longitude=longitude,
        date=date,
        time=time,
        status="active",
        private_ownership_attribute=private_ownership_attribute or "",
        image_relevance_score=img_rel_score,
        image_relevance_status=img_rel_status
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Automatically trigger Multimodal AI matching pipeline
    trigger_ai_matching_for_report(new_report, db)

    resp_dict = {
        **new_report.__dict__,
        "user_name": current_user.name
    }
    return resp_dict

@router.get("/my", response_model=List[ReportResponse])
def get_my_reports(
    report_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Report).filter(Report.user_id == current_user.id)
    if report_type:
        query = query.filter(Report.report_type == report_type)
    reports = query.order_by(Report.created_at.desc()).all()
    for r in reports:
        r.user_name = current_user.name
    return reports

@router.get("/all", response_model=List[ReportResponse])
def get_all_reports(
    report_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if report_type:
        query = query.filter(Report.report_type == report_type)
    if category:
        query = query.filter(Report.category == category)
    if search:
        query = query.filter(
            (Report.item_name.ilike(f"%{search}%")) |
            (Report.description.ilike(f"%{search}%")) |
            (Report.location.ilike(f"%{search}%"))
        )
    reports = query.order_by(Report.created_at.desc()).all()
    for r in reports:
        if r.user:
            r.user_name = r.user.name
    return reports

@router.get("/{report_id}", response_model=ReportResponse)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.user_name = report.user.name if report.user else "Campus Member"
    return report
