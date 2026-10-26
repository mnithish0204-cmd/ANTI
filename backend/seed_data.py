import os
import datetime
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session
from .models import User, Report, Match, Notification, SystemConfig, GroundTruthBenchmark
from .auth import get_password_hash
from .config import settings
from .ai.fusion_engine import calculate_multimodal_match

def create_synthetic_item_image(filename: str, bg_color: tuple, shape_color: tuple, label: str) -> str:
    """Generates a structured synthetic demonstration item image using Pillow."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        return filepath

    img = Image.new("RGB", (256, 256), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw device shape (e.g. headphones, backpack, card)
    if "headphone" in filename or "headset" in filename:
        # Draw headband arc
        draw.arc([48, 30, 208, 160], start=180, end=0, fill=shape_color, width=12)
        # Left and right earcups
        draw.rounded_rectangle([32, 110, 72, 190], radius=16, fill=shape_color)
        draw.rounded_rectangle([184, 110, 224, 190], radius=16, fill=shape_color)
        # Scratch mark on left earcup if specified
        if "scratch" in filename:
            draw.line([40, 130, 60, 155], fill=(220, 220, 220), width=3)
    elif "bag" in filename:
        # Backpack shape
        draw.rounded_rectangle([50, 50, 206, 210], radius=24, fill=shape_color)
        draw.rectangle([70, 110, 186, 190], fill=(min(255, shape_color[0]+30), min(255, shape_color[1]+30), min(255, shape_color[2]+30)))
    elif "bottle" in filename or "flask" in filename:
        # Bottle cylinder and cap
        draw.rounded_rectangle([90, 70, 166, 220], radius=15, fill=shape_color)
        draw.rectangle([110, 40, 146, 70], fill=(180, 180, 180))
    elif "card" in filename or "wallet" in filename:
        # ID Card / Wallet
        draw.rounded_rectangle([40, 70, 216, 180], radius=12, fill=shape_color)
        draw.rectangle([55, 90, 100, 140], fill=(200, 200, 200))
        draw.line([115, 100, 195, 100], fill=(240, 240, 240), width=4)
        draw.line([115, 120, 175, 120], fill=(240, 240, 240), width=4)
    else:
        draw.rounded_rectangle([60, 60, 196, 196], radius=20, fill=shape_color)

    img.save(filepath, "JPEG", quality=90)
    return filepath

def seed_database(db: Session):
    """Populates database with realistic campus test data, benchmark pairs, and AI matches."""
    # Check if already seeded
    if db.query(User).first():
        return

    print("Seeding initial Smart Campus data...")

    # 1. System Config
    cfg = SystemConfig(
        image_weight=0.40,
        text_weight=0.30,
        location_weight=0.15,
        time_weight=0.15,
        high_threshold=0.80,
        possible_threshold=0.60
    )
    db.add(cfg)
    db.commit()

    # 2. Users
    user_lost = User(
        name="Aarav Sharma",
        email="aarav@campus.edu",
        password_hash=get_password_hash("password123"),
        phone="+91 98450 11223",
        campus_id="STU-10822",
        role="student"
    )
    user_finder = User(
        name="Rahul Kumar",
        email="rahul@campus.edu",
        password_hash=get_password_hash("password123"),
        phone="+91 98765 43210",
        campus_id="STU-10234",
        role="finder"
    )
    user_admin = User(
        name="Dr. Priya Patel",
        email="admin@campus.edu",
        password_hash=get_password_hash("admin123"),
        phone="+91 98111 22334",
        campus_id="ADM-9001",
        role="admin"
    )
    db.add_all([user_lost, user_finder, user_admin])
    db.commit()

    # 3. Create synthetic item photos
    img_lost_headphones = create_synthetic_item_image("lost_headphones_scratch.jpg", (245, 245, 248), (25, 25, 28), "Lost JBL")
    img_found_headphones = create_synthetic_item_image("found_headphones_scratch.jpg", (240, 240, 242), (30, 30, 32), "Found BT")
    img_blue_bag = create_synthetic_item_image("blue_laptop_bag.jpg", (245, 245, 250), (25, 75, 160), "Dell Bag")
    img_found_blue_bag = create_synthetic_item_image("found_navy_backpack.jpg", (240, 242, 246), (30, 70, 150), "Navy Bag")
    img_red_flask = create_synthetic_item_image("red_hydro_flask.jpg", (250, 245, 245), (180, 30, 35), "Red Flask")
    img_found_silver_flask = create_synthetic_item_image("found_silver_flask.jpg", (245, 245, 245), (150, 155, 160), "Silver Flask")
    img_campus_card = create_synthetic_item_image("lost_campus_card.jpg", (245, 248, 250), (40, 110, 180), "Student ID")
    img_found_card = create_synthetic_item_image("found_campus_card.jpg", (245, 248, 250), (38, 108, 175), "Found ID")

    # 4. Reports
    # Item Pair 1: High Potential Match (from Section 26 spec)
    rep_lost_1 = Report(
        user_id=user_lost.id,
        report_type="lost",
        item_name="Black JBL Wireless Headphones",
        category="Electronics",
        description="Black wireless over-ear headphones. Left earcup has a small diagonal scratch near the hinge.",
        brand="JBL",
        color="Black",
        model="Live 650BT",
        distinctive_features="Small visible scratch on the left side earcup",
        image_url=img_lost_headphones,
        location="Main Library 2nd Floor Reading Room",
        building="Main Library",
        floor="2nd Floor",
        latitude=12.9716,
        longitude=77.5946,
        date="2026-09-20",
        time="14:00",
        status="active",
        private_ownership_attribute="Small diagonal scratch on left ear cup hinge"
    )
    rep_found_1 = Report(
        user_id=user_finder.id,
        report_type="found",
        item_name="Dark Black Bluetooth Headset",
        category="Electronics",
        description="Found a dark black wireless headset near the library entrance. Left earcup has a visible scratch.",
        brand="JBL",
        color="Black",
        model="Wireless",
        distinctive_features="Left earcup has noticeable scratch mark",
        image_url=img_found_headphones,
        location="Main Library Entrance Portico",
        building="Main Library",
        floor="Ground Floor",
        latitude=12.9717,
        longitude=77.5947,
        date="2026-09-20",
        time="14:45",
        status="active"
    )

    # Item Pair 2: Possible Match (Laptop Bag)
    rep_lost_2 = Report(
        user_id=user_lost.id,
        report_type="lost",
        item_name="Navy Blue Dell Laptop Backpack",
        category="Bags & Luggage",
        description="Navy blue nylon backpack with 15.6 inch laptop sleeve and university keychain on zipper.",
        brand="Dell",
        color="Navy Blue",
        model="Pro Backpack 15",
        distinctive_features="University metal keychain on front zipper",
        image_url=img_blue_bag,
        location="Engineering Block A Lab 3",
        building="Engineering Block A",
        floor="3rd Floor",
        latitude=12.9708,
        longitude=77.5941,
        date="2026-09-19",
        time="11:30",
        status="active",
        private_ownership_attribute="Name tag attached inside the main compartment"
    )
    rep_found_2 = Report(
        user_id=user_finder.id,
        report_type="found",
        item_name="Blue Computer Rucksack",
        category="Bags & Luggage",
        description="Found navy blue laptop bag near Engineering Block B lobby. Has padded compartment.",
        brand="Dell",
        color="Blue",
        model="",
        distinctive_features="Small metallic keychain attached",
        image_url=img_found_blue_bag,
        location="Engineering Block B Lobby",
        building="Engineering Block B",
        floor="Ground Floor",
        latitude=12.9706,
        longitude=77.5943,
        date="2026-09-19",
        time="13:15",
        status="active"
    )

    # Item Pair 3: Negative Distractor (Different flasks & locations)
    rep_lost_3 = Report(
        user_id=user_lost.id,
        report_type="lost",
        item_name="Red Hydro Flask Tumbler",
        category="Books & Stationery",
        description="Bright red insulated steel flask with sports cap and mountain sticker.",
        brand="Hydro Flask",
        color="Red",
        model="32oz Wide Mouth",
        distinctive_features="Mountain sticker on the base",
        image_url=img_red_flask,
        location="Sports Complex Basketball Court",
        building="Sports Complex",
        floor="Ground Floor",
        latitude=12.9735,
        longitude=77.5960,
        date="2026-09-18",
        time="17:00",
        status="active"
    )
    rep_found_3 = Report(
        user_id=user_finder.id,
        report_type="found",
        item_name="Silver Stainless Steel Bottle",
        category="Books & Stationery",
        description="Silver metallic water bottle found on bench outside Science Complex.",
        brand="Milton",
        color="Silver",
        model="Steel 750",
        distinctive_features="Plain finish without stickers",
        image_url=img_found_silver_flask,
        location="Science Complex Garden",
        building="Science Complex",
        floor="Ground Floor",
        latitude=12.9728,
        longitude=77.5949,
        date="2026-09-18",
        time="10:00",
        status="active"
    )

    # Item Pair 4: True Match (Campus ID Card)
    rep_lost_4 = Report(
        user_id=user_lost.id,
        report_type="lost",
        item_name="Smart Campus ID Badge",
        category="Identity & Cards",
        description="Student identity card with blue lanyard. Belongs to Aarav Sharma STU-10822.",
        brand="Campus Authority",
        color="Blue / White",
        model="RFID Card",
        distinctive_features="Blue lanyard with campus logo",
        image_url=img_campus_card,
        location="Central Cafeteria Food Counter",
        building="Central Cafeteria",
        floor="1st Floor",
        latitude=12.9724,
        longitude=77.5954,
        date="2026-09-21",
        time="12:30",
        status="active",
        private_ownership_attribute="Small sticker mark on the back of the card holder"
    )
    rep_found_4 = Report(
        user_id=user_finder.id,
        report_type="found",
        item_name="Student ID Card with Blue Lanyard",
        category="Identity & Cards",
        description="Found an official campus ID card at cafeteria table with blue lanyard.",
        brand="Campus Authority",
        color="Blue",
        model="Smart Card",
        distinctive_features="Blue lanyard with campus emblem",
        image_url=img_found_card,
        location="Central Cafeteria Seating Area",
        building="Central Cafeteria",
        floor="1st Floor",
        latitude=12.9724,
        longitude=77.5954,
        date="2026-09-21",
        time="13:00",
        status="active"
    )

    db.add_all([
        rep_lost_1, rep_found_1,
        rep_lost_2, rep_found_2,
        rep_lost_3, rep_found_3,
        rep_lost_4, rep_found_4
    ])
    db.commit()

    # 5. Create AI Multimodal Matches for the pairs
    weights = {"image_weight": 0.40, "text_weight": 0.30, "location_weight": 0.15, "time_weight": 0.15}
    thresholds = {"high_threshold": 0.80, "possible_threshold": 0.60}

    pairs = [
        (rep_lost_1, rep_found_1),
        (rep_lost_2, rep_found_2),
        (rep_lost_3, rep_found_3),
        (rep_lost_4, rep_found_4),
        # Cross-item distractor pairs
        (rep_lost_1, rep_found_2),
        (rep_lost_2, rep_found_1),
        (rep_lost_3, rep_found_4),
    ]

    for lost_rep, found_rep in pairs:
        lost_dict = {
            "item_name": lost_rep.item_name, "category": lost_rep.category, "description": lost_rep.description,
            "brand": lost_rep.brand, "color": lost_rep.color, "model": lost_rep.model,
            "distinctive_features": lost_rep.distinctive_features, "image_url": lost_rep.image_url,
            "location": lost_rep.location, "building": lost_rep.building, "floor": lost_rep.floor,
            "latitude": lost_rep.latitude, "longitude": lost_rep.longitude, "date": lost_rep.date, "time": lost_rep.time
        }
        found_dict = {
            "item_name": found_rep.item_name, "category": found_rep.category, "description": found_rep.description,
            "brand": found_rep.brand, "color": found_rep.color, "model": found_rep.model,
            "distinctive_features": found_rep.distinctive_features, "image_url": found_rep.image_url,
            "location": found_rep.location, "building": found_rep.building, "floor": found_rep.floor,
            "latitude": found_rep.latitude, "longitude": found_rep.longitude, "date": found_rep.date, "time": found_rep.time
        }

        img_s, txt_s, loc_s, tim_s, overall_s, classification, explanation = calculate_multimodal_match(
            lost_dict, found_dict, weights, thresholds
        )

        match = Match(
            lost_report_id=lost_rep.id,
            found_report_id=found_rep.id,
            image_score=img_s,
            text_score=txt_s,
            location_score=loc_s,
            time_score=tim_s,
            overall_score=overall_s,
            classification=classification,
            explanation=explanation,
            status="PENDING"
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        # In-app notifications for potential matches
        if overall_s >= 0.60:
            pct = int(overall_s * 100)
            db.add(Notification(
                user_id=lost_rep.user_id,
                match_id=match.id,
                report_id=lost_rep.id,
                type="POTENTIAL_MATCH",
                title=f"Potential Match Found ({pct}%)",
                message=f"AI detected a {classification.replace('_', ' ').title()} match ({pct}%) for your lost '{lost_rep.item_name}' near {found_rep.location}."
            ))
            db.add(Notification(
                user_id=found_rep.user_id,
                match_id=match.id,
                report_id=found_rep.id,
                type="FINDER_ALERT",
                title=f"Owner Candidate Found ({pct}%)",
                message=f"A reported lost item ('{lost_rep.item_name}') has a {pct}% multimodal match to the item you found."
            ))
            db.commit()

    # 6. Academic Evaluation Ground Truth Benchmark dataset
    # Ground truth:
    # (rep_lost_1, rep_found_1) -> True match (same headphones)
    # (rep_lost_2, rep_found_2) -> True match (same laptop bag)
    # (rep_lost_4, rep_found_4) -> True match (same campus card)
    # (rep_lost_3, rep_found_3) -> False match (red flask vs silver bottle)
    # (rep_lost_1, rep_found_2) -> False match (headphones vs backpack)
    # (rep_lost_2, rep_found_1) -> False match (backpack vs headphones)
    # (rep_lost_3, rep_found_4) -> False match (flask vs ID card)
    benchmarks = [
        GroundTruthBenchmark(lost_report_id=rep_lost_1.id, found_report_id=rep_found_1.id, is_true_match=True, notes="Ground Truth Pair 1: Black JBL Headphones with scratch"),
        GroundTruthBenchmark(lost_report_id=rep_lost_2.id, found_report_id=rep_found_2.id, is_true_match=True, notes="Ground Truth Pair 2: Navy Dell Laptop Backpack"),
        GroundTruthBenchmark(lost_report_id=rep_lost_4.id, found_report_id=rep_found_4.id, is_true_match=True, notes="Ground Truth Pair 3: Aarav Sharma Student ID Card"),
        GroundTruthBenchmark(lost_report_id=rep_lost_3.id, found_report_id=rep_found_3.id, is_true_match=False, notes="Ground Truth Negative: Red Hydro Flask vs Silver Bottle"),
        GroundTruthBenchmark(lost_report_id=rep_lost_1.id, found_report_id=rep_found_2.id, is_true_match=False, notes="Ground Truth Negative: Headphones vs Laptop Bag"),
        GroundTruthBenchmark(lost_report_id=rep_lost_2.id, found_report_id=rep_found_1.id, is_true_match=False, notes="Ground Truth Negative: Laptop Bag vs Headphones"),
        GroundTruthBenchmark(lost_report_id=rep_lost_3.id, found_report_id=rep_found_4.id, is_true_match=False, notes="Ground Truth Negative: Water Flask vs ID Card"),
    ]
    db.add_all(benchmarks)
    db.commit()

    print("Smart Campus database successfully seeded with realistic multimodal data and academic benchmarks!")
