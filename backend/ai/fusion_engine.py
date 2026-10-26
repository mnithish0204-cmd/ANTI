from typing import Dict, Any, Tuple
from .image_engine import calculate_image_similarity
from .text_engine import calculate_text_similarity
from .location_engine import calculate_location_similarity
from .time_engine import calculate_time_similarity, parse_datetime
from .contradiction_engine import (
    evaluate_evidence_quality,
    detect_contradictions_and_evidence,
    generate_contradiction_aware_explanation
)

def generate_dynamic_explanation(
    report_lost: Dict[str, Any],
    report_found: Dict[str, Any],
    image_score: float,
    text_score: float,
    loc_score: float,
    time_score: float,
    overall_score: float,
    verification_status: str = None
) -> str:
    """
    Synthesizes a realistic, dynamic Explainable AI (XAI) rationale
    incorporating modality similarities, evidence quality, and contradiction detection.
    """
    evidence_quality = evaluate_evidence_quality(report_lost, report_found)
    contradiction_info = detect_contradictions_and_evidence(
        report_lost, report_found,
        image_score, text_score, loc_score, time_score,
        evidence_quality
    )
    return generate_contradiction_aware_explanation(
        report_lost, report_found,
        image_score, text_score, loc_score, time_score, overall_score,
        contradiction_info,
        verification_status=verification_status
    )

def calculate_multimodal_match(
    report_lost: Dict[str, Any],
    report_found: Dict[str, Any],
    weights: Dict[str, float],
    thresholds: Dict[str, float],
    verification_status: str = None
) -> Tuple[float, float, float, float, float, str, str, Dict[str, Any]]:
    """
    Executes the multimodal AI pipeline across Image, Text, Location, and Time.
    Integrates evidence quality analysis and contradiction detection.
    Returns:
    (image_score, text_score, location_score, time_score, overall_score, classification, explanation, evidence_data)
    """
    w_img = weights.get("image_weight", 0.40)
    w_txt = weights.get("text_weight", 0.30)
    w_loc = weights.get("location_weight", 0.15)
    w_tim = weights.get("time_weight", 0.15)

    high_thresh = thresholds.get("high_threshold", 0.80)
    poss_thresh = thresholds.get("possible_threshold", 0.60)

    # Calculate modality scores
    image_score = calculate_image_similarity(
        report_lost.get("image_url"),
        report_found.get("image_url")
    )
    text_score = calculate_text_similarity(report_lost, report_found)
    location_score = calculate_location_similarity(report_lost, report_found)
    time_score = calculate_time_similarity(report_lost, report_found)

    # Rebalance weights if an image is missing on either side
    lost_has_img = bool(report_lost.get("image_url"))
    found_has_img = bool(report_found.get("image_url"))
    if not (lost_has_img and found_has_img):
        eff_w_img = 0.10
        rem = 1.0 - eff_w_img
        sum_other = w_txt + w_loc + w_tim
        eff_w_txt = (w_txt / sum_other) * rem
        eff_w_loc = (w_loc / sum_other) * rem
        eff_w_tim = (w_tim / sum_other) * rem
    else:
        eff_w_img = w_img
        eff_w_txt = w_txt
        eff_w_loc = w_loc
        eff_w_tim = w_tim

    # Weighted Multimodal Fusion Score
    overall_score = (
        eff_w_img * image_score +
        eff_w_txt * text_score +
        eff_w_loc * location_score +
        eff_w_tim * time_score
    )
    overall_score = max(0.0, min(1.0, float(overall_score)))

    # Classification
    if overall_score >= high_thresh:
        classification = "HIGH_POTENTIAL"
    elif overall_score >= poss_thresh:
        classification = "POSSIBLE"
    else:
        classification = "LOW"

    # Evidence Quality & Contradiction Detection layer
    evidence_quality = evaluate_evidence_quality(report_lost, report_found)
    contradiction_info = detect_contradictions_and_evidence(
        report_lost, report_found,
        image_score, text_score, location_score, time_score,
        evidence_quality
    )

    # Explainable AI dynamically synthesized with contradiction awareness
    explanation = generate_contradiction_aware_explanation(
        report_lost, report_found,
        image_score, text_score, location_score, time_score, overall_score,
        contradiction_info,
        verification_status=verification_status
    )

    evidence_data = {
        "evidence_quality": evidence_quality["overall_quality"],
        "supporting_evidence": contradiction_info["supporting_evidence"],
        "conflicting_evidence": contradiction_info["conflicting_evidence"],
        "missing_evidence": contradiction_info["missing_evidence"],
        "contradiction_warning": contradiction_info["contradiction_warning"]
    }

    return (
        round(image_score, 4),
        round(text_score, 4),
        round(location_score, 4),
        round(time_score, 4),
        round(overall_score, 4),
        classification,
        explanation,
        evidence_data
    )

