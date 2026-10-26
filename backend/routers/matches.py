import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Match, Report, User, Notification
from ..schemas import MatchCandidate, ReportResponse, OwnershipVerificationRequest, OwnershipVerificationResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/matches", tags=["Matches"])

def format_match_response(match: Match, current_user: User) -> dict:
    """
    Constructs a serialized match object with strict role-based privacy controls.
    Contact information of the finder is NEVER exposed before confirmation.
    """
    lost_rep = match.lost_report
    found_rep = match.found_report
    finder_user = found_rep.user if found_rep else None

    # Privacy preservation logic
    is_confirmed = (match.status == "CONFIRMED")
    is_admin = (current_user.role == "admin")
    is_finder = (current_user.id == found_rep.user_id) if found_rep else False
    is_lost_owner = (current_user.id == lost_rep.user_id) if lost_rep else False

    finder_contact_info = None
    if is_confirmed or is_admin:
        # Full contact details unlocked post-confirmation
        if finder_user:
            finder_contact_info = {
                "name": finder_user.name,
                "campus_id": finder_user.campus_id or "STU-CAMPUS",
                "email": finder_user.email,
                "phone": finder_user.phone or "Available via Campus Security",
                "found_location": found_rep.location,
                "found_date": found_rep.date,
                "is_unlocked": True
            }
    else:
        # Privacy-protected masked representation
        finder_contact_info = {
            "name": f"Campus Member ({finder_user.role.title() if finder_user else 'Student'})",
            "campus_id": "••••••••",
            "email": "••••••••@campus.edu",
            "phone": "+91 ••••• •••••",
            "found_location": found_rep.location if found_rep else "On Campus",
            "found_date": found_rep.date if found_rep else "",
            "is_unlocked": False,
        }

    import json
    supp_evidence = []
    conf_evidence = []
    if match.supporting_evidence:
        try:
            supp_evidence = json.loads(match.supporting_evidence)
        except Exception:
            supp_evidence = []
    if match.conflicting_evidence:
        try:
            conf_evidence = json.loads(match.conflicting_evidence)
        except Exception:
            conf_evidence = []

    # Dynamic fallback for older records that didn't have precomputed evidence
    ev_quality = match.evidence_quality or "Good"
    contra_warn = match.contradiction_warning
    if not supp_evidence and not conf_evidence and lost_rep and found_rep:
        from ..ai.contradiction_engine import evaluate_evidence_quality, detect_contradictions_and_evidence
        ev_q = evaluate_evidence_quality(lost_rep.__dict__, found_rep.__dict__)
        ev_data = detect_contradictions_and_evidence(
            lost_rep.__dict__, found_rep.__dict__,
            match.image_score, match.text_score, match.location_score, match.time_score,
            ev_q
        )
        ev_quality = ev_q["overall_quality"]
        supp_evidence = ev_data["supporting_evidence"]
        conf_evidence = ev_data["conflicting_evidence"]
        contra_warn = ev_data["contradiction_warning"]

    verif_status = match.verification_status or ("not_verified" if (lost_rep and lost_rep.private_ownership_attribute) else "unavailable")

    return {
        "id": match.id,
        "lost_report_id": match.lost_report_id,
        "found_report_id": match.found_report_id,
        "image_score": match.image_score,
        "text_score": match.text_score,
        "location_score": match.location_score,
        "time_score": match.time_score,
        "overall_score": match.overall_score,
        "classification": match.classification,
        "explanation": match.explanation,
        "status": match.status,
        "evidence_quality": ev_quality,
        "supporting_evidence": supp_evidence,
        "conflicting_evidence": conf_evidence,
        "contradiction_warning": contra_warn,
        "verification_status": verif_status,
        "verification_attempt": match.verification_attempt,
        "ownership_verification_result": match.ownership_verification_result,
        "created_at": match.created_at,
        "confirmed_at": match.confirmed_at,
        "lost_report": lost_rep,
        "found_report": found_rep,
        "finder_contact": finder_contact_info
    }

@router.get("", response_model=List[MatchCandidate])
def get_matches(
    classification: Optional[str] = None,
    match_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Match).join(Report, Match.lost_report_id == Report.id)

    if current_user.role != "admin":
        # Students/Finders see matches involving their own reports
        user_report_ids = [r.id for r in db.query(Report.id).filter(Report.user_id == current_user.id).all()]
        query = query.filter(
            (Match.lost_report_id.in_(user_report_ids)) |
            (Match.found_report_id.in_(user_report_ids))
        )

    if classification:
        query = query.filter(Match.classification == classification)
    if match_status:
        query = query.filter(Match.status == match_status)

    matches = query.order_by(Match.overall_score.desc()).all()
    return [format_match_response(m, current_user) for m in matches]

@router.get("/{match_id}", response_model=MatchCandidate)
def get_match_detail(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Access check: user must be lost owner, finder, or admin
    lost_user_id = match.lost_report.user_id if match.lost_report else None
    found_user_id = match.found_report.user_id if match.found_report else None

    if current_user.role != "admin" and current_user.id not in [lost_user_id, found_user_id]:
        raise HTTPException(status_code=403, detail="Access denied to this match candidate")

    return format_match_response(match, current_user)

@router.post("/{match_id}/confirm", response_model=MatchCandidate)
def confirm_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    lost_rep = match.lost_report
    found_rep = match.found_report

    # Only lost owner, finder, or admin can confirm
    authorized = (
        current_user.role == "admin" or
        current_user.id == lost_rep.user_id or
        current_user.id == found_rep.user_id
    )
    if not authorized:
        raise HTTPException(status_code=403, detail="You do not have permission to confirm this match")

    # Update Match status
    match.status = "CONFIRMED"
    match.confirmed_at = datetime.datetime.utcnow()
    match.confirmed_by = current_user.id

    # Mark corresponding reports as resolved to prevent duplicate matching
    lost_rep.status = "resolved"
    found_rep.status = "resolved"

    # Invalidate/close other pending matches for these items
    other_matches = db.query(Match).filter(
        ((Match.lost_report_id == lost_rep.id) | (Match.found_report_id == found_rep.id)),
        Match.id != match.id,
        Match.status == "PENDING"
    ).all()
    for om in other_matches:
        om.status = "REJECTED"

    # Create Notifications for both parties
    # Notification for Lost Owner
    notif_owner = Notification(
        user_id=lost_rep.user_id,
        match_id=match.id,
        report_id=lost_rep.id,
        type="MATCH_CONFIRMED",
        title="Match Confirmed! Finder Details Unlocked",
        message=f"Ownership of '{lost_rep.item_name}' was verified. Finder contact details are now revealed in Match Details for item recovery."
    )
    db.add(notif_owner)

    # Notification for Finder
    notif_finder = Notification(
        user_id=found_rep.user_id,
        match_id=match.id,
        report_id=found_rep.id,
        type="MATCH_CONFIRMED",
        title="Match Confirmed! Item Recovered",
        message=f"The owner confirmed their match for '{found_rep.item_name}'. Thank you for supporting campus integrity!"
    )
    db.add(notif_finder)

    db.commit()
    db.refresh(match)

    return format_match_response(match, current_user)

@router.post("/{match_id}/reject", response_model=MatchCandidate)
def reject_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    lost_rep = match.lost_report
    found_rep = match.found_report

    authorized = (
        current_user.role == "admin" or
        current_user.id == lost_rep.user_id or
        current_user.id == found_rep.user_id
    )
    if not authorized:
        raise HTTPException(status_code=403, detail="Permission denied to reject this match")

    match.status = "REJECTED"
    
    # Notify user who didn't reject
    other_user_id = found_rep.user_id if current_user.id == lost_rep.user_id else lost_rep.user_id
    reject_notif = Notification(
        user_id=other_user_id,
        match_id=match.id,
        report_id=lost_rep.id,
        type="MATCH_REJECTED",
        title="Potential Match Dismissed",
        message=f"A potential match for '{lost_rep.item_name}' was reviewed and determined to not be a match."
    )
    db.add(reject_notif)

    db.commit()
    db.refresh(match)
    return format_match_response(match, current_user)

@router.post("/{match_id}/request-confirmation", response_model=MatchCandidate)
def request_confirmation(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = "REQUESTED"
    
    target_user_id = match.found_report.user_id if current_user.id == match.lost_report.user_id else match.lost_report.user_id
    req_notif = Notification(
        user_id=target_user_id,
        match_id=match.id,
        report_id=match.lost_report_id,
        type="POTENTIAL_MATCH",
        title="Verification Requested",
        message=f"A user has requested confirmation for the match between '{match.lost_report.item_name}' and '{match.found_report.item_name}'."
    )
    db.add(req_notif)
    db.commit()
    db.refresh(match)
    return format_match_response(match, current_user)

@router.post("/{match_id}/verify-ownership", response_model=OwnershipVerificationResponse)
def verify_ownership(
    match_id: int,
    request: OwnershipVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Private Ownership Verification:
    Compares the user's provided secret identifying detail against the stored
    private ownership attribute of the lost item report.
    CRITICAL: Never reveals the stored private attribute in the response.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    lost_rep = match.lost_report
    found_rep = match.found_report

    authorized = (
        current_user.role == "admin" or
        (lost_rep and current_user.id == lost_rep.user_id) or
        (found_rep and current_user.id == found_rep.user_id)
    )
    if not authorized:
        raise HTTPException(status_code=403, detail="Permission denied to verify this match")

    from ..ai.ownership_engine import verify_ownership_attribute
    stored_secret = lost_rep.private_ownership_attribute if lost_rep else None
    status_val, score, msg = verify_ownership_attribute(request.attribute_detail, stored_secret)

    # Update match record with verification results
    match.verification_status = status_val
    match.verification_attempt = request.attribute_detail
    match.ownership_verification_result = msg

    # Update dynamic explanation to incorporate verification outcome
    if lost_rep and found_rep:
        from ..ai.fusion_engine import generate_dynamic_explanation
        match.explanation = generate_dynamic_explanation(
            lost_rep.__dict__, found_rep.__dict__,
            match.image_score, match.text_score, match.location_score, match.time_score,
            match.overall_score,
            verification_status=status_val
        )

    db.commit()
    db.refresh(match)

    return OwnershipVerificationResponse(
        status=status_val,
        verification_status=status_val,
        similarity_score=score,
        message=msg,
        match_id=match.id
    )

