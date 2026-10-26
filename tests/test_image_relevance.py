import urllib.request
import urllib.parse
import json
import os
import sys
import mimetypes
import uuid

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def post_multipart(url, fields, files, token=None):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    lines = []
    
    for name, value in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))
        
    for name, (filename, file_path) in files.items():
        mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f"Content-Type: {mime}".encode("utf-8"))
        lines.append(b"")
        with open(file_path, "rb") as f:
            lines.append(f.read())
            
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    body = b"\r\n".join(lines)
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body))
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req = urllib.request.Request(f"{BASE_URL}{url}", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(error_body)
        except Exception:
            parsed = error_body
        return e.code, parsed

def run_tests():
    print("\n=======================================================")
    print("TESTING IMAGE RELEVANCE VALIDATION FEATURE")
    print("=======================================================\n")

    # Get auth token for Aarav
    login_data = json.dumps({"email": "aarav@campus.edu", "password": "password123"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode("utf-8"))["access_token"]
    print("Authenticated successfully.")

    # Test all required item categories for both Relevant and Irrelevant image inputs:
    # Categories: headphones, mobile phones, wallets, backpacks, laptops, ID cards, keys, bottles, books
    category_cases = [
        # 1. Headphones
        ("Black JBL Wireless Headphones", "Electronics", "Black wireless over-ear headphones", "test_images/headphones.jpg", True),
        ("Black JBL Wireless Headphones", "Electronics", "Black wireless over-ear headphones", "test_images/wallet.jpg", False),
        # 2. Wallets
        ("Black Leather Wallet", "Keys & Accessories", "Small black leather wallet with card slots", "test_images/wallet.jpg", True),
        ("Black Leather Wallet", "Keys & Accessories", "Small black leather wallet with card slots", "test_images/iphone.jpg", False),
        # 3. Backpacks
        ("Blue Backpack", "Bags & Luggage", "Blue school backpack with shoulder straps", "test_images/red_backpack.jpg", True),
        ("Blue Backpack", "Bags & Luggage", "Blue school backpack with shoulder straps", "test_images/shoe.jpg", False),
        # 4. Mobile Phones
        ("iPhone 15 Pro", "Electronics", "Apple iPhone smartphone mobile device", "test_images/iphone.jpg", True),
        ("iPhone 15 Pro", "Electronics", "Apple iPhone smartphone mobile device", "test_images/red_backpack.jpg", False),
        # 5. Laptops
        ("Silver Laptop", "Electronics", "Silver laptop notebook computer", "test_images/laptop.jpg", True),
        ("Silver Laptop", "Electronics", "Silver laptop notebook computer", "test_images/bottle.jpg", False),
        # 6. ID Cards
        ("Student ID Card", "Identity & Cards", "Campus student identity card badge with lanyard", "test_images/id_card.jpg", True),
        ("Student ID Card", "Identity & Cards", "Campus student identity card badge with lanyard", "test_images/shoe.jpg", False),
        # 7. Keys
        ("Black Car Key", "Keys & Accessories", "Black modern car key remote fob with keychain", "test_images/keys.jpg", True),
        ("Black Car Key", "Keys & Accessories", "Black modern car key remote fob with keychain", "test_images/laptop.jpg", False),
        # 8. Bottles
        ("Red Water Bottle", "Bottles & Flasks", "Red insulated water bottle flask", "test_images/bottle.jpg", True),
        ("Red Water Bottle", "Bottles & Flasks", "Red insulated water bottle flask", "test_images/book.jpg", False),
        # 9. Books
        ("Notebook Book", "Books & Stationery", "College lined notebook study book", "test_images/book.jpg", True),
        ("Notebook Book", "Books & Stationery", "College lined notebook study book", "test_images/wallet.jpg", False),
    ]

    for idx, (c_name, c_cat, c_desc, c_img, c_exp) in enumerate(category_cases, start=1):
        status, res = post_multipart(
            "/api/reports/validate-image",
            {"item_name": c_name, "category": c_cat, "description": c_desc},
            {"image": (os.path.basename(c_img), c_img)}
        )
        print(f"\n{idx}. Test: '{c_name}' with {c_img}:")
        print(f"   Status: {status} | Relevance Score: {res.get('relevanceScore')} | Raw Score: {res.get('similarity_score')} | Relevant: {res.get('is_relevant')}")
        print(f"   Message: {res.get('message')}")
        assert status == 200
        assert res["is_relevant"] is c_exp
        if c_exp:
            assert res["message"] == "✓ Image matches the entered item."
            assert res.get("relevanceScore", 0) >= 0.80
        else:
            assert res["message"] == "⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item."
            assert res.get("relevanceScore", 1.0) <= 0.35

    # 2. Test Report Submission with Irrelevant Image is Blocked on Backend:
    status, res = post_multipart(
        "/api/reports",
        {
            "report_type": "lost",
            "item_name": "Red Backpack",
            "category": "Bags & Luggage",
            "description": "Red school backpack with straps",
            "location": "Main Library",
            "date": "2026-09-25",
            "time": "14:00"
        },
        {"image": ("laptop.jpg", "test_images/laptop.jpg")},
        token=token
    )
    print("\n6. Test: Submitting report with IRRELEVANT image:")
    print(f"   HTTP Status: {status} (Expected: 400)")
    print(f"   Response Detail: {res.get('detail')}")
    assert status == 400
    assert res.get("detail") == "⚠️ Irrelevant image uploaded. Please upload an image that matches the entered item."

    # 3. Test Report Submission with Relevant Image Succeeds:
    status, res = post_multipart(
        "/api/reports",
        {
            "report_type": "lost",
            "item_name": "Red Backpack",
            "category": "Bags & Luggage",
            "description": "Red school backpack with straps",
            "location": "Main Library",
            "date": "2026-09-25",
            "time": "14:00"
        },
        {"image": ("red_backpack.jpg", "test_images/red_backpack.jpg")},
        token=token
    )
    print("\n7. Test: Submitting report with RELEVANT image:")
    print(f"   HTTP Status: {status} (Expected: 200)")
    print(f"   Created Report ID: {res.get('id')} | Item: '{res.get('item_name')}'")
    assert status == 200
    assert res.get("item_name") == "Red Backpack"

    print("\n=======================================================")
    print("ALL IMAGE RELEVANCE VALIDATION TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
