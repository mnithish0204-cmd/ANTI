from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import GroundTruthBenchmark, Report, SystemConfig
from .image_engine import calculate_image_similarity
from .text_engine import calculate_text_similarity
from .location_engine import calculate_location_similarity
from .time_engine import calculate_time_similarity

def report_to_dict(report: Report) -> Dict[str, Any]:
    return {
        "id": report.id,
        "item_name": report.item_name,
        "category": report.category,
        "description": report.description,
        "brand": report.brand or "",
        "color": report.color or "",
        "model": report.model or "",
        "distinctive_features": report.distinctive_features or "",
        "image_url": report.image_url,
        "location": report.location,
        "building": report.building or "",
        "floor": report.floor or "",
        "latitude": report.latitude,
        "longitude": report.longitude,
        "date": report.date,
        "time": report.time,
    }

def run_academic_evaluation(db: Session, decision_threshold: float = 0.60) -> Dict[str, Any]:
    """
    Evaluates the 4 matching paradigms against labeled campus ground truth benchmark pairs:
    - Method 1: Keyword / Text-Only Matching
    - Method 2: Image-Only Matching
    - Method 3: Text + Image Multimodal Matching
    - Method 4: Full Multimodal (Text + Image + Location + Time)
    """
    benchmarks = db.query(GroundTruthBenchmark).all()
    if not benchmarks:
        return {
            "total_ground_truth_pairs": 0,
            "methods": []
        }

    config = db.query(SystemConfig).first()
    w_img = config.image_weight if config else 0.40
    w_txt = config.text_weight if config else 0.30
    w_loc = config.location_weight if config else 0.15
    w_tim = config.time_weight if config else 0.15

    # Storage for predictions per method
    method_data = {
        "m1": {"name": "Method 1: Keyword/Text-Only", "scores": [], "y_pred": [], "desc": "Relies solely on semantic token and keyword overlap without visual or spatial context."},
        "m2": {"name": "Method 2: Image-Only", "scores": [], "y_pred": [], "desc": "Relies solely on visual color histogram and edge/contour similarity without metadata."},
        "m3": {"name": "Method 3: Text + Image (Bi-Modal)", "scores": [], "y_pred": [], "desc": "Combines visual and textual similarity with equal weighting, ignoring spatial/temporal context."},
        "m4": {"name": "Method 4: Multimodal Context-Aware (Proposed)", "scores": [], "y_pred": [], "desc": "Holistic campus framework fusing image (40%), text (30%), campus location (15%), and temporal proximity (15%)."}
    }

    y_true = []

    for b in benchmarks:
        lost_rep = db.query(Report).filter(Report.id == b.lost_report_id).first()
        found_rep = db.query(Report).filter(Report.id == b.found_report_id).first()
        if not lost_rep or not found_rep:
            continue

        lost_dict = report_to_dict(lost_rep)
        found_dict = report_to_dict(found_rep)

        s_img = calculate_image_similarity(lost_dict.get("image_url"), found_dict.get("image_url"))
        s_txt = calculate_text_similarity(lost_dict, found_dict)
        s_loc = calculate_location_similarity(lost_dict, found_dict)
        s_tim = calculate_time_similarity(lost_dict, found_dict)

        # M1: Text only
        s_m1 = s_txt
        # M2: Image only
        s_m2 = s_img
        # M3: Text + Image (normalized)
        s_m3 = 0.50 * s_img + 0.50 * s_txt
        # M4: Proposed Multimodal
        s_m4 = w_img * s_img + w_txt * s_txt + w_loc * s_loc + w_tim * s_tim

        is_true = b.is_true_match
        y_true.append(is_true)

        method_data["m1"]["scores"].append(s_m1)
        method_data["m1"]["y_pred"].append(s_m1 >= decision_threshold)

        method_data["m2"]["scores"].append(s_m2)
        method_data["m2"]["y_pred"].append(s_m2 >= decision_threshold)

        method_data["m3"]["scores"].append(s_m3)
        method_data["m3"]["y_pred"].append(s_m3 >= decision_threshold)

        method_data["m4"]["scores"].append(s_m4)
        method_data["m4"]["y_pred"].append(s_m4 >= decision_threshold)

    results = []
    total_samples = len(y_true)

    for key, data in method_data.items():
        tp = sum(1 for yt, yp in zip(y_true, data["y_pred"]) if yt and yp)
        fp = sum(1 for yt, yp in zip(y_true, data["y_pred"]) if not yt and yp)
        fn = sum(1 for yt, yp in zip(y_true, data["y_pred"]) if yt and not yp)
        tn = sum(1 for yt, yp in zip(y_true, data["y_pred"]) if not yt and not yp)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / total_samples if total_samples > 0 else 0.0
        avg_score = sum(data["scores"]) / total_samples if total_samples > 0 else 0.0

        results.append({
            "method_name": data["name"],
            "description": data["desc"],
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "average_score": round(avg_score, 4),
            "sample_size": total_samples
        })

    return {
        "total_ground_truth_pairs": total_samples,
        "methods": results
    }
