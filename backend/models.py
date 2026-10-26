import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    campus_id = Column(String(50), nullable=True)
    role = Column(String(20), default="student")  # student, finder, admin
    profile_image = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String(10), nullable=False)  # 'lost' or 'found'
    item_name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)     # Electronics, Bags, Keys, etc.
    description = Column(Text, nullable=False)
    brand = Column(String(100), nullable=True, default="")
    color = Column(String(50), nullable=True, default="")
    model = Column(String(100), nullable=True, default="")
    distinctive_features = Column(Text, nullable=True, default="")
    image_url = Column(String(255), nullable=True)
    location = Column(String(150), nullable=False)    # e.g., "Main Library 2nd Floor"
    building = Column(String(100), nullable=True, default="")
    floor = Column(String(20), nullable=True, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    date = Column(String(30), nullable=False)         # YYYY-MM-DD
    time = Column(String(30), nullable=False)         # HH:MM
    status = Column(String(20), default="active")     # active, matched, resolved, closed
    private_ownership_attribute = Column(Text, nullable=True, default="")
    image_relevance_score = Column(Float, nullable=True)
    image_relevance_status = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    lost_report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    found_report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    image_score = Column(Float, default=0.0)
    text_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    time_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    classification = Column(String(30), default="LOW")  # HIGH_POTENTIAL, POSSIBLE, LOW
    explanation = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING")      # PENDING, REQUESTED, CONFIRMED, REJECTED
    evidence_quality = Column(String(50), nullable=True, default="Good")  # High, Good, Moderate, Limited
    supporting_evidence = Column(Text, nullable=True, default="[]")       # JSON array of strings
    conflicting_evidence = Column(Text, nullable=True, default="[]")      # JSON array of strings
    contradiction_warning = Column(Text, nullable=True)
    verification_status = Column(String(50), nullable=True, default="not_verified")  # verified, not_verified, manual_review, unavailable
    verification_attempt = Column(Text, nullable=True)
    ownership_verification_result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    lost_report = relationship("Report", foreign_keys=[lost_report_id])
    found_report = relationship("Report", foreign_keys=[found_report_id])
    confirmer = relationship("User", foreign_keys=[confirmed_by])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    type = Column(String(50), nullable=False)  # POTENTIAL_MATCH, MATCH_CONFIRMED, FINDER_ALERT, MATCH_REJECTED, NEW_REPORT
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    match = relationship("Match", foreign_keys=[match_id])
    report = relationship("Report", foreign_keys=[report_id])


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    image_weight = Column(Float, default=0.40)
    text_weight = Column(Float, default=0.30)
    location_weight = Column(Float, default=0.15)
    time_weight = Column(Float, default=0.15)
    high_threshold = Column(Float, default=0.80)
    possible_threshold = Column(Float, default=0.60)


class GroundTruthBenchmark(Base):
    __tablename__ = "ground_truth_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    lost_report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    found_report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    is_true_match = Column(Boolean, nullable=False)  # True if genuinely same physical item
    notes = Column(String(255), nullable=True)
