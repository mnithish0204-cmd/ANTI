import re
import numpy as np
from typing import Tuple, Optional
from .text_engine import normalize_text, _fastembed_model

def calculate_ownership_similarity(claimed_detail: str, stored_attribute: str) -> float:
    """
    Computes a semantic verification similarity score between the claimant's answer
    and the stored private ownership attribute.
    Combines deep neural sentence embeddings with normalized keyword overlap.
    """
    txt1 = normalize_text(claimed_detail)
    txt2 = normalize_text(stored_attribute)

    if not txt1 or not txt2:
        return 0.0

    # 1. Neural Embedding Cosine Similarity if FastEmbed is available
    neural_score = None
    if _fastembed_model is not None:
        try:
            embeddings = list(_fastembed_model.embed([txt1, txt2]))
            v1 = np.array(embeddings[0], dtype=np.float32)
            v2 = np.array(embeddings[1], dtype=np.float32)
            norm = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-7
            neural_score = float(np.dot(v1, v2) / norm)
            neural_score = max(0.0, min(1.0, neural_score))
        except Exception as e:
            print(f"Error computing neural ownership similarity: {e}")
            neural_score = None

    # 2. Token & N-Gram Keyword Overlap
    words1 = set(txt1.split())
    words2 = set(txt2.split())
    
    # Filter common stopwords for verification accuracy
    stopwords = {"a", "an", "the", "in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "and", "but", "if", "or", "because", "as", "until", "while", "of", "there", "it", "its"}
    sig_words1 = {w for w in words1 if w not in stopwords and len(w) > 2}
    sig_words2 = {w for w in words2 if w not in stopwords and len(w) > 2}

    if sig_words1 and sig_words2:
        intersect = sig_words1.intersection(sig_words2)
        jaccard = len(intersect) / len(sig_words1.union(sig_words2))
        overlap_ratio = len(intersect) / min(len(sig_words1), len(sig_words2))
    else:
        jaccard = 0.0
        overlap_ratio = 0.0

    # 3. Specific Substring Match Bonus (e.g. "tear inside left card slot")
    phrase_match = 0.0
    if len(txt1) >= 6 and (txt1 in txt2 or txt2 in txt1):
        phrase_match = 0.35

    # Combine signals
    if neural_score is not None:
        combined = 0.55 * neural_score + 0.30 * overlap_ratio + 0.15 * phrase_match
    else:
        combined = 0.65 * overlap_ratio + 0.35 * phrase_match

    return max(0.0, min(1.0, float(combined)))

def verify_ownership_attribute(
    claimed_detail: str,
    stored_attribute: Optional[str]
) -> Tuple[str, float, str]:
    """
    Verifies a claimant's submitted identifying detail against the stored secret private attribute.
    
    CRITICAL SECURITY REQUIREMENT:
    Under no circumstances is the stored private attribute revealed in the return value or logs.
    
    Returns:
    (verification_status, similarity_score, message)
    where verification_status is one of:
    - 'verified'
    - 'manual_review'
    - 'not_verified'
    - 'unavailable'
    """
    stored = (stored_attribute or "").strip()
    if not stored:
        return (
            "unavailable",
            0.0,
            "No private ownership attribute recorded for this item."
        )

    claimed = (claimed_detail or "").strip()
    if not claimed:
        return (
            "not_verified",
            0.0,
            "⚠️ Please provide an identifying detail to verify ownership."
        )

    score = calculate_ownership_similarity(claimed, stored)

    # Thresholds:
    # >= 0.65 -> Verified
    # 0.42 to 0.64 -> Needs Manual Review
    # < 0.42 -> Not Verified
    if score >= 0.65:
        return (
            "verified",
            round(score, 4),
            "✓ Ownership detail verified."
        )
    elif score >= 0.42:
        return (
            "manual_review",
            round(score, 4),
            "⚠️ Ownership detail partially matches - manual review recommended."
        )
    else:
        return (
            "not_verified",
            round(score, 4),
            "⚠️ Ownership detail could not be verified."
        )
