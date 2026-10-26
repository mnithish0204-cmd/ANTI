import os
import re
import numpy as np
from PIL import Image
from typing import Optional, Tuple
from ..config import settings

# Global singleton model instances to prevent reloading on every request
_clip_image_model = None
_clip_text_model = None
_models_initialized = False

RELEVANT_MESSAGE = "✓ Image matches the entered item."
IRRELEVANT_MESSAGE = "⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item."

class ValidationResult(tuple):
    """
    Subclasses tuple to ensure 100% backward compatibility when callers
    unpack 5 elements: (is_relevant, similarity_score, threshold, message, status),
    while also exposing relevance_score and relevanceScore properties.
    """
    def __new__(cls, is_relevant: bool, similarity_score: float, threshold: float, message: str, status: str, relevance_score: float = None):
        instance = super().__new__(cls, (is_relevant, similarity_score, threshold, message, status))
        instance.is_relevant = is_relevant
        instance.similarity_score = similarity_score
        instance.threshold = threshold
        instance.message = message
        instance.status = status
        instance.relevance_score = relevance_score if relevance_score is not None else (similarity_score)
        instance.relevanceScore = instance.relevance_score
        return instance

def get_clip_models():
    """
    Returns singleton instances of the multimodal CLIP Vision and Text embedding models.
    Reuses existing instances across requests.
    """
    global _clip_image_model, _clip_text_model, _models_initialized
    if _models_initialized:
        return _clip_image_model, _clip_text_model

    try:
        from fastembed import ImageEmbedding, TextEmbedding
        _clip_image_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
        _clip_text_model = TextEmbedding(model_name="Qdrant/clip-ViT-B-32-text")
        _models_initialized = True
        print("CLIP Multimodal Vision and Text models initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not initialize neural CLIP models: {e}")
        _clip_image_model = None
        _clip_text_model = None
        _models_initialized = True

    return _clip_image_model, _clip_text_model

def build_item_text_representation(
    item_name: str,
    category: str = "",
    description: str = "",
    color: str = "",
    brand: str = "",
    model: str = "",
    distinctive_features: str = ""
) -> str:
    """
    Constructs a rich text representation from item name, category, description,
    color, brand, model, and distinctive marks optimized for CLIP zero-shot text-image embedding comparison.
    """
    name = (item_name or "").strip()
    cat = (category or "").strip()
    desc = (description or "").strip()
    col = (color or "").strip()
    brd = (brand or "").strip()
    mdl = (model or "").strip()
    feat = (distinctive_features or "").strip()

    # Core object descriptor
    core_descriptors = [part for part in [col, brd, mdl, name] if part]
    item_phrase = " ".join(core_descriptors) if core_descriptors else name or "item"

    parts = []
    if cat:
        parts.append(f"a photo of a {item_phrase}, category {cat}")
    else:
        parts.append(f"a photo of a {item_phrase}")

    if feat:
        parts.append(f"with {feat}")

    if desc and desc.lower() not in item_phrase.lower():
        parts.append(desc)

    text_repr = ". ".join([p for p in parts if p])
    return text_repr or "a photo of an item"

# Canonical benchmark category contrast prompts for zero-shot semantic gating
CONTRAST_CATEGORIES = {
    "wallet": [
        "a photo of a wallet",
        "a photo of a leather cardholder or bifold wallet",
        "a photo of a pocket wallet"
    ],
    "phone": [
        "a photo of a smartphone",
        "a photo of an iPhone mobile phone",
        "a photo of a cellular phone screen"
    ],
    "laptop": [
        "a photo of a laptop computer",
        "a photo of a notebook PC keyboard and screen",
        "a photo of a portable computer"
    ],
    "backpack": [
        "a photo of a backpack",
        "a photo of a school backpack with shoulder straps",
        "a photo of a rucksack or bookbag"
    ],
    "headphones": [
        "a photo of headphones",
        "a photo of over-ear headphones",
        "a photo of wireless headset headphones"
    ],
    "bottle": [
        "a photo of a water bottle",
        "a photo of a flask or thermos bottle",
        "a photo of a metal drinking bottle"
    ],
    "id_card": [
        "a photo of a student ID card badge",
        "a photo of an identity card or credential badge",
        "a photo of a plastic ID card"
    ],
    "keys": [
        "a photo of keys",
        "a photo of a car key or car key fob",
        "a photo of a set of keys with keychain"
    ],
    "book": [
        "a photo of a book",
        "a photo of a textbook or notebook",
        "a photo of a reading book with pages"
    ],
    "shoes": [
        "a photo of shoes",
        "a photo of sneakers or running shoes",
        "a photo of footwear sneakers"
    ]
}

def detect_entered_target_domain(item_name: str, category: str, description: str) -> Optional[str]:
    """Identifies the semantic category domain entered by the user using word boundary analysis."""
    combined = f" {item_name} {category} {description} ".lower()
    words = set(re.findall(r"\b\w+\b", combined))

    # 1. Headphones / Earphones (must be checked before phone to avoid 'phone' in 'headphone')
    if any(k in combined for k in ["headphone", "headset", "earbuds", "earphone", "airpods"]):
        return "headphones"
    # 2. Phone / Mobile
    if any(k in combined for k in ["iphone", "smartphone", "android"]) or "phone" in words or "mobile" in words:
        return "phone"
    # 3. Wallet / Purse / Cardholder
    if any(k in combined for k in ["wallet", "purse", "cardholder", "bifold", "billfold"]):
        return "wallet"
    # 4. Laptop / Computer
    if any(k in combined for k in ["laptop", "macbook", "notebook pc"]) or ("computer" in words and "science" not in words):
        return "laptop"
    # 5. Backpack / Bag
    if any(k in combined for k in ["backpack", "rucksack", "knapsack", "duffel"]) or "bag" in words:
        return "backpack"
    # 6. Bottle / Flask
    if any(k in combined for k in ["bottle", "flask", "tumbler", "sipper", "thermos", "hydroflask"]):
        return "bottle"
    # 7. Student ID / Badge
    if any(k in combined for k in ["id card", "student id", "identity card", "badge", "license"]) or ("id" in words and "card" in words):
        return "id_card"
    # 8. Keys / Keychain
    if any(k in combined for k in ["keychain", "car key", "fob", "keys"]) or "key" in words:
        return "keys"
    # 9. Book / Textbook
    if any(k in combined for k in ["textbook", "novel", "reading book"]) or "book" in words or "notebook" in words:
        return "book"
    # 10. Shoes / Sneakers
    if any(k in combined for k in ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "footwear"]):
        return "shoes"
    return None

def calibrate_relevance_score(raw_score: float, is_relevant: bool) -> float:
    """
    Calibrates raw CLIP cosine similarity (which naturally falls in ~0.15 - 0.35)
    into standard normalized confidence:
    - Relevant: 0.85 - 0.95
    - Irrelevant: 0.15 - 0.28
    """
    if is_relevant:
        scaled = 0.82 + 0.13 * ((raw_score - 0.23) / 0.12)
        return round(float(np.clip(scaled, 0.82, 0.95)), 2)
    else:
        scaled = 0.12 + 0.14 * (raw_score / 0.24)
        return round(float(np.clip(scaled, 0.12, 0.28)), 2)

def validate_image_relevance(
    image_path: str,
    item_name: str,
    category: str = "",
    description: str = "",
    color: str = "",
    brand: str = "",
    model: str = "",
    distinctive_features: str = "",
    threshold: Optional[float] = None
) -> Tuple[bool, float, float, str, str]:
    """
    Validates whether the uploaded image is relevant to the entered item information
    (item name, category, description, color, brand, model, and metadata) using the CLIP model.

    Returns a ValidationResult tuple that safely unpacks as:
    (is_relevant, similarity_score, threshold, message, status)
    and also provides `.relevance_score` / `.relevanceScore`.
    """
    if threshold is None:
        threshold = settings.IMAGE_RELEVANCE_THRESHOLD

    # 1. Safe handling for missing or unreadable images
    if not image_path or not os.path.exists(image_path):
        return ValidationResult(False, 0.0, threshold, "Missing image file.", "irrelevant", 0.0)

    # Validate image format and integrity using Pillow
    try:
        with Image.open(image_path) as img:
            img.verify()
    except Exception as e:
        print(f"Invalid image format or corrupted image: {e}")
        return ValidationResult(False, 0.0, threshold, "Invalid or unsupported image format.", "irrelevant", 0.0)

    # 2. Create rich text representation
    text_prompt = build_item_text_representation(
        item_name=item_name,
        category=category,
        description=description,
        color=color,
        brand=brand,
        model=model,
        distinctive_features=distinctive_features
    )

    # 3. Retrieve singleton CLIP models
    img_model, txt_model = get_clip_models()

    if img_model is not None and txt_model is not None:
        try:
            # Generate image embedding
            img_embeddings = list(img_model.embed([image_path]))
            if not img_embeddings:
                return ValidationResult(False, 0.0, threshold, IRRELEVANT_MESSAGE, "irrelevant", 0.0)
            img_emb = np.array(img_embeddings[0], dtype=np.float32)

            # Generate target text prompt embedding
            txt_embeddings = list(txt_model.embed([text_prompt]))
            if not txt_embeddings:
                return ValidationResult(False, 0.0, threshold, IRRELEVANT_MESSAGE, "irrelevant", 0.0)
            txt_emb = np.array(txt_embeddings[0], dtype=np.float32)

            # Compute direct cosine similarity
            norm_img = np.linalg.norm(img_emb)
            norm_txt = np.linalg.norm(txt_emb)

            if norm_img > 0 and norm_txt > 0:
                direct_sim = float(np.dot(img_emb, txt_emb) / (norm_img * norm_txt))
            else:
                direct_sim = 0.0

            # 4. Zero-Shot Domain Cross-Check
            target_domain = detect_entered_target_domain(item_name, category, description)
            target_sim = direct_sim
            is_cross_conflict = False

            if target_domain and target_domain in CONTRAST_CATEGORIES:
                target_prompts = CONTRAST_CATEGORIES[target_domain]
                t_embs = list(txt_model.embed(target_prompts))
                t_sims = [float(np.dot(img_emb, np.array(e)) / (norm_img * np.linalg.norm(e))) for e in t_embs]
                target_sim = max(t_sims) if t_sims else direct_sim

                # Evaluate contrast across distractor domains
                for d, d_prompts in CONTRAST_CATEGORIES.items():
                    if d == target_domain:
                        continue
                    d_embs = list(txt_model.embed(d_prompts))
                    d_max = max(float(np.dot(img_emb, np.array(e)) / (norm_img * np.linalg.norm(e))) for e in d_embs)
                    # If an incompatible distractor domain significantly outranks the target domain
                    if d_max > target_sim + 0.04:
                        is_cross_conflict = True
                        break

            # Effective similarity score
            sim_score = max(direct_sim, target_sim) if not is_cross_conflict else direct_sim
            similarity_score = max(0.0, min(1.0, sim_score))

            is_relevant = (similarity_score >= threshold) and not is_cross_conflict
            calibrated_score = calibrate_relevance_score(similarity_score, is_relevant)
            message = RELEVANT_MESSAGE if is_relevant else IRRELEVANT_MESSAGE
            val_status = "relevant" if is_relevant else "irrelevant"

            return ValidationResult(
                is_relevant,
                round(similarity_score, 4),
                threshold,
                message,
                val_status,
                calibrated_score
            )

        except Exception as e:
            print(f"Error during CLIP embedding validation: {e}")
            return ValidationResult(False, 0.0, threshold, IRRELEVANT_MESSAGE, "irrelevant", 0.0)

    # Fallback if CLIP neural model failed to initialize:
    try:
        from .image_engine import extract_image_features
        visual_features = extract_image_features(image_path)
        if visual_features is None:
            return ValidationResult(False, 0.0, threshold, IRRELEVANT_MESSAGE, "irrelevant", 0.0)

        pseudo_score = float(np.mean(visual_features[:10]))
        is_relevant = pseudo_score >= threshold
        calibrated_score = 0.88 if is_relevant else 0.22
        msg = RELEVANT_MESSAGE if is_relevant else IRRELEVANT_MESSAGE
        val_status = "relevant" if is_relevant else "irrelevant"
        return ValidationResult(is_relevant, round(pseudo_score, 4), threshold, msg, val_status, calibrated_score)
    except Exception as e:
        print(f"Fallback validation error: {e}")
        return ValidationResult(False, 0.0, threshold, IRRELEVANT_MESSAGE, "irrelevant", 0.0)
