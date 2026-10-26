import math
from datetime import datetime
from typing import Dict, Any

def parse_datetime(date_str: str, time_str: str) -> datetime:
    """Parses date and time strings into a datetime object."""
    date_str = (date_str or "").strip()
    time_str = (time_str or "").strip()

    # Normalize time if only hour given or missing
    if not time_str:
        time_str = "12:00"
    if len(time_str.split(":")) == 1:
        time_str = f"{time_str}:00"

    formats = [
        ("%Y-%m-%d %H:%M", f"{date_str} {time_str}"),
        ("%Y-%m-%d %I:%M %p", f"{date_str} {time_str}"),
        ("%Y-%m-%d", date_str),
        ("%d/%m/%Y %H:%M", f"{date_str} {time_str}"),
        ("%B %d, %Y %I:%M %p", f"{date_str} {time_str}"),
    ]
    
    for fmt, val in formats:
        try:
            return datetime.strptime(val, fmt)
        except Exception:
            continue

    # Fallback to current time if unparseable
    return datetime.utcnow()

def calculate_time_similarity(report_lost: Dict[str, Any], report_found: Dict[str, Any]) -> float:
    """
    Computes temporal proximity score between lost and found events.
    Reports occurring close in time receive higher scores.
    Returns float between 0.0 and 1.0.
    """
    try:
        dt_lost = parse_datetime(report_lost.get("date", ""), report_lost.get("time", ""))
        dt_found = parse_datetime(report_found.get("date", ""), report_found.get("time", ""))

        # Delta in hours
        delta_seconds = abs((dt_found - dt_lost).total_seconds())
        delta_hours = delta_seconds / 3600.0

        if delta_hours <= 1.0:
            score = 0.98 - (delta_hours * 0.04)  # 0.94 to 0.98
        elif delta_hours <= 4.0:
            score = 0.94 - ((delta_hours - 1.0) * 0.03)  # 0.85 to 0.94
        elif delta_hours <= 24.0:
            score = 0.85 - ((delta_hours - 4.0) * 0.0075)  # 0.70 to 0.85
        else:
            # Exponential decay with 72h characteristic timescale
            score = 0.70 * math.exp(-(delta_hours - 24.0) / 72.0)

        return max(0.05, min(1.0, float(score)))

    except Exception as e:
        print(f"Error calculating time similarity: {e}")
        return 0.50
