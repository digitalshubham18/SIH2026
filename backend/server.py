"""FastAPI backend for DoCA Smart Grain Procurement Portal (SIH 2026)."""
import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "sih-2026-procurement-portal-secret-key-doca")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="DoCA Grain Procurement API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("procurement")

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

async def admin_only(user=Depends(current_user)):
    if user["role"] not in ("admin", "officer"):
        raise HTTPException(403, "Admin/Officer only")
    return user

# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str
    phone: str
    password: str
    email: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    language: str = "en"

class LoginIn(BaseModel):
    phone: str
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class BookingIn(BaseModel):
    mandi_id: str
    crop_id: str
    slot_date: str  # YYYY-MM-DD
    slot_time: str  # HH:MM
    quantity_quintal: float

class ProcessIn(BaseModel):
    actual_weight_quintal: float
    quality_grade: str  # A / B / C
    price_per_quintal: float

# ---------- Auth ----------
@api.post("/auth/send-otp")
async def send_otp(body: OTPRequest):
    code = f"{random.randint(1000, 9999)}"
    await db.otps.update_one(
        {"phone": body.phone},
        {"$set": {"phone": body.phone, "code": code, "created_at": now_iso()}},
        upsert=True,
    )
    log.info(f"[SIMULATED SMS] OTP for {body.phone} = {code}")
    # Return code in dev mode so judges can complete flow
    return {"ok": True, "simulated_otp": code, "message": "OTP sent (demo mode: shown on screen)"}

@api.post("/auth/verify-otp")
async def verify_otp(body: OTPVerify):
    rec = await db.otps.find_one({"phone": body.phone})
    if not rec or rec["code"] != body.code:
        raise HTTPException(400, "Invalid OTP")
    await db.otps.delete_one({"phone": body.phone})
    return {"ok": True}

@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"phone": body.phone})
    if existing:
        raise HTTPException(400, "Phone already registered")
    user = {
        "id": new_id(),
        "name": body.name,
        "phone": body.phone,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "farmer",
        "village": body.village,
        "district": body.district,
        "state": body.state,
        "aadhaar_last4": body.aadhaar_last4,
        "language": body.language,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = make_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"phone": body.phone})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid phone or password")
    token = make_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

# ---------- Crops ----------
@api.get("/crops")
async def list_crops():
    return await db.crops.find({}, {"_id": 0}).to_list(200)

# ---------- Mandis ----------
@api.get("/mandis")
async def list_mandis(
    crop_id: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    q: Optional[str] = None,
):
    query = {"is_active": True}
    if crop_id:
        query["crops"] = crop_id
    if state:
        query["state"] = state
    if district:
        query["district"] = district
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    mandis = await db.mandis.find(query, {"_id": 0}).to_list(500)
    # Attach today's booking load
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for m in mandis:
        booked = await db.bookings.count_documents(
            {"mandi_id": m["id"], "slot_date": today, "status": {"$in": ["booked", "queued", "in_process"]}}
        )
        m["current_load"] = booked
        cap = m.get("capacity_per_day", 100) or 100
        ratio = booked / cap if cap else 0
        m["crowd_level"] = "low" if ratio < 0.4 else ("medium" if ratio < 0.75 else "high")
    return mandis

@api.get("/mandis/{mandi_id}")
async def get_mandi(mandi_id: str):
    m = await db.mandis.find_one({"id": mandi_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Not found")
    return m

@api.get("/mandi-prices")
async def mandi_prices(crop_id: Optional[str] = None, state: Optional[str] = None):
    query = {}
    if crop_id:
        query["crop_id"] = crop_id
    prices = await db.mandi_prices.find(query, {"_id": 0}).to_list(1000)
    # Attach mandi info
    mandi_ids = list({p["mandi_id"] for p in prices})
    mandis = await db.mandis.find({"id": {"$in": mandi_ids}}, {"_id": 0}).to_list(500)
    mmap = {m["id"]: m for m in mandis}
    for p in prices:
        m = mmap.get(p["mandi_id"], {})
        p["mandi_name"] = m.get("name")
        p["state"] = m.get("state")
        p["district"] = m.get("district")
    if state:
        prices = [p for p in prices if p.get("state") == state]
    prices.sort(key=lambda x: -x.get("price", 0))
    return prices

# ---------- Bookings ----------
async def _next_token(mandi_id: str, slot_date: str) -> int:
    count = await db.bookings.count_documents({"mandi_id": mandi_id, "slot_date": slot_date})
    return count + 1

async def _push_notification(user_id: str, title: str, message: str, ntype: str = "info"):
    n = {
        "id": new_id(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(n)
    # simulated SMS log
    user = await db.users.find_one({"id": user_id})
    if user:
        log.info(f"[SIMULATED SMS -> {user.get('phone')}] {title}: {message}")
    return n

@api.post("/bookings")
async def create_booking(body: BookingIn, user=Depends(current_user)):
    mandi = await db.mandis.find_one({"id": body.mandi_id})
    if not mandi:
        raise HTTPException(404, "Mandi not found")
    crop = await db.crops.find_one({"id": body.crop_id})
    if not crop:
        raise HTTPException(404, "Crop not found")
    token = await _next_token(body.mandi_id, body.slot_date)
    booking = {
        "id": new_id(),
        "farmer_id": user["id"],
        "farmer_name": user["name"],
        "farmer_phone": user["phone"],
        "mandi_id": body.mandi_id,
        "mandi_name": mandi["name"],
        "crop_id": body.crop_id,
        "crop_name": crop["name_en"],
        "slot_date": body.slot_date,
        "slot_time": body.slot_time,
        "quantity_quintal": body.quantity_quintal,
        "token_number": token,
        "status": "booked",
        "actual_weight_quintal": None,
        "quality_grade": None,
        "price_per_quintal": None,
        "total_amount": None,
        "payment_status": "pending",
        "payment_ref": None,
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    await _push_notification(
        user["id"],
        "Slot Booked Successfully",
        f"Token #{token} at {mandi['name']} on {body.slot_date} {body.slot_time}",
        "success",
    )
    return booking

@api.get("/bookings/my")
async def my_bookings(user=Depends(current_user)):
    bookings = await db.bookings.find({"farmer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return bookings

@api.get("/bookings/{bid}")
async def get_booking(bid: str, user=Depends(current_user)):
    b = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Not found")
    if user["role"] == "farmer" and b["farmer_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    return b

@api.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user=Depends(current_user)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    if b["farmer_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if b["status"] not in ("booked", "queued"):
        raise HTTPException(400, "Cannot cancel now")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "cancelled"}})
    await _push_notification(user["id"], "Booking Cancelled", f"Token #{b['token_number']} cancelled", "warning")
    return {"ok": True}

# ---------- Queue ----------
@api.get("/queue/{mandi_id}")
async def queue_status(mandi_id: str, date: Optional[str] = None):
    d = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    bookings = await db.bookings.find(
        {"mandi_id": mandi_id, "slot_date": d, "status": {"$in": ["booked", "queued", "in_process", "completed"]}},
        {"_id": 0, "farmer_id": 0, "farmer_phone": 0},
    ).sort("token_number", 1).to_list(500)
    in_process = next((b for b in bookings if b["status"] == "in_process"), None)
    pending = [b for b in bookings if b["status"] in ("booked", "queued")]
    return {
        "date": d,
        "mandi_id": mandi_id,
        "total": len(bookings),
        "in_process": in_process,
        "pending": pending,
        "completed_count": sum(1 for b in bookings if b["status"] == "completed"),
        "avg_processing_minutes": 12,
    }

# ---------- Notifications ----------
@api.get("/notifications")
async def list_notifications(user=Depends(current_user)):
    ns = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return ns

@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user=Depends(current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def read_all(user=Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Admin / Officer ----------
@api.get("/admin/stats")
async def admin_stats(user=Depends(admin_only)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_farmers = await db.users.count_documents({"role": "farmer"})
    total_mandis = await db.mandis.count_documents({"is_active": True})
    today_bookings = await db.bookings.count_documents({"slot_date": today})
    active_queue = await db.bookings.count_documents({"slot_date": today, "status": {"$in": ["booked", "queued", "in_process"]}})
    completed = await db.bookings.count_documents({"status": "completed"})
    paid = await db.bookings.count_documents({"payment_status": "paid"})
    total_procured = await db.bookings.aggregate(
        [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "sum": {"$sum": "$actual_weight_quintal"}}}]
    ).to_list(1)
    total_paid_amt = await db.bookings.aggregate(
        [{"$match": {"payment_status": "paid"}}, {"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}}]
    ).to_list(1)
    return {
        "total_farmers": total_farmers,
        "total_mandis": total_mandis,
        "today_bookings": today_bookings,
        "active_queue": active_queue,
        "completed_procurements": completed,
        "paid_disbursals": paid,
        "total_procured_quintal": (total_procured[0]["sum"] if total_procured else 0),
        "total_paid_amount": (total_paid_amt[0]["sum"] if total_paid_amt else 0),
    }

@api.get("/admin/bookings")
async def admin_bookings(
    mandi_id: Optional[str] = None, status: Optional[str] = None, date: Optional[str] = None, user=Depends(admin_only)
):
    q = {}
    if mandi_id:
        q["mandi_id"] = mandi_id
    if status:
        q["status"] = status
    if date:
        q["slot_date"] = date
    return await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/admin/bookings/{bid}/start")
async def start_processing(bid: str, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "in_process"}})
    await _push_notification(
        b["farmer_id"], "Your Turn - Please Report", f"Token #{b['token_number']} is now being processed at {b['mandi_name']}", "info"
    )
    return {"ok": True}

@api.post("/admin/bookings/{bid}/complete")
async def complete_procurement(bid: str, body: ProcessIn, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    total = round(body.actual_weight_quintal * body.price_per_quintal, 2)
    await db.bookings.update_one(
        {"id": bid},
        {"$set": {
            "status": "completed",
            "actual_weight_quintal": body.actual_weight_quintal,
            "quality_grade": body.quality_grade,
            "price_per_quintal": body.price_per_quintal,
            "total_amount": total,
        }},
    )
    await _push_notification(
        b["farmer_id"],
        "Procurement Completed",
        f"Grade {body.quality_grade}, {body.actual_weight_quintal} qtl @ ₹{body.price_per_quintal} = ₹{total}",
        "success",
    )
    return {"ok": True, "total_amount": total}

@api.post("/admin/bookings/{bid}/pay")
async def pay(bid: str, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    if b["status"] != "completed":
        raise HTTPException(400, "Complete procurement first")
    ref = f"DBT{random.randint(100000, 999999)}"
    await db.bookings.update_one({"id": bid}, {"$set": {"payment_status": "paid", "payment_ref": ref, "status": "paid"}})
    await _push_notification(
        b["farmer_id"],
        "Payment Disbursed via DBT",
        f"₹{b['total_amount']} credited to your account. Ref: {ref}",
        "success",
    )
    return {"ok": True, "payment_ref": ref}

@api.get("/admin/mandis")
async def admin_mandis(user=Depends(admin_only)):
    return await db.mandis.find({}, {"_id": 0}).to_list(500)

# ---------- Analytics ----------
@api.get("/admin/analytics")
async def admin_analytics(user=Depends(admin_only)):
    completed = await db.bookings.find(
        {"status": {"$in": ["completed", "paid"]}}, {"_id": 0}
    ).to_list(5000)

    # State-wise procurement (from mandis)
    mandis = await db.mandis.find({}, {"_id": 0}).to_list(500)
    mmap = {m["id"]: m for m in mandis}
    state_agg = {}
    for b in completed:
        m = mmap.get(b["mandi_id"])
        if not m:
            continue
        s = m["state"]
        entry = state_agg.setdefault(s, {"state": s, "quintal": 0, "amount": 0, "bookings": 0})
        entry["quintal"] += b.get("actual_weight_quintal") or 0
        entry["amount"] += b.get("total_amount") or 0
        entry["bookings"] += 1
    state_wise = sorted(state_agg.values(), key=lambda x: -x["quintal"])

    # Crop-wise
    crop_agg = {}
    for b in completed:
        c = b.get("crop_name", "Unknown")
        entry = crop_agg.setdefault(c, {"crop": c, "quintal": 0, "amount": 0})
        entry["quintal"] += b.get("actual_weight_quintal") or 0
        entry["amount"] += b.get("total_amount") or 0
    crop_wise = sorted(crop_agg.values(), key=lambda x: -x["quintal"])

    # Daily arrivals - last 7 days by slot_date
    all_bookings = await db.bookings.find({}, {"_id": 0}).to_list(5000)
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    daily_map = {d: {"date": d, "bookings": 0, "completed": 0, "quintal": 0} for d in days}
    for b in all_bookings:
        d = b.get("slot_date")
        if d in daily_map:
            daily_map[d]["bookings"] += 1
            if b.get("status") in ("completed", "paid"):
                daily_map[d]["completed"] += 1
                daily_map[d]["quintal"] += b.get("actual_weight_quintal") or 0
    daily = [daily_map[d] for d in days]

    return {"state_wise": state_wise, "crop_wise": crop_wise, "daily_arrivals": daily}

# ---------- Include & CORS ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Seed on startup ----------
@app.on_event("startup")
async def seed():
    from seed_data import run_seed
    await run_seed(db, hash_password)

@app.on_event("shutdown")
async def shutdown():
    client.close()
