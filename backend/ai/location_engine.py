import math
import re
from typing import Dict, Any, Optional

# Campus Building Registry with canonical coordinates and zones
CAMPUS_BUILDINGS = {
    "main library": {"lat": 12.9716, "lng": 77.5946, "zone": "academic_core", "aliases": ["library", "lib", "central library", "reading room"]},
    "library entrance": {"lat": 12.9717, "lng": 77.5947, "zone": "academic_core", "aliases": ["lib entrance", "library gate", "portico"]},
    "student center": {"lat": 12.9722, "lng": 77.5952, "zone": "student_life", "aliases": ["student hub", "union", "student lounge"]},
    "central cafeteria": {"lat": 12.9724, "lng": 77.5954, "zone": "student_life", "aliases": ["canteen", "cafe", "food court", "mess"]},
    "computer science complex": {"lat": 12.9711, "lng": 77.5938, "zone": "tech_block", "aliases": ["cs block", "cse building", "it center", "comp sci"]},
    "engineering block a": {"lat": 12.9708, "lng": 77.5941, "zone": "tech_block", "aliases": ["engg a", "block a", "mech block"]},
    "engineering block b": {"lat": 12.9706, "lng": 77.5943, "zone": "tech_block", "aliases": ["engg b", "block b", "civil block"]},
    "science complex": {"lat": 12.9728, "lng": 77.5949, "zone": "north_campus", "aliases": ["science block", "chemistry lab", "physics hall"]},
    "sports complex": {"lat": 12.9735, "lng": 77.5960, "zone": "athletics", "aliases": ["gym", "gymnasium", "stadium", "sports arena", "basketball court"]},
    "innovation hub": {"lat": 12.9719, "lng": 77.5932, "zone": "tech_block", "aliases": ["incubation center", "maker lab", "startup cell"]},
    "campus auditorium": {"lat": 12.9720, "lng": 77.5955, "zone": "central_quad", "aliases": ["audi", "main hall", "seminar hall"]}
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def resolve_building(location_text: str) -> Optional[Dict[str, Any]]:
    """Resolves a raw location string to a campus building definition."""
    if not location_text:
        return None
    loc_lower = location_text.lower()
    
    # Direct name match
    for b_name, b_info in CAMPUS_BUILDINGS.items():
        if b_name in loc_lower:
            return {**b_info, "name": b_name}
            
    # Alias match
    for b_name, b_info in CAMPUS_BUILDINGS.items():
        for alias in b_info.get("aliases", []):
            if alias in loc_lower:
                return {**b_info, "name": b_name}
    return None

def calculate_location_similarity(report_lost: Dict[str, Any], report_found: Dict[str, Any]) -> float:
    """
    Computes spatial similarity score between lost and found locations.
    Incorporates building identity, floor matching, and GPS coordinates.
    Returns float between 0.0 and 1.0.
    """
    loc_lost_str = report_lost.get("location", "")
    loc_found_str = report_found.get("location", "")
    building_lost_str = report_lost.get("building", "")
    building_found_str = report_found.get("building", "")

    # Check GPS coordinates if explicitly provided
    lat1, lon1 = report_lost.get("latitude"), report_lost.get("longitude")
    lat2, lon2 = report_found.get("latitude"), report_found.get("longitude")

    # Try resolving known campus landmarks
    b_lost = resolve_building(building_lost_str or loc_lost_str)
    b_found = resolve_building(building_found_str or loc_found_str)

    # Use resolved coordinates if raw coordinates are missing
    if (lat1 is None or lon1 is None) and b_lost:
        lat1, lon1 = b_lost["lat"], b_lost["lng"]
    if (lat2 is None or lon2 is None) and b_found:
        lat2, lon2 = b_found["lat"], b_found["lng"]

    # If coordinates are available, calculate spatial distance decay
    if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
        dist_meters = haversine_distance(lat1, lon1, lat2, lon2)
        # Distance decay: 150m characteristic campus radius
        # <= 20m -> ~0.95, 50m -> ~0.85, 100m -> ~0.72, 200m -> ~0.50
        coord_score = math.exp(-dist_meters / 150.0)
    else:
        coord_score = None

    # Semantic building and floor analysis
    building_score = 0.20
    if b_lost and b_found:
        if b_lost["name"] == b_found["name"]:
            building_score = 0.95
            # Floor check if both specify floor
            floor_lost = report_lost.get("floor", "").strip().lower()
            floor_found = report_found.get("floor", "").strip().lower()
            if floor_lost and floor_found:
                if floor_lost == floor_found:
                    building_score = 1.00
                else:
                    building_score = 0.88
        elif b_lost["zone"] == b_found["zone"]:
            building_score = 0.75
        else:
            building_score = 0.35
    else:
        # Textual fuzzy token overlap as fallback
        tokens_lost = set(re.findall(r"\w+", loc_lost_str.lower()))
        tokens_found = set(re.findall(r"\w+", loc_found_str.lower()))
        if tokens_lost and tokens_found:
            intersection = tokens_lost.intersection(tokens_found)
            jaccard = len(intersection) / len(tokens_lost.union(tokens_found))
            building_score = max(0.20, min(0.90, jaccard * 1.5))

    # Final combined location score
    if coord_score is not None:
        final_score = 0.55 * coord_score + 0.45 * building_score
    else:
        final_score = building_score

    return max(0.0, min(1.0, float(final_score)))
