import os

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Smart Campus Multimodal Lost & Found AI")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart-campus-lost-and-found-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lost_and_found.db")
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

    # Initial configurable matching weights
    IMAGE_WEIGHT: float = float(os.getenv("IMAGE_WEIGHT", "0.40"))
    TEXT_WEIGHT: float = float(os.getenv("TEXT_WEIGHT", "0.30"))
    LOCATION_WEIGHT: float = float(os.getenv("LOCATION_WEIGHT", "0.15"))
    TIME_WEIGHT: float = float(os.getenv("TIME_WEIGHT", "0.15"))

    # Initial classification thresholds
    HIGH_THRESHOLD: float = float(os.getenv("HIGH_THRESHOLD", "0.80"))
    POSSIBLE_THRESHOLD: float = float(os.getenv("POSSIBLE_THRESHOLD", "0.60"))

    # Configurable image relevance validation threshold
    IMAGE_RELEVANCE_THRESHOLD: float = float(os.getenv("IMAGE_RELEVANCE_THRESHOLD", "0.22"))

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
