import urllib.request
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req_body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(f"{BASE_URL}{url}", data=req_body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_ownership_workflow():
    print("\n=======================================================")
    print("TESTING HIDDEN-ATTRIBUTE OWNERSHIP VERIFICATION")
    print("=======================================================\n")

    # 1. Login as Aarav (Student)
    aarav_token = request_json("/api/auth/login", method="POST", data={"email": "aarav@campus.edu", "password": "password123"})["access_token"]
    print("1. Authenticated as Aarav.")

    # 2. Get Matches for Aarav
    matches = request_json("/api/matches", token=aarav_token)
    assert len(matches) > 0, "No matches found!"
    target_match = matches[0]
    match_id = target_match["id"]
    print(f"2. Testing on Match ID #{match_id} (Lost: '{target_match['lost_report']['item_name']}')")

    # Verify that private_ownership_attribute is NOT exposed in the match response
    assert "private_ownership_attribute" not in target_match["lost_report"], "SECURITY VIOLATION: private_ownership_attribute leaked in lost_report!"
    assert "private_ownership_attribute" not in target_match["found_report"], "SECURITY VIOLATION: private_ownership_attribute leaked in found_report!"
    print("3. Privacy check passed: private ownership attribute is NOT exposed in public match responses.")

    # Check reports/all public endpoint
    all_reps = request_json("/api/reports/all")
    for r in all_reps:
        assert "private_ownership_attribute" not in r, f"SECURITY VIOLATION: private attribute leaked in public report #{r['id']}!"
    print("4. Public reports directory checked: zero leakage of private attributes.")

    # 3. Test verification attempt with INCORRECT detail
    bad_res = request_json(
        f"/api/matches/{match_id}/verify-ownership",
        method="POST",
        data={"attribute_detail": "Random fake attribute that does not match"},
        token=aarav_token
    )
    print(f"\n5. Test: Incorrect secret detail submission:")
    print(f"   Status: {bad_res['status']} | Score: {bad_res['similarity_score']} | Message: {bad_res['message']}")
    assert bad_res["status"] in ["not_verified", "unavailable"], f"Unexpected status: {bad_res['status']}"

    # 4. Now test with a report that has an explicit private attribute
    # Check seed reports: report #1 (Aarav's JBL headphones)
    # Seed data has private attribute for lost report #1: "Small diagonal scratch on left ear cup hinge"
    match_with_secret = None
    for m in matches:
        if m["lost_report_id"] == 1:
            match_with_secret = m
            break
    
    if match_with_secret:
        m_id = match_with_secret["id"]
        # Correct answer
        good_res = request_json(
            f"/api/matches/{m_id}/verify-ownership",
            method="POST",
            data={"attribute_detail": "Small diagonal scratch on left ear cup hinge"},
            token=aarav_token
        )
        print(f"\n6. Test: Correct secret detail submission for Match #{m_id}:")
        print(f"   Status: {good_res['status']} | Score: {good_res['similarity_score']} | Message: {good_res['message']}")
        assert good_res["status"] == "verified"
        assert good_res["similarity_score"] >= 0.65
        assert "✓" in good_res["message"]

        # Re-fetch match to ensure verification status persisted
        updated_match = request_json(f"/api/matches/{m_id}", token=aarav_token)
        assert updated_match["verification_status"] == "verified"
        assert "private ownership detail was" in updated_match["explanation"].lower() or "verified" in updated_match["explanation"].lower()
        print(f"   Verified status persisted on match record. Updated explanation includes verification signal.")

    print("\n=======================================================")
    print("ALL HIDDEN-ATTRIBUTE VERIFICATION TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_ownership_workflow()
