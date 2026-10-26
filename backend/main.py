import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base, SessionLocal
from .config import settings
from .seed_data import seed_database
from .routers import auth_router, reports_router, matches_router, notifications_router, admin_router

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Auto-seed database if empty
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(
    title="Smart Campus Multimodal Lost-and-Found AI Platform",
    description="Context-Aware Multimodal AI matching system fusing image, text, campus location, and temporal proximity.",
    version="1.0.0"
)

# Enable CORS for local Vite development & browser clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded item images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(matches_router)
app.include_router(notifications_router)
app.include_router(admin_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-Based Multimodal Lost-and-Found Matching System",
        "campus": "Smart Campus Institute of Technology",
        "ai_engine": {
            "image": "Active (HSV + Spatial Edge/Gradient Cosine)",
            "text": "Active (Semantic Subword n-gram & TF-IDF Cosine)",
            "location": "Active (Campus Building Ontology & Haversine Distance)",
            "time": "Active (Temporal Difference Exponential Decay)",
            "multimodal_fusion": "Active (Context-Aware Dynamic Scorer & XAI)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
