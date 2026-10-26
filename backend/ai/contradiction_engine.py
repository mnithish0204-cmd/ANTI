import math
import os
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from PIL import Image, ImageStat
from .time_engine import parse_datetime

def evaluate_evidence_quality(
    report_lost: Dict[str, Any],
    report_found: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates whether the available information across image, description,
    location, and time is reliable enough to contribute strongly to the final match.
    Distinguishes low/missing evidence from contradictory evidence.
    """
    quality_details = {
        "image_quality": "good",
        "text_quality": "good",
        "location_quality": "good",
        "time_quality": "good",
        "overall_quality": "Good",
        "notes": []
    }

    # 1. Image Evidence Quality
    img_lost = report_lost.get("image_url")
    img_found = report_found.get("image_url")

    if not img_lost and not img_found:
        quality_details["image_quality"] = "missing"
        quality_details["notes"].append("No photographs provided for either report; visual evidence unavailable.")
    elif not img_lost or not img_found:
        quality_details["image_quality"] = "partial"
        quality_details["notes"].append("Only one report includes a photograph; visual comparison confidence calibrated.")
    else:
        # Check image files for extreme darkness, blurriness, or low resolution
        for label, path in [("Lost item photo", img_lost), ("Found item photo", img_found)]:
            if path and os.path.exists(path):
                try:
                    with Image.open(path) as img:
                        w, h = img.size
                        if w < 100 or h < 100:
                            quality_details["image_quality"] = "low"
                            quality_details["notes"].append(f"{label} has very low resolution ({w}x{h}).")
                        
                        stat = ImageStat.Stat(img.convert("L"))
                        mean_brightness = stat.mean[0]
                        std_contrast = stat.stddev[0]

                        if mean_brightness < 25:
                            quality_details["image_quality"] = "low"
                            quality_details["notes"].append(f"{label} is extremely dark; reduced visual confidence.")
                        elif std_contrast < 14:
                            quality_details["image_quality"] = "low"
                            quality_details["notes"].append(f"{label} exhibits low contrast or blur; visual confidence reduced.")
                except Exception:
                    pass

    # 2. Text Evidence Quality
    desc_lost = (report_lost.get("description") or "").strip()
    desc_found = (report_found.get("description") or "").strip()
    brand_lost = (report_lost.get("brand") or "").strip()
    color_lost = (report_lost.get("color") or "").strip()
    feat_lost = (report_lost.get("distinctive_features") or "").strip()

    word_count_lost = len(desc_lost.split())
    word_count_found = len(desc_found.split())

    if word_count_lost < 4 and word_count_found < 4:
        quality_details["text_quality"] = "limited"
        quality_details["notes"].append("Brief descriptions provided ('low text evidence'); semantic certainty limited.")
    elif (word_count_lost > 10 or feat_lost) and (word_count_found > 10):
        quality_details["text_quality"] = "high"
    else:
        quality_details["text_quality"] = "good"

    # 3. Location Evidence Quality
    loc_lost = (report_lost.get("location") or "").strip().lower()
    loc_found = (report_found.get("location") or "").strip().lower()
    bldg_lost = (report_lost.get("building") or "").strip()
    bldg_found = (report_found.get("building") or "").strip()

    if not loc_lost or loc_lost == "campus" or not loc_found or loc_found == "campus":
        quality_details["location_quality"] = "missing"
    elif bldg_lost and bldg_found:
        quality_details["location_quality"] = "high"
    else:
        quality_details["location_quality"] = "moderate"

    # 4. Time Evidence Quality
    date_lost = (report_lost.get("date") or "").strip()
    date_found = (report_found.get("date") or "").strip()
    time_lost = (report_lost.get("time") or "").strip()
    time_found = (report_found.get("time") or "").strip()

    if not date_lost or not date_found:
        quality_details["time_quality"] = "missing"
    elif time_lost and time_found:
        quality_details["time_quality"] = "high"
    else:
        quality_details["time_quality"] = "moderate"

    # Overall Evidence Quality Rating Synthesis
    high_count = sum(1 for q in [quality_details["image_quality"], quality_details["text_quality"], quality_details["location_quality"], quality_details["time_quality"]] if q in ["high", "good"])
    low_or_missing = sum(1 for q in [quality_details["image_quality"], quality_details["text_quality"], quality_details["location_quality"], quality_details["time_quality"]] if q in ["low", "missing", "limited"])

    if high_count >= 3 and low_or_missing == 0:
        quality_details["overall_quality"] = "High"
    elif high_count >= 2 and low_or_missing <= 1:
        quality_details["overall_quality"] = "Good"
    elif low_or_missing >= 2:
        quality_details["overall_quality"] = "Moderate"
    else:
        quality_details["overall_quality"] = "Limited"

    return quality_details

def detect_contradictions_and_evidence(
    report_lost: Dict[str, Any],
    report_found: Dict[str, Any],
    image_score: float,
    text_score: float,
    loc_score: float,
    time_score: float,
    evidence_quality: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Identifies supporting, weak, conflicting, and missing evidence.
    CRITICAL: Missing information (e.g. missing location, missing time, missing photo)
    is strictly classified as 'missing evidence' or 'low evidence', NEVER as a contradiction.
    Contradictions only trigger when explicit evidence sources actively conflict.
    """
    supporting_evidence: List[str] = []
    weak_evidence: List[str] = []
    conflicting_evidence: List[str] = []
    missing_evidence: List[str] = []

    # ---------------- 1. Visual Evidence ----------------
    has_lost_img = bool(report_lost.get("image_url"))
    has_found_img = bool(report_found.get("image_url"))

    if not (has_lost_img and has_found_img):
        missing_evidence.append("Photo not provided for one or both reports; visual evidence unavailable.")
    else:
        if image_score >= 0.80:
            supporting_evidence.append(f"Strong visual similarity ({int(image_score * 100)}%) detected across contours and color features.")
        elif image_score >= 0.60:
            supporting_evidence.append(f"Moderate visual similarity ({int(image_score * 100)}%) with matching general form factor.")
        else:
            weak_evidence.append(f"Visual similarity is low ({int(image_score * 100)}%).")

    # ---------------- 2. Text / Attribute Evidence ----------------
    lost_item = report_lost.get("item_name", "Lost item")
    found_item = report_found.get("item_name", "Found item")
    color_lost = (report_lost.get("color") or "").strip().lower()
    color_found = (report_found.get("color") or "").strip().lower()
    brand_lost = (report_lost.get("brand") or "").strip().lower()
    brand_found = (report_found.get("brand") or "").strip().lower()

    if text_score >= 0.75:
        supporting_evidence.append(f"High semantic description similarity ({int(text_score * 100)}%) between '{lost_item}' and '{found_item}'.")
    elif text_score >= 0.55:
        supporting_evidence.append(f"Descriptions share category terminology ({int(text_score * 100)}%).")
    else:
        weak_evidence.append(f"Description similarity is limited ({int(text_score * 100)}%).")

    # Explicit attribute agreements or direct conflicts
    if color_lost and color_found:
        if color_lost in color_found or color_found in color_lost:
            supporting_evidence.append(f"Color match confirmed ('{color_lost}').")
        else:
            conflicting_evidence.append(f"Reported colors differ: '{color_lost}' vs '{color_found}'.")

    if brand_lost and brand_found:
        if brand_lost in brand_found or brand_found in brand_lost:
            supporting_evidence.append(f"Brand alignment confirmed ('{brand_lost.title()}').")
        else:
            conflicting_evidence.append(f"Reported brands conflict: '{brand_lost.title()}' vs '{brand_found.title()}'.")

    # ---------------- 3. Location Evidence & Contradiction ----------------
    loc_lost = (report_lost.get("location") or "").strip()
    loc_found = (report_found.get("location") or "").strip()
    bldg_lost = (report_lost.get("building") or "").strip()
    bldg_found = (report_found.get("building") or "").strip()

    loc_is_missing = (not loc_lost or loc_lost.lower() in ["campus", "unknown"]) or \
                     (not loc_found or loc_found.lower() in ["campus", "unknown"])

    if loc_is_missing:
        missing_evidence.append("Campus location not specified in one of the reports (treated as unavailable, not contradiction).")
    else:
        if loc_score >= 0.80:
            supporting_evidence.append(f"Campus location is highly consistent ({loc_lost}).")
        elif loc_score >= 0.60:
            supporting_evidence.append(f"Locations within same campus sector ({bldg_lost or loc_lost} vs {bldg_found or loc_found}).")
        else:
            # Check for conflict: if visual or text is strong (>=0.65) but locations are in distant campus zones
            if (image_score >= 0.65 or text_score >= 0.65) and loc_score <= 0.40:
                conflicting_evidence.append(f"Reported campus locations differ significantly ('{loc_lost}' vs '{loc_found}').")
            else:
                weak_evidence.append(f"Campus locations are separated ({loc_lost} vs {loc_found}).")

    # ---------------- 4. Temporal Evidence & Contradiction ----------------
    date_lost = (report_lost.get("date") or "").strip()
    date_found = (report_found.get("date") or "").strip()
    time_lost = (report_lost.get("time") or "").strip()
    time_found = (report_found.get("time") or "").strip()

    time_is_missing = not date_lost or not date_found

    if time_is_missing:
        missing_evidence.append("Reported time stamps unavailable (treated as unavailable, not contradiction).")
    else:
        try:
            dt_lost = parse_datetime(date_lost, time_lost)
            dt_found = parse_datetime(date_found, time_found)
            hours_diff = abs((dt_found - dt_lost).total_seconds()) / 3600.0

            if hours_diff <= 2.0:
                supporting_evidence.append(f"Reported times are highly consistent (within {round(hours_diff * 60)} minutes).")
            elif hours_diff <= 24.0:
                supporting_evidence.append(f"Events occurred within approx. {round(hours_diff, 1)} hours of each other.")
            else:
                # Contradiction check: if visual or text similarity is strong, but temporal delta is several days
                if (image_score >= 0.65 or text_score >= 0.65) and hours_diff > 48.0 and time_score <= 0.45:
                    conflicting_evidence.append(f"Reported time differs significantly (events span an interval of {round(hours_diff / 24.0, 1)} days: {date_lost} vs {date_found}).")
                else:
                    weak_evidence.append(f"Reported times are separated by {round(hours_diff / 24.0, 1)} days.")
        except Exception:
            weak_evidence.append(f"Temporal proximity calculated at {int(time_score * 100)}%.")

    # ---------------- 5. Contradiction Warning Synthesis ----------------
    contradiction_warning = None
    if conflicting_evidence:
        contradiction_warning = (
            "Contradictory evidence detected: Strong visual or description similarity was detected, "
            "but one or more evidence sources (such as reported location or time) have low consistency. "
            "Manual verification is recommended."
        )

    return {
        "supporting_evidence": supporting_evidence,
        "weak_evidence": weak_evidence,
        "conflicting_evidence": conflicting_evidence,
        "missing_evidence": missing_evidence,
        "contradiction_warning": contradiction_warning,
        "has_contradiction": len(conflicting_evidence) > 0
    }

def generate_contradiction_aware_explanation(
    report_lost: Dict[str, Any],
    report_found: Dict[str, Any],
    image_score: float,
    text_score: float,
    loc_score: float,
    time_score: float,
    overall_score: float,
    evidence_analysis: Dict[str, Any],
    verification_status: Optional[str] = None
) -> str:
    """
    Synthesizes the complete, transparent, and adaptive Explainable AI (XAI) rationale.
    Directly incorporates supporting evidence, conflicting evidence, evidence quality,
    and hidden-attribute verification status without presenting as a guaranteed match.
    """
    conflicting = evidence_analysis.get("conflicting_evidence", [])
    supporting = evidence_analysis.get("supporting_evidence", [])
    
    parts = []

    # 1. Primary consistency assessment
    if not conflicting:
        if overall_score >= 0.80:
            parts.append("Multiple evidence sources are consistent with this potential match")
        else:
            parts.append("Evidence sources exhibit moderate alignment across modalities")
    else:
        parts.append(
            "Strong visual and description similarity was detected, "
            "but the reported locations and times have low consistency. "
            "Manual verification is recommended"
        )

    # 2. Key supporting details
    if supporting:
        # Include top 2 supporting points
        top_supports = supporting[:2]
        clean_supports = [s.rstrip(".") for s in top_supports]
        parts.append("Supporting indicators include: " + "; ".join(clean_supports))

    # 3. Key conflicting details
    if conflicting:
        clean_conflicts = [c.rstrip(".") for c in conflicting]
        parts.append("Conflicting observations: " + "; ".join(clean_conflicts))

    # 4. Ownership verification note if available
    if verification_status == "verified":
        parts.append("The private ownership detail was successfully verified")
    elif verification_status == "manual_review":
        parts.append("Private ownership detail partially matches; manual verification recommended")
    elif verification_status == "not_verified":
        parts.append("Private ownership detail could not be verified")

    # 5. Recommendation / Confidence
    parts.append(f"Resulting in an overall similarity of {int(overall_score * 100)}%. Potential match; verify the item before confirming ownership.")

    return ". ".join(parts)
