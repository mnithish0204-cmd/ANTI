import urllib.request
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req_body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(f"{BASE_URL}{url}", data=req_body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_full_workflow():
    print("\n--- 1. Testing Health Endpoint ---")
    health = request_json("/api/health")
    assert health["status"] == "healthy"
    print("Health Status:", health["status"])

    print("\n--- 2. Testing Auth / Login for Aarav, Rahul, and Admin ---")
    aarav_token = request_json("/api/auth/login", method="POST", data={"email": "aarav@campus.edu", "password": "password123"})["access_token"]
    rahul_token = request_json("/api/auth/login", method="POST", data={"email": "rahul@campus.edu", "password": "password123"})["access_token"]
    admin_token = request_json("/api/auth/login", method="POST", data={"email": "admin@campus.edu", "password": "admin123"})["access_token"]
    print("Tokens acquired successfully.")

    print("\n--- 3. Testing Matches for Aarav ---")
    matches = request_json("/api/matches", token=aarav_token)
    assert len(matches) > 0, "No matches found for Aarav!"
    m1 = matches[0]
    print(f"Top Match ID #{m1['id']} | Classification: {m1['classification']} | Overall Score: {m1['overall_score']}")
    print(f"Modality Breakdown: Image={m1['image_score']} | Text={m1['text_score']} | Loc={m1['location_score']} | Time={m1['time_score']}")
    print(f"Dynamic Explanation: {m1['explanation']}")

    print("\n--- 4. Checking Privacy Masking (Pre-Confirmation) ---")
    finder_contact = m1["finder_contact"]
    print(f"Pre-Confirmation Finder Info: Name='{finder_contact['name']}', Phone='{finder_contact['phone']}', Unlocked={finder_contact.get('is_unlocked')}")
    assert finder_contact.get("is_unlocked") is False or m1["status"] == "CONFIRMED", "Privacy violation: Unconfirmed match leaked phone/email!"

    print("\n--- 5. Confirming Match #1 ---")
    confirmed_match = request_json(f"/api/matches/{m1['id']}/confirm", method="POST", token=aarav_token)
    assert confirmed_match["status"] == "CONFIRMED"
    print(f"Match #{m1['id']} Status updated to: {confirmed_match['status']}")
    
    unlocked_contact = confirmed_match["finder_contact"]
    print(f"Post-Confirmation Finder Info: Name='{unlocked_contact['name']}', Campus ID='{unlocked_contact['campus_id']}', Email='{unlocked_contact['email']}', Phone='{unlocked_contact['phone']}', Unlocked={unlocked_contact.get('is_unlocked')}")
    assert unlocked_contact.get("is_unlocked") is True, "Contact details failed to unlock post-confirmation!"
    assert unlocked_contact["name"] == "Rahul Kumar", "Unexpected finder name"

    print("\n--- 6. Testing Notifications for Aarav ---")
    notifs = request_json("/api/notifications", token=aarav_token)
    assert len(notifs) > 0, "No notifications for Aarav!"
    print(f"Aarav's latest notification: [{notifs[0]['type']}] {notifs[0]['title']} -> {notifs[0]['message']}")

    print("\n--- 7. Testing Academic Evaluation Benchmark (Methods 1-4) ---")
    evaluation = request_json("/api/admin/evaluation?threshold=0.60", token=admin_token)
    print(f"Total Ground Truth Pairs Evaluated: {evaluation['total_ground_truth_pairs']}")
    for m in evaluation["methods"]:
        print(f"-> {m['method_name']}: Precision={m['precision']:.2f}, Recall={m['recall']:.2f}, F1-Score={m['f1_score']:.2f}, Accuracy={m['accuracy']:.2f}, Mean Score={m['average_score']:.2f}")

    print("\n=======================================================")
    print("ALL END-TO-END WORKFLOW & PRIVACY TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_workflow()
