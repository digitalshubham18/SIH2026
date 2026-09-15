"""Seed data for DoCA Procurement Portal."""
import random
from datetime import datetime, timezone, timedelta


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
        khanna = await db.mandis.find_one({"code": "PB-KHN-01"})
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
            "mandi_id": khanna["id"] if khanna else None,
            "mandi_name": khanna["name"] if khanna else None,
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

    # Seed machinery for Khanna Mandi (officer's mandi)
    if await db.machinery.count_documents({}) == 0:
        khanna = await db.mandis.find_one({"code": "PB-KHN-01"})
        if khanna:
            items = [
                {"name": "Bulk Weighbridge #1", "type": "weighing_scale", "status": "operational", "notes": "50-ton digital, calibrated", "last_serviced": "2026-01-12"},
                {"name": "Platform Scale (Yard-A)", "type": "weighing_scale", "status": "maintenance", "notes": "Calibration pending", "last_serviced": "2025-11-20"},
                {"name": "Moisture Meter Grainpro", "type": "moisture_meter", "status": "operational", "notes": "Range 8-25%", "last_serviced": "2026-02-01"},
                {"name": "Toyota Forklift 3T", "type": "forklift", "status": "operational", "notes": "Diesel, 3-ton", "last_serviced": "2026-01-28"},
                {"name": "Forklift Hyster 2T", "type": "forklift", "status": "broken", "notes": "Hydraulic leak — pending repair", "last_serviced": "2025-10-05"},
                {"name": "Tarpaulin Set (30x40 ft)", "type": "tarpaulin", "status": "operational", "notes": "8 pieces, waterproof", "last_serviced": "2026-01-05"},
                {"name": "Yard PC Terminal", "type": "computer", "status": "operational", "notes": "e-Procurement client", "last_serviced": "2026-02-10"},
                {"name": "Kirloskar Generator 50KVA", "type": "generator", "status": "operational", "notes": "Backup power", "last_serviced": "2026-01-30"},
                {"name": "CCTV DVR (16-ch)", "type": "cctv", "status": "operational", "notes": "24x7 recording", "last_serviced": "2026-02-05"},
                {"name": "Belt Loader Conveyor", "type": "loader", "status": "operational", "notes": "15m belt, 5-hp", "last_serviced": "2026-01-15"},
            ]
            docs = [{"id": f"mach-{i}", "mandi_id": khanna["id"], "mandi_name": khanna["name"], **it, "created_at": _iso()} for i, it in enumerate(items, 1)]
            await db.machinery.insert_many(docs)

    # Seed sample jobs for Khanna Mandi
    if await db.jobs.count_documents({}) == 0:
        khanna = await db.mandis.find_one({"code": "PB-KHN-01"})
        if khanna:
            today = datetime.now(timezone.utc).date()
            samples = [
                {"title": "Loaders needed — Wheat rush day", "description": "5 loaders required for tomorrow's expected wheat rush. Physical work, 8-hour shift.", "role": "loader", "wage_per_day": 750, "workers_needed": 5, "day_offset": 1},
                {"title": "Data-entry helper (bilingual)", "description": "Assist officer in entering procurement data during peak hours. Must know basic computer + Punjabi/Hindi.", "role": "data_entry", "wage_per_day": 900, "workers_needed": 2, "day_offset": 2},
                {"title": "Overnight security", "description": "2 security personnel for overnight yard duty. 12-hour shift.", "role": "security", "wage_per_day": 850, "workers_needed": 2, "day_offset": 0},
            ]
            docs = []
            for i, s in enumerate(samples, 1):
                docs.append({
                    "id": f"job-{i}",
                    "mandi_id": khanna["id"],
                    "mandi_name": khanna["name"],
                    "mandi_state": khanna["state"],
                    "mandi_district": khanna["district"],
                    "title": s["title"],
                    "description": s["description"],
                    "role": s["role"],
                    "wage_per_day": s["wage_per_day"],
                    "workers_needed": s["workers_needed"],
                    "work_date": (today + timedelta(days=s["day_offset"])).isoformat(),
                    "contact_phone": "9999900002",
                    "status": "open",
                    "applications": [],
                    "posted_by": "Amrit Singh (Officer)",
                    "created_at": _iso(),
                })
            await db.jobs.insert_many(docs)
