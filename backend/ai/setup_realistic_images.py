import os
import urllib.request
from PIL import Image

CATALOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "realistic_catalog")
TEST_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "test_images")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

os.makedirs(CATALOG_DIR, exist_ok=True)
os.makedirs(TEST_IMAGES_DIR, exist_ok=True)

IMAGE_SOURCES = {
    # Headphones & Headsets
    "headphones_black.jpg": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80",
    "headset_dark.jpg": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80",
    # Phones
    "phone_iphone.jpg": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80",
    # Wallets
    "wallet_black_leather.jpg": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&auto=format&fit=crop&q=80",
    "wallet_brown_leather.jpg": "https://images.unsplash.com/photo-1556774687-0e2fdd0116c0?w=500&auto=format&fit=crop&q=80",
    # Backpacks & Bags
    "backpack_blue.jpg": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
    "backpack_red.jpg": "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?w=500&auto=format&fit=crop&q=80",
    "backpack_black.jpg": "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=500&auto=format&fit=crop&q=80",
    "bag_brown_leather.jpg": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop&q=80",
    # Laptops
    "laptop_silver.jpg": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80",
    # Bottles & Flasks
    "bottle_red_flask.jpg": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80",
    "bottle_silver_steel.jpg": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop&q=80",
    # Cards & Identity
    "card_student_id.jpg": "https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=500&auto=format&fit=crop&q=80",
    # Keys
    "keys_car_key.jpg": "https://images.unsplash.com/photo-1589824783837-6169889fa20f?w=500&auto=format&fit=crop&q=80",
    # Books & Stationery
    "book_notebook.jpg": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80",
    # Shoes
    "shoe_red_sneaker.jpg": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
}

def download_and_optimize():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    print("Downloading and preparing realistic photographic catalog...")

    for filename, url in IMAGE_SOURCES.items():
        dest = os.path.join(CATALOG_DIR, filename)
        if not os.path.exists(dest) or os.path.getsize(dest) < 2000:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                with open(dest, "wb") as f:
                    f.write(data)
                # Ensure valid image and resize to standard 500x500
                with Image.open(dest) as img:
                    img_rgb = img.convert("RGB")
                    img_rgb.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    img_rgb.save(dest, "JPEG", quality=88)
                print(f"[OK] Saved {filename}")
            except Exception as e:
                print(f"Error fetching {filename}: {e}")

    # Copy / link seed images to uploads for realistic seed items
    seed_mappings = {
        "lost_headphones_scratch.jpg": "headphones_black.jpg",
        "found_headphones_scratch.jpg": "headset_dark.jpg",
        "blue_laptop_bag.jpg": "backpack_blue.jpg",
        "found_navy_backpack.jpg": "backpack_blue.jpg",
        "red_hydro_flask.jpg": "bottle_red_flask.jpg",
        "found_silver_flask.jpg": "bottle_silver_steel.jpg",
        "lost_campus_card.jpg": "card_student_id.jpg",
        "found_campus_card.jpg": "card_student_id.jpg",
    }
    for seed_name, cat_name in seed_mappings.items():
        src = os.path.join(CATALOG_DIR, cat_name)
        dst = os.path.join(UPLOADS_DIR, seed_name)
        if os.path.exists(src):
            try:
                with Image.open(src) as img:
                    img.save(dst, "JPEG", quality=88)
                print(f"[OK] Updated seed image: {seed_name} -> {cat_name}")
            except Exception as e:
                print(f"Error updating seed image {seed_name}: {e}")

    # Ensure test_images has all required test categories
    test_mappings = {
        "headphones.jpg": "headphones_black.jpg",
        "iphone.jpg": "phone_iphone.jpg",
        "wallet.jpg": "wallet_black_leather.jpg",
        "red_backpack.jpg": "backpack_red.jpg",
        "laptop.jpg": "laptop_silver.jpg",
        "id_card.jpg": "card_student_id.jpg",
        "keys.jpg": "keys_car_key.jpg",
        "bottle.jpg": "bottle_red_flask.jpg",
        "book.jpg": "book_notebook.jpg",
        "shoe.jpg": "shoe_red_sneaker.jpg"
    }
    for test_name, cat_name in test_mappings.items():
        src = os.path.join(CATALOG_DIR, cat_name)
        dst = os.path.join(TEST_IMAGES_DIR, test_name)
        if os.path.exists(src):
            try:
                with Image.open(src) as img:
                    img.save(dst, "JPEG", quality=88)
                print(f"[OK] Configured test image: {test_name}")
            except Exception as e:
                print(f"Error copying test image {test_name}: {e}")

if __name__ == "__main__":
    download_and_optimize()
