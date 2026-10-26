import os
import math
import numpy as np
from PIL import Image
from typing import Optional

def extract_image_features(image_path: str) -> Optional[np.ndarray]:
    """
    Extracts dense multimodal visual features from an image:
    - 3D HSV Color Histogram (dominant color, shade, saturation)
    - Spatial Grid Luminance & Texture
    - Edge & Gradient Orientation (shape, contours, device form-factor)
    """
    if not os.path.exists(image_path):
        return None
    try:
        with Image.open(image_path) as img:
            img_rgb = img.convert("RGB")
            
            # 1. Resize to canonical size for spatial consistency
            img_canonical = img_rgb.resize((128, 128))
            arr = np.array(img_canonical, dtype=np.float32) / 255.0

            # 2. Convert RGB to HSV for robust color representation
            r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
            max_c = np.maximum(np.maximum(r, g), b)
            min_c = np.minimum(np.minimum(r, g), b)
            delta = max_c - min_c + 1e-7

            h = np.zeros_like(max_c)
            # Hue calculation
            mask_r = (max_c == r) & (delta > 0)
            h[mask_r] = ((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6.0
            mask_g = (max_c == g) & (delta > 0)
            h[mask_g] = ((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2.0
            mask_b = (max_c == b) & (delta > 0)
            h[mask_b] = ((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4.0
            h = h / 6.0  # Normalize to [0, 1]

            s = np.where(max_c > 0, delta / (max_c + 1e-7), 0.0)
            v = max_c

            # 3. Multi-bin HSV color histogram (12 hue bins, 4 sat bins, 4 val bins = 192 features)
            h_bins = np.digitize(h.ravel(), np.linspace(0, 1, 13)) - 1
            s_bins = np.digitize(s.ravel(), np.linspace(0, 1, 5)) - 1
            v_bins = np.digitize(v.ravel(), np.linspace(0, 1, 5)) - 1
            h_bins = np.clip(h_bins, 0, 11)
            s_bins = np.clip(s_bins, 0, 3)
            v_bins = np.clip(v_bins, 0, 3)

            color_idx = h_bins * 16 + s_bins * 4 + v_bins
            hist_color, _ = np.histogram(color_idx, bins=192, range=(0, 192), density=True)

            # 4. Spatial 4x4 Grid features (average RGB and Luminance per quadrant)
            spatial_features = []
            block_size = 32
            for bi in range(4):
                for bj in range(4):
                    block = arr[bi*block_size:(bi+1)*block_size, bj*block_size:(bj+1)*block_size]
                    spatial_features.extend(block.mean(axis=(0, 1)).tolist())
            spatial_vec = np.array(spatial_features, dtype=np.float32)

            # 5. Edge and Gradient Orientation (Sobel-style gradients)
            gray = 0.299 * r + 0.587 * g + 0.114 * b
            grad_x = np.diff(gray, axis=1)[:-1, :]  # Shape: (127, 127)
            grad_y = np.diff(gray, axis=0)[:, :-1]  # Shape: (127, 127)
            grad_mag = np.sqrt(grad_x**2 + grad_y**2)
            grad_angle = np.arctan2(grad_y, grad_x) % np.pi
            
            angle_bins = np.digitize(grad_angle.ravel(), np.linspace(0, np.pi, 9)) - 1
            angle_bins = np.clip(angle_bins, 0, 7)
            edge_hist, _ = np.histogram(angle_bins, bins=8, weights=grad_mag.ravel(), density=True)

            # Concatenate all visual descriptors
            combined_vector = np.concatenate([hist_color, spatial_vec, edge_hist])
            
            # Normalize vector to unit L2 norm
            norm = np.linalg.norm(combined_vector)
            if norm > 0:
                combined_vector = combined_vector / norm
            return combined_vector

    except Exception as e:
        print(f"Error extracting visual features from {image_path}: {e}")
        return None

def calculate_image_similarity(image_path_lost: Optional[str], image_path_found: Optional[str]) -> float:
    """
    Computes cosine similarity between two images.
    Returns float between 0.0 and 1.0.
    """
    if not image_path_lost or not image_path_found:
        return 0.50  # Default neutral score when one or both images are absent

    feat_lost = extract_image_features(image_path_lost)
    feat_found = extract_image_features(image_path_found)

    if feat_lost is None or feat_found is None:
        return 0.50

    # Cosine similarity for normalized vectors is simply the dot product
    similarity = float(np.dot(feat_lost, feat_found))
    # Bound strictly between 0.0 and 1.0
    return max(0.0, min(1.0, similarity))
