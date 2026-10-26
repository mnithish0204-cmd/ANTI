from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    campus_id: Optional[str] = None
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    email: str
    password: str

class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    campus_id: Optional[str] = None
    role: str
    profile_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserPublic

# Report Schemas
class ReportCreate(BaseModel):
    report_type: str  # 'lost' or 'found'
    item_name: str
    category: str
    description: str
    brand: Optional[str] = ""
    color: Optional[str] = ""
    model: Optional[str] = ""
    distinctive_features: Optional[str] = ""
    location: str
    building: Optional[str] = ""
    floor: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: str
    time: str

class ReportResponse(BaseModel):
    id: int
    user_id: int
    report_type: str
    item_name: str
    category: str
    description: str
    brand: Optional[str] = ""
    color: Optional[str] = ""
    model: Optional[str] = ""
    distinctive_features: Optional[str] = ""
    image_url: Optional[str] = None
    location: str
    building: Optional[str] = ""
    floor: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: str
    time: str
    status: str
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# Match Schemas
class MatchCandidate(BaseModel):
    id: int
    lost_report_id: int
    found_report_id: int
    image_score: float
    text_score: float
    location_score: float
    time_score: float
    overall_score: float
    classification: str
    explanation: Optional[str] = None
    status: str
    evidence_quality: Optional[str] = "Good"
    supporting_evidence: Optional[List[str]] = []
    conflicting_evidence: Optional[List[str]] = []
    contradiction_warning: Optional[str] = None
    verification_status: Optional[str] = "not_verified"
    verification_attempt: Optional[str] = None
    ownership_verification_result: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    
    lost_report: Optional[ReportResponse] = None
    found_report: Optional[ReportResponse] = None
    finder_contact: Optional[dict] = None  # Populated ONLY after confirmation

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    match_id: Optional[int] = None
    report_id: Optional[int] = None
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# System Config Schema
class ConfigUpdate(BaseModel):
    image_weight: float
    text_weight: float
    location_weight: float
    time_weight: float
    high_threshold: float
    possible_threshold: float

class ConfigResponse(BaseModel):
    id: int
    image_weight: float
    text_weight: float
    location_weight: float
    time_weight: float
    high_threshold: float
    possible_threshold: float

    class Config:
        from_attributes = True

# Evaluation Metrics Schema
class EvaluationMetricDetail(BaseModel):
    method_name: str
    description: str
    precision: float
    recall: float
    f1_score: float
    accuracy: float
    average_score: float
    sample_size: int

class EvaluationResponse(BaseModel):
    timestamp: datetime
    total_ground_truth_pairs: int
    methods: List[EvaluationMetricDetail]

# Image Relevance Validation Schema
class ImageValidationResponse(BaseModel):
    is_relevant: bool
    similarity_score: float
    relevanceScore: Optional[float] = None
    threshold: float
    status: str = "relevant"  # "relevant" | "irrelevant" | "error"
    message: str

# Hidden-Attribute Ownership Verification Schemas
class OwnershipVerificationRequest(BaseModel):
    attribute_detail: str

class OwnershipVerificationResponse(BaseModel):
    status: str  # "verified" | "not_verified" | "manual_review" | "unavailable"
    verification_status: str
    similarity_score: float
    message: str
    match_id: int

