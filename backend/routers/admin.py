import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Report, Match, User, Notification, SystemConfig, GroundTruthBenchmark
from ..schemas import ConfigResponse, ConfigUpdate, EvaluationResponse
from ..auth import require_admin, get_current_user
from ..config import settings
from ..ai.evaluator import run_academic_evaluation

router = APIRouter(prefix="/api/admin", tags=["Admin & Research"])

@router.get("/analytics")
def get_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_lost = db.query(Report).filter(Report.report_type == "lost").count()
    total_found = db.query(Report).filter(Report.report_type == "found").count()
    total_reports = total_lost + total_found

    total_matches = db.query(Match).count()
    potential_matches = db.query(Match).filter(Match.classification.in_(["HIGH_POTENTIAL", "POSSIBLE"])).count()
    confirmed_matches = db.query(Match).filter(Match.status == "CONFIRMED").count()
    rejected_matches = db.query(Match).filter(Match.status == "REJECTED").count()

    # Average match score
    avg_score_res = db.query(func.avg(Match.overall_score)).scalar()
    avg_match_score = float(avg_score_res) if avg_score_res is not None else 0.0

    # Matching success rate (% of lost items resolved or confirmed)
    resolved_lost = db.query(Report).filter(Report.report_type == "lost", Report.status == "resolved").count()
    success_rate = (resolved_lost / total_lost * 100.0) if total_lost > 0 else 0.0

    # Reports by Category
    category_counts = db.query(
        Report.category, func.count(Report.id)
    ).group_by(Report.category).all()
    categories_data = [{"category": c or "Uncategorized", "count": count} for c, count in category_counts]

    # Reports by Campus Location / Building
    location_counts = db.query(
        Report.building, func.count(Report.id)
    ).filter(Report.building != None, Report.building != "").group_by(Report.building).all()
    if not location_counts:
        location_counts = db.query(
            Report.location, func.count(Report.id)
        ).group_by(Report.location).limit(8).all()
    locations_data = [{"location": loc or "Campus Grounds", "count": count} for loc, count in location_counts]

    # Score distribution brackets
    high_count = db.query(Match).filter(Match.classification == "HIGH_POTENTIAL").count()
    possible_count = db.query(Match).filter(Match.classification == "POSSIBLE").count()
    low_count = db.query(Match).filter(Match.classification == "LOW").count()

    # Timeline (last 7 days reports activity)
    now = datetime.datetime.utcnow()
    timeline_data = []
    for i in range(6, -1, -1):
        day_date = (now - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        day_lost = db.query(Report).filter(Report.report_type == "lost", Report.date == day_date).count()
        day_found = db.query(Report).filter(Report.report_type == "found", Report.date == day_date).count()
        timeline_data.append({
            "date": day_date,
            "lost": day_lost,
            "found": day_found
        })

    return {
        "kpi": {
            "total_lost": total_lost,
            "total_found": total_found,
            "total_reports": total_reports,
            "potential_matches": potential_matches,
            "confirmed_matches": confirmed_matches,
            "rejected_matches": rejected_matches,
            "avg_match_score": round(avg_match_score, 3),
            "matching_success_rate": round(success_rate, 1),
        },
        "score_distribution": {
            "high": high_count,
            "possible": possible_count,
            "low": low_count
        },
        "by_category": categories_data,
        "by_location": locations_data,
        "timeline": timeline_data
    }

@router.get("/config", response_model=ConfigResponse)
def get_system_config(db: Session = Depends(get_db)):
    cfg = db.query(SystemConfig).first()
    if not cfg:
        cfg = SystemConfig(
            image_weight=settings.IMAGE_WEIGHT,
            text_weight=settings.TEXT_WEIGHT,
            location_weight=settings.LOCATION_WEIGHT,
            time_weight=settings.TIME_WEIGHT,
            high_threshold=settings.HIGH_THRESHOLD,
            possible_threshold=settings.POSSIBLE_THRESHOLD
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

@router.put("/config", response_model=ConfigResponse)
def update_system_config(
    new_cfg: ConfigUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Validate sum of weights approximately equals 1.0
    weight_sum = new_cfg.image_weight + new_cfg.text_weight + new_cfg.location_weight + new_cfg.time_weight
    if abs(weight_sum - 1.0) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"The sum of modality weights should equal 1.0 (current sum: {round(weight_sum, 2)})"
        )

    cfg = db.query(SystemConfig).first()
    if not cfg:
        cfg = SystemConfig()
        db.add(cfg)

    cfg.image_weight = new_cfg.image_weight
    cfg.text_weight = new_cfg.text_weight
    cfg.location_weight = new_cfg.location_weight
    cfg.time_weight = new_cfg.time_weight
    cfg.high_threshold = new_cfg.high_threshold
    cfg.possible_threshold = new_cfg.possible_threshold

    db.commit()
    db.refresh(cfg)
    return cfg

@router.get("/evaluation", response_model=EvaluationResponse)
def get_academic_evaluation(
    threshold: float = 0.60,
    db: Session = Depends(get_db)
):
    """
    Academic Research Benchmark:
    Calculates Precision, Recall, F1, Accuracy, and Mean Similarity
    over actual labeled test pairs across Methods 1 to 4.
    """
    eval_results = run_academic_evaluation(db, decision_threshold=threshold)
    return {
        "timestamp": datetime.datetime.utcnow(),
        "total_ground_truth_pairs": eval_results["total_ground_truth_pairs"],
        "methods": eval_results["methods"]
    }

@router.delete("/reports/{report_id}")
def admin_delete_report(
    report_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete related matches
    db.query(Match).filter(
        (Match.lost_report_id == report_id) | (Match.found_report_id == report_id)
    ).delete(synchronize_session=False)

    db.delete(rep)
    db.commit()
    return {"status": "success", "message": f"Report #{report_id} and associated matches deleted."}
