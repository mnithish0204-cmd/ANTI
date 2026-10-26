import re
import math
import numpy as np
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Semantic domain synonym map for Smart Campus Lost-and-Found items
SYNONYM_MAP = {
    # Colors
    "dark": "black",
    "onyx": "black",
    "midnight": "black",
    "charcoal": "black",
    "crimson": "red",
    "scarlet": "red",
    "navy": "blue",
    "azure": "blue",
    "silver": "grey",
    "gray": "grey",
    "gold": "yellow",
    # Devices & Items
    "headset": "headphones",
    "earphones": "headphones",
    "earbuds": "headphones",
    "airpods": "headphones",
    "laptop": "computer",
    "notebook": "computer",
    "macbook": "computer",
    "phone": "mobile",
    "smartphone": "mobile",
    "iphone": "mobile",
    "charger": "adapter",
    "cable": "wire",
    "bottle": "flask",
    "tumbler": "flask",
    "sipper": "flask",
    "bag": "backpack",
    "rucksack": "backpack",
    "knapsack": "backpack",
    "wallet": "purse",
    "pouch": "purse",
    "id": "identity",
    "id_card": "identity",
    "badge": "identity",
    # Marks & Attributes
    "scratch": "scratch_mark",
    "scratches": "scratch_mark",
    "scratched": "scratch_mark",
    "scuff": "scratch_mark",
    "scuffed": "scratch_mark",
    "dent": "dent_mark",
    "dented": "dent_mark",
    "crack": "crack_mark",
    "cracked": "crack_mark",
    "sticker": "decal",
    "keychain": "trinket",
    "bluetooth": "wireless"
}

def normalize_text(text: str) -> str:
    """Cleans, lowercases, and replaces domain synonyms to capture semantic equivalence."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    words = text.split()
    normalized_words = [SYNONYM_MAP.get(w, w) for w in words]
    return " ".join(normalized_words)

def build_report_text(report_data: Dict[str, Any]) -> str:
    """
    Constructs a rich textual representation of a report emphasizing key identifying attributes.
    """
    parts = []
    # Title & Category
    parts.append(report_data.get("item_name", ""))
    parts.append(report_data.get("category", ""))
    
    # Brand, Model & Color (doubled weight for semantic salience)
    brand = report_data.get("brand", "")
    if brand:
        parts.extend([brand, brand])
    color = report_data.get("color", "")
    if color:
        parts.extend([color, color])
    model = report_data.get("model", "")
    if model:
        parts.extend([model, model])
        
    # Distinctive features & general description
    features = report_data.get("distinctive_features", "")
    if features:
        parts.extend([features, features])
    description = report_data.get("description", "")
    if description:
        parts.append(description)

    raw_text = " ".join([p for p in parts if p])
    return normalize_text(raw_text)

# Try optional FastEmbed for local deep semantic sentence embeddings
_fastembed_model = None
try:
    from fastembed import TextEmbedding
    _fastembed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print("FastEmbed neural sentence embedding initialized successfully.")
except Exception:
    _fastembed_model = None

def calculate_text_similarity(report_lost: Dict[str, Any], report_found: Dict[str, Any]) -> float:
    """
    Computes semantic similarity between two report text descriptions.
    Uses neural embeddings when available, complemented with multi-gram TF-IDF & attribute alignment.
    Returns score between 0.0 and 1.0.
    """
    text_lost = build_report_text(report_lost)
    text_found = build_report_text(report_found)

    if not text_lost or not text_found:
        return 0.20

    # 1. Direct neural embedding if available
    neural_score = None
    if _fastembed_model is not None:
        try:
            embeddings = list(_fastembed_model.embed([text_lost, text_found]))
            v1, v2 = np.array(embeddings[0]), np.array(embeddings[1])
            dot = np.dot(v1, v2)
            norm = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-7
            neural_score = max(0.0, min(1.0, float(dot / norm)))
        except Exception as e:
            neural_score = None

    # 2. Hybrid Word + Character n-gram TF-IDF for robust subword & phrase semantics
    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            analyzer="word",
            token_pattern=r"(?u)\b\w+\b",
            sublinear_tf=True
        )
        tfidf_matrix = vectorizer.fit_transform([text_lost, text_found])
        tfidf_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception:
        tfidf_score = 0.30

    # 3. Distinctive features and semantic alignment bonuses
    category_match = (
        report_lost.get("category", "").lower().strip() == report_found.get("category", "").lower().strip()
        and report_lost.get("category", "") != ""
    )
    brand_lost = report_lost.get("brand", "").lower().strip()
    brand_found = report_found.get("brand", "").lower().strip()
    brand_match = bool(brand_lost and brand_found and (brand_lost in brand_found or brand_found in brand_lost))

    color_lost = normalize_text(report_lost.get("color", ""))
    color_found = normalize_text(report_found.get("color", ""))
    color_match = bool(color_lost and color_found and (color_lost in color_found or color_found in color_lost))

    # Distinctive marks overlap (e.g. scratches, stickers, keychains)
    feat_lost = normalize_text(report_lost.get("distinctive_features", "") + " " + report_lost.get("description", ""))
    feat_found = normalize_text(report_found.get("distinctive_features", "") + " " + report_found.get("description", ""))
    mark_keywords = ["scratch", "scratch_mark", "scuff", "dent", "sticker", "keychain", "lanyard"]
    mark_overlap = any(kw in feat_lost and kw in feat_found for kw in mark_keywords)

    # Combine scores
    base_score = neural_score if neural_score is not None else tfidf_score
    
    # Calibrate alignment
    adjusted_score = base_score * 0.60
    if category_match:
        adjusted_score += 0.15
    if brand_match:
        adjusted_score += 0.10
    if color_match:
        adjusted_score += 0.08
    if mark_overlap:
        adjusted_score += 0.12

    return max(0.0, min(1.0, float(adjusted_score)))
