"""Seed data for DoCA Procurement Portal."""
import random
from datetime import datetime, timezone


def _iso():
    return datetime.now(timezone.utc).isoformat()


CROPS = [
    {"id": "crop-wheat", "name_en": "Wheat", "name_hi": "गेहूं", "name_pa": "ਕਣਕ", "msp": 2275, "unit": "quintal", "season": "Rabi"},
    {"id": "crop-paddy", "name_en": "Paddy (Rice)", "name_hi": "धान", "name_pa": "ਝੋਨਾ", "msp": 2300, "unit": "quintal", "season": "Kharif"},
    {"id": "crop-maize", "name_en": "Maize", "name_hi": "मक्का", "name_pa": "ਮੱਕੀ", "msp": 2225, "unit": "quintal", "season": "Kharif"},
    {"id": "crop-bajra", "name_en": "Bajra (Pearl Millet)", "name_hi": "बाजरा", "name_pa": "ਬਾਜਰਾ", "msp": 2625, "unit": "quintal", "season": "Kharif"},
    {"id": "crop-mustard", "name_en": "Mustard", "name_hi": "सरसों", "name_pa": "ਸਰ੍ਹੋਂ", "msp": 5650, "unit": "quintal", "season": "Rabi"},
    {"id": "crop-cotton", "name_en": "Cotton", "name_hi": "कपास", "name_pa": "ਕਪਾਹ", "msp": 7121, "unit": "quintal", "season": "Kharif"},
    {"id": "crop-chana", "name_en": "Chana (Gram)", "name_hi": "चना", "name_pa": "ਛੋਲੇ", "msp": 5440, "unit": "quintal", "season": "Rabi"},
    {"id": "crop-soybean", "name_en": "Soybean", "name_hi": "सोयाबीन", "name_pa": "ਸੋਇਆਬੀਨ", "msp": 4892, "unit": "quintal", "season": "Kharif"},
]

MANDIS = [
    # Punjab
    {"name": "Khanna Grain Market", "code": "PB-KHN-01", "state": "Punjab", "district": "Ludhiana", "address": "Khanna, Ludhiana, Punjab", "capacity_per_day": 200},
    {"name": "Rajpura APMC", "code": "PB-RJP-01", "state": "Punjab", "district": "Patiala", "address": "Rajpura, Patiala, Punjab", "capacity_per_day": 150},
    {"name": "Moga Anaj Mandi", "code": "PB-MG-01", "state": "Punjab", "district": "Moga", "address": "Moga, Punjab", "capacity_per_day": 180},
    {"name": "Bathinda Grain Market", "code": "PB-BTI-01", "state": "Punjab", "district": "Bathinda", "address": "Bathinda, Punjab", "capacity_per_day": 160},
    # Haryana
    {"name": "Karnal APMC", "code": "HR-KNL-01", "state": "Haryana", "district": "Karnal", "address": "Karnal, Haryana", "capacity_per_day": 220},
    {"name": "Kaithal Grain Market", "code": "HR-KTL-01", "state": "Haryana", "district": "Kaithal", "address": "Kaithal, Haryana", "capacity_per_day": 140},
    # UP
    {"name": "Lucknow Mandi Samiti", "code": "UP-LKO-01", "state": "Uttar Pradesh", "district": "Lucknow", "address": "Lucknow, UP", "capacity_per_day": 180},
    {"name": "Meerut APMC", "code": "UP-MRT-01", "state": "Uttar Pradesh", "district": "Meerut", "address": "Meerut, UP", "capacity_per_day": 160},
    # MP
    {"name": "Indore Krishi Upaj Mandi", "code": "MP-IDR-01", "state": "Madhya Pradesh", "district": "Indore", "address": "Indore, MP", "capacity_per_day": 210},
    {"name": "Ujjain Mandi", "code": "MP-UJN-01", "state": "Madhya Pradesh", "district": "Ujjain", "address": "Ujjain, MP", "capacity_per_day": 150},
    # Maharashtra
    {"name": "Latur APMC", "code": "MH-LTR-01", "state": "Maharashtra", "district": "Latur", "address": "Latur, Maharashtra", "capacity_per_day": 190},
    {"name": "Nashik Mandi", "code": "MH-NSK-01", "state": "Maharashtra", "district": "Nashik", "address": "Nashik, Maharashtra", "capacity_per_day": 170},
]


async def run_seed(db, hash_password):
    # Crops
    if await db.crops.count_documents({}) == 0:
        await db.crops.insert_many(CROPS)

    # Mandis
    if await db.mandis.count_documents({}) == 0:
        docs = []
        for m in MANDIS:
            docs.append({
                "id": f"mandi-{m['code'].lower()}",
                "name": m["name"],
                "code": m["code"],
                "state": m["state"],
                "district": m["district"],
                "address": m["address"],
                "capacity_per_day": m["capacity_per_day"],
                "crops": [c["id"] for c in CROPS],
                "is_active": True,
                "created_at": _iso(),
            })
        await db.mandis.insert_many(docs)

    # Mandi prices - one price per mandi per crop with slight variance around MSP
    if await db.mandi_prices.count_documents({}) == 0:
        prices = []
        mandis = await db.mandis.find({}).to_list(500)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for m in mandis:
            for c in CROPS:
                variance = random.uniform(-50, 250)
                prices.append({
                    "id": f"price-{m['id']}-{c['id']}",
                    "mandi_id": m["id"],
                    "crop_id": c["id"],
                    "crop_name": c["name_en"],
                    "price": round(c["msp"] + variance, 2),
                    "msp": c["msp"],
                    "arrival_quintal": random.randint(50, 800),
                    "date": today,
                })
        await db.mandi_prices.insert_many(prices)

    # Admin user
    if not await db.users.find_one({"email": "shubraj2323@gmail.com"}):
        await db.users.insert_one({
            "id": "admin-001",
            "name": "Shubh Raj (Admin)",
            "phone": "9999900001",
            "email": "shubraj2323@gmail.com",
            "password_hash": hash_password("Admin@123"),
            "role": "admin",
            "language": "en",
            "state": "Delhi",
            "district": "New Delhi",
            "created_at": _iso(),
        })

    # Officer demo account
    if not await db.users.find_one({"phone": "9999900002"}):
        await db.users.insert_one({
            "id": "officer-001",
            "name": "Amrit Singh (Officer)",
            "phone": "9999900002",
            "email": "officer@doca.gov.in",
            "password_hash": hash_password("Officer@123"),
            "role": "officer",
            "language": "en",
            "state": "Punjab",
            "district": "Ludhiana",
            "created_at": _iso(),
        })

    # Demo farmer
    if not await db.users.find_one({"phone": "9876543210"}):
        await db.users.insert_one({
            "id": "farmer-demo",
            "name": "Balwinder Kaur",
            "phone": "9876543210",
            "email": None,
            "password_hash": hash_password("Farmer@123"),
            "role": "farmer",
            "village": "Sangrur Kalan",
            "district": "Sangrur",
            "state": "Punjab",
            "aadhaar_last4": "4321",
            "language": "pa",
            "created_at": _iso(),
        })

    # Historical demo bookings for analytics wow-factor (last 7 days)
    if await db.bookings.count_documents({"status": {"$in": ["completed", "paid"]}}) < 20:
        from datetime import timedelta
        mandis_all = await db.mandis.find({}).to_list(500)
        crops_all = await db.crops.find({}).to_list(50)
        today = datetime.now(timezone.utc).date()
        names = [
            ("Ramesh Kumar", "9800000001", "Punjab"),
            ("Sukhdev Singh", "9800000002", "Punjab"),
            ("Harpreet Kaur", "9800000003", "Haryana"),
            ("Ravi Sharma", "9800000004", "Uttar Pradesh"),
            ("Vikas Patel", "9800000005", "Madhya Pradesh"),
            ("Suresh Yadav", "9800000006", "Maharashtra"),
            ("Rajni Devi", "9800000007", "Haryana"),
            ("Mohan Lal", "9800000008", "Punjab"),
            ("Kailash Meena", "9800000009", "Madhya Pradesh"),
            ("Anita Kumari", "9800000010", "Uttar Pradesh"),
        ]
        hist = []
        counter = 0
        for day_offset in range(7, 0, -1):
            d = (today - timedelta(days=day_offset)).isoformat()
            n_bookings = random.randint(5, 12)
            for _ in range(n_bookings):
                counter += 1
                m = random.choice(mandis_all)
                c = random.choice(crops_all)
                name, phone, _state = random.choice(names)
                qty = round(random.uniform(8, 40), 1)
                price = c["msp"] + random.uniform(-30, 200)
                total = round(qty * price, 2)
                is_paid = random.random() > 0.2
                hist.append({
                    "id": f"hist-{counter}",
                    "farmer_id": f"hist-farmer-{counter}",
                    "farmer_name": name,
                    "farmer_phone": phone,
                    "mandi_id": m["id"],
                    "mandi_name": m["name"],
                    "crop_id": c["id"],
                    "crop_name": c["name_en"],
                    "slot_date": d,
                    "slot_time": f"{random.randint(8, 15):02d}:00",
                    "quantity_quintal": qty,
                    "token_number": counter,
                    "status": "paid" if is_paid else "completed",
                    "actual_weight_quintal": qty,
                    "quality_grade": random.choice(["A", "A", "B", "B", "C"]),
                    "price_per_quintal": round(price, 2),
                    "total_amount": total,
                    "payment_status": "paid" if is_paid else "pending",
                    "payment_ref": f"DBT{random.randint(100000, 999999)}" if is_paid else None,
                    "created_at": _iso(),
                })
        if hist:
            await db.bookings.insert_many(hist)
