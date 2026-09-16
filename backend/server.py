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

class OfficerRegisterIn(BaseModel):
    name: str
    phone: str
    password: str
    email: str
    mandi_id: Optional[str] = None  # optional legacy — new flow uses commission
    commission_id: str
    aadhaar_last4: str
    designation: Optional[str] = "Mandi Owner"
    documents_note: Optional[str] = None

class OfficerReviewIn(BaseModel):
    reason: Optional[str] = None

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
    # Block un-approved officer/mandi-owner logins
    if user.get("role") == "officer" and user.get("verification_status", "approved") != "approved":
        status = user.get("verification_status", "pending")
        raise HTTPException(403, f"Officer account is {status}. Please wait for DoCA verification.")
    token = make_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/officer-register")
async def officer_register(body: OfficerRegisterIn):
    if await db.users.find_one({"phone": body.phone}):
        raise HTTPException(400, "Phone already registered")
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email already registered")
    if not body.commission_id or len(body.commission_id.strip()) < 3:
        raise HTTPException(400, "Commission ID (e-NAM/APMC) required")
    if len(body.aadhaar_last4) != 4 or not body.aadhaar_last4.isdigit():
        raise HTTPException(400, "Aadhaar last 4 must be 4 digits")
    user = {
        "id": new_id(),
        "name": body.name,
        "phone": body.phone,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "officer",
        "designation": body.designation or "Mandi Owner",
        "commission_id": body.commission_id.strip().upper(),
        "aadhaar_last4": body.aadhaar_last4,
        "documents_note": body.documents_note,
        "verification_status": "pending",
        "verification_note": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "language": "en",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"ok": True, "user": user, "message": "Application submitted. DoCA will verify within 24-48 hours."}

@api.get("/admin/officer-applications")
async def officer_applications(status: Optional[str] = None, user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    q = {"role": "officer"}
    if status:
        q["verification_status"] = status
    officers = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return officers

@api.post("/admin/officers/{uid}/approve")
async def approve_officer(uid: str, body: OfficerReviewIn, user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    o = await db.users.find_one({"id": uid, "role": "officer"})
    if not o:
        raise HTTPException(404, "Officer not found")
    await db.users.update_one({"id": uid}, {"$set": {
        "verification_status": "approved",
        "verification_note": body.reason or "Documents verified.",
        "reviewed_by": user["name"],
        "reviewed_at": now_iso(),
    }})
    return {"ok": True}

@api.post("/admin/officers/{uid}/reject")
async def reject_officer(uid: str, body: OfficerReviewIn, user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    o = await db.users.find_one({"id": uid, "role": "officer"})
    if not o:
        raise HTTPException(404, "Officer not found")
    await db.users.update_one({"id": uid}, {"$set": {
        "verification_status": "rejected",
        "verification_note": body.reason or "Verification failed.",
        "reviewed_by": user["name"],
        "reviewed_at": now_iso(),
    }})
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

# ---------- Ownership helpers ----------
async def _user_mandi_ids(user) -> Optional[List[str]]:
    """Return list of mandi_ids owned by user. None = no scoping (admin)."""
    if user["role"] == "admin":
        return None
    if user["role"] == "officer":
        owned = await db.mandis.find({"owner_id": user["id"]}, {"_id": 0, "id": 1}).to_list(500)
        ids = [m["id"] for m in owned]
        # legacy assignment fallback
        if user.get("mandi_id") and user["mandi_id"] not in ids:
            ids.append(user["mandi_id"])
        return ids
    return []

async def _scope_query(user, extra: Optional[dict] = None) -> dict:
    q = dict(extra or {})
    mids = await _user_mandi_ids(user)
    if mids is not None:
        q["mandi_id"] = {"$in": mids} if mids else "___none___"
    return q

# ---------- Owner mandi CRUD ----------
class MandiIn(BaseModel):
    name: str
    code: str
    state: str
    district: str
    address: Optional[str] = None
    capacity_per_day: int = 100
    crops: List[str] = []

@api.post("/owner/mandis")
async def owner_create_mandi(body: MandiIn, user=Depends(current_user)):
    if user["role"] not in ("officer", "admin"):
        raise HTTPException(403, "Officer/Admin only")
    if user["role"] == "officer" and user.get("verification_status") != "approved":
        raise HTTPException(403, "Account not approved")
    if await db.mandis.find_one({"code": body.code}):
        raise HTTPException(400, "Mandi code already exists")
    m = {
        "id": new_id(),
        "name": body.name,
        "code": body.code.upper(),
        "state": body.state,
        "district": body.district,
        "address": body.address,
        "capacity_per_day": body.capacity_per_day,
        "crops": body.crops or [],
        "is_active": True,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "created_at": now_iso(),
    }
    await db.mandis.insert_one(m)
    m.pop("_id", None)
    return m

@api.get("/owner/mandis")
async def owner_list_mandis(user=Depends(current_user)):
    if user["role"] == "admin":
        return await db.mandis.find({}, {"_id": 0}).to_list(500)
    if user["role"] != "officer":
        raise HTTPException(403, "Officer only")
    return await db.mandis.find({"owner_id": user["id"]}, {"_id": 0}).to_list(500)

@api.patch("/owner/mandis/{mid}")
async def owner_update_mandi(mid: str, body: MandiIn, user=Depends(current_user)):
    m = await db.mandis.find_one({"id": mid})
    if not m:
        raise HTTPException(404, "Not found")
    if user["role"] == "officer" and m.get("owner_id") != user["id"]:
        raise HTTPException(404, "Not found")
    await db.mandis.update_one({"id": mid}, {"$set": {
        "name": body.name, "code": body.code.upper(), "state": body.state,
        "district": body.district, "address": body.address,
        "capacity_per_day": body.capacity_per_day, "crops": body.crops or [],
    }})
    return {"ok": True}

@api.delete("/owner/mandis/{mid}")
async def owner_delete_mandi(mid: str, user=Depends(current_user)):
    m = await db.mandis.find_one({"id": mid})
    if not m:
        raise HTTPException(404, "Not found")
    if user["role"] == "officer" and m.get("owner_id") != user["id"]:
        raise HTTPException(404, "Not found")
    await db.mandis.delete_one({"id": mid})
    return {"ok": True}

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

# ---------- Grievances / Support Tickets ----------
GRIEVANCE_SLA_HOURS = 48

class GrievanceIn(BaseModel):
    booking_id: Optional[str] = None
    mandi_id: str
    subject: str
    description: str
    category: Optional[str] = "other"

class GrievanceRespond(BaseModel):
    action: str  # resolve | reject | in_review
    resolution_note: str

def _sla_hours_left(created_iso: str) -> float:
    try:
        created = datetime.fromisoformat(created_iso)
    except Exception:
        return 0
    elapsed = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    return round(GRIEVANCE_SLA_HOURS - elapsed, 1)

def _enrich_grievance(g: dict) -> dict:
    left = _sla_hours_left(g["created_at"]) if g["status"] in ("open", "in_review") else 0
    g["sla_hours_left"] = left
    g["sla_breached"] = left < 0 and g["status"] in ("open", "in_review")
    return g

@api.post("/grievances")
async def create_grievance(body: GrievanceIn, user=Depends(current_user)):
    mandi = await db.mandis.find_one({"id": body.mandi_id})
    if not mandi:
        raise HTTPException(404, "Mandi not found")
    booking_ref = None
    if body.booking_id:
        b = await db.bookings.find_one({"id": body.booking_id})
        if b and b["farmer_id"] == user["id"]:
            booking_ref = {"token_number": b["token_number"], "mandi_name": b["mandi_name"], "crop_name": b["crop_name"]}
    ticket_no = f"GRV-{random.randint(100000, 999999)}"
    g = {
        "id": new_id(),
        "ticket_no": ticket_no,
        "farmer_id": user["id"],
        "farmer_name": user["name"],
        "farmer_phone": user["phone"],
        "farmer_state": user.get("state"),
        "mandi_id": body.mandi_id,
        "mandi_name": mandi["name"],
        "booking_id": body.booking_id,
        "booking_ref": booking_ref,
        "category": body.category or "other",
        "subject": body.subject,
        "description": body.description,
        "status": "open",
        "sla_hours": GRIEVANCE_SLA_HOURS,
        "resolution_note": None,
        "responded_by": None,
        "responded_at": None,
        "created_at": now_iso(),
    }
    await db.grievances.insert_one(g)
    g.pop("_id", None)
    await _push_notification(user["id"], "Grievance Registered", f"Ticket {ticket_no} filed. SLA: {GRIEVANCE_SLA_HOURS} hrs", "info")
    return _enrich_grievance(g)

@api.get("/grievances/my")
async def my_grievances(user=Depends(current_user)):
    gs = await db.grievances.find({"farmer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [_enrich_grievance(g) for g in gs]

@api.get("/admin/grievances")
async def admin_grievances(status: Optional[str] = None, category: Optional[str] = None, user=Depends(admin_only)):
    q = await _scope_query(user)
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    gs = await db.grievances.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_enrich_grievance(g) for g in gs]

@api.get("/admin/grievance-stats")
async def grievance_stats(user=Depends(admin_only)):
    scope = await _scope_query(user)
    total = await db.grievances.count_documents(scope)
    open_c = await db.grievances.count_documents({**scope, "status": "open"})
    review_c = await db.grievances.count_documents({**scope, "status": "in_review"})
    resolved_c = await db.grievances.count_documents({**scope, "status": "resolved"})
    rejected_c = await db.grievances.count_documents({**scope, "status": "rejected"})
    breach_cutoff = (datetime.now(timezone.utc) - timedelta(hours=GRIEVANCE_SLA_HOURS)).isoformat()
    breached = await db.grievances.count_documents({**scope, "status": {"$in": ["open", "in_review"]}, "created_at": {"$lt": breach_cutoff}})
    return {"total": total, "open": open_c, "in_review": review_c, "resolved": resolved_c, "rejected": rejected_c, "sla_breached": breached}

@api.post("/admin/grievances/{gid}/respond")
async def respond_grievance(gid: str, body: GrievanceRespond, user=Depends(admin_only)):
    g = await db.grievances.find_one({"id": gid})
    if not g:
        raise HTTPException(404, "Not found")
    mids = await _user_mandi_ids(user)
    if mids is not None and g.get("mandi_id") not in mids:
        raise HTTPException(404, "Not found")
    if body.action not in ("resolve", "reject", "in_review"):
        raise HTTPException(400, "Invalid action")
    new_status = {"resolve": "resolved", "reject": "rejected", "in_review": "in_review"}[body.action]
    await db.grievances.update_one({"id": gid}, {"$set": {
        "status": new_status,
        "resolution_note": body.resolution_note,
        "responded_by": user["name"],
        "responded_at": now_iso(),
    }})
    ntype = "success" if body.action == "resolve" else ("warning" if body.action == "reject" else "info")
    await _push_notification(g["farmer_id"], f"Grievance {g['ticket_no']} · {new_status.replace('_', ' ').title()}", body.resolution_note[:120], ntype)
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
    q = await _scope_query(user)
    if mandi_id:
        # if scoped, ensure mandi is in scope
        if isinstance(q.get("mandi_id"), dict) and mandi_id not in q["mandi_id"].get("$in", []):
            return []
        q["mandi_id"] = mandi_id
    if status:
        q["status"] = status
    if date:
        q["slot_date"] = date
    # FCFS: sort by created_at ASC per mandi
    return await db.bookings.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)

async def _assert_booking_scope(user, b):
    mids = await _user_mandi_ids(user)
    if mids is not None and b.get("mandi_id") not in mids:
        raise HTTPException(404, "Not found")

@api.post("/admin/bookings/{bid}/start")
async def start_processing(bid: str, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    await _assert_booking_scope(user, b)
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "in_process"}})
    await _push_notification(b["farmer_id"], "Your Turn - Please Report", f"Token #{b['token_number']} is now being processed at {b['mandi_name']}", "info")
    return {"ok": True}

@api.post("/admin/bookings/{bid}/complete")
async def complete_procurement(bid: str, body: ProcessIn, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    await _assert_booking_scope(user, b)
    # Admin cannot process payments — only mandi owner
    if user["role"] == "admin":
        raise HTTPException(403, "Only Mandi Owner can complete procurement")
    total = round(body.actual_weight_quintal * body.price_per_quintal, 2)
    await db.bookings.update_one({"id": bid}, {"$set": {
        "status": "completed",
        "actual_weight_quintal": body.actual_weight_quintal,
        "quality_grade": body.quality_grade,
        "price_per_quintal": body.price_per_quintal,
        "total_amount": total,
    }})
    await _push_notification(b["farmer_id"], "Procurement Completed", f"Grade {body.quality_grade}, {body.actual_weight_quintal} qtl @ ₹{body.price_per_quintal} = ₹{total}", "success")
    return {"ok": True, "total_amount": total}

@api.post("/admin/bookings/{bid}/pay")
async def pay(bid: str, user=Depends(admin_only)):
    b = await db.bookings.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Not found")
    await _assert_booking_scope(user, b)
    if user["role"] == "admin":
        raise HTTPException(403, "Only Mandi Owner can initiate DBT")
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
    if user["role"] == "admin":
        return await db.mandis.find({}, {"_id": 0}).to_list(500)
    mids = await _user_mandi_ids(user) or []
    return await db.mandis.find({"id": {"$in": mids}}, {"_id": 0}).to_list(500)

# ---------- Today's Crops ----------
def _officer_mandi(user):
    return user.get("mandi_id")

@api.get("/admin/today-crops")
async def today_crops(mandi_id: Optional[str] = None, user=Depends(admin_only)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q = await _scope_query(user, {"slot_date": today, "status": {"$in": ["booked", "queued", "in_process", "completed"]}})
    if mandi_id:
        if isinstance(q.get("mandi_id"), dict) and mandi_id not in q["mandi_id"].get("$in", []):
            return {"date": today, "mandi_id": mandi_id, "crops": [], "total_expected_quintal": 0, "total_farmers": 0, "bookings": []}
        q["mandi_id"] = mandi_id
    bookings = await db.bookings.find(q, {"_id": 0}).sort("created_at", 1).to_list(1000)
    crop_agg = {}
    for b in bookings:
        c = b.get("crop_name", "Unknown")
        entry = crop_agg.setdefault(c, {"crop": c, "quintal_expected": 0, "farmers": 0, "in_process": 0, "completed": 0})
        entry["quintal_expected"] += b.get("quantity_quintal", 0)
        entry["farmers"] += 1
        if b.get("status") == "in_process":
            entry["in_process"] += 1
        if b.get("status") == "completed":
            entry["completed"] += 1
    crops = sorted(crop_agg.values(), key=lambda x: -x["quintal_expected"])
    total_qtl = sum(c["quintal_expected"] for c in crops)
    return {"date": today, "mandi_id": mandi_id, "crops": crops, "total_expected_quintal": total_qtl, "total_farmers": len(bookings), "bookings": bookings}

# ---------- Machinery ----------
MACHINERY_TYPES = ["weighing_scale", "moisture_meter", "forklift", "tarpaulin", "computer", "generator", "cctv", "loader"]

class MachineryIn(BaseModel):
    mandi_id: Optional[str] = None
    name: str
    type: str
    status: str = "operational"  # operational | maintenance | broken
    notes: Optional[str] = None
    last_serviced: Optional[str] = None

@api.get("/admin/machinery")
async def list_machinery(mandi_id: Optional[str] = None, user=Depends(admin_only)):
    q = await _scope_query(user)
    if mandi_id:
        if isinstance(q.get("mandi_id"), dict) and mandi_id not in q["mandi_id"].get("$in", []):
            return []
        q["mandi_id"] = mandi_id
    items = await db.machinery.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.post("/admin/machinery")
async def add_machinery(body: MachineryIn, user=Depends(admin_only)):
    if body.type not in MACHINERY_TYPES:
        raise HTTPException(400, f"Invalid type. Allowed: {MACHINERY_TYPES}")
    if body.status not in ("operational", "maintenance", "broken"):
        raise HTTPException(400, "Invalid status")
    mid = body.mandi_id or _officer_mandi(user)
    if not mid:
        raise HTTPException(400, "mandi_id required")
    mandi = await db.mandis.find_one({"id": mid})
    if not mandi:
        raise HTTPException(404, "Mandi not found")
    m = {
        "id": new_id(),
        "mandi_id": mid,
        "mandi_name": mandi["name"],
        "name": body.name,
        "type": body.type,
        "status": body.status,
        "notes": body.notes,
        "last_serviced": body.last_serviced,
        "created_at": now_iso(),
    }
    await db.machinery.insert_one(m)
    m.pop("_id", None)
    return m

@api.patch("/admin/machinery/{mid}")
async def update_machinery(mid: str, body: MachineryIn, user=Depends(admin_only)):
    if body.status not in ("operational", "maintenance", "broken"):
        raise HTTPException(400, "Invalid status")
    await db.machinery.update_one({"id": mid}, {"$set": {
        "name": body.name, "type": body.type, "status": body.status,
        "notes": body.notes, "last_serviced": body.last_serviced,
    }})
    return {"ok": True}

@api.delete("/admin/machinery/{mid}")
async def delete_machinery(mid: str, user=Depends(admin_only)):
    await db.machinery.delete_one({"id": mid})
    return {"ok": True}

# ---------- Temporary Jobs ----------
JOB_ROLES = ["loader", "labour", "cleaner", "data_entry", "security", "packer", "helper"]

class JobIn(BaseModel):
    mandi_id: Optional[str] = None
    title: str
    description: str
    role: str
    wage_per_day: float
    workers_needed: int
    work_date: str  # YYYY-MM-DD
    contact_phone: str

class JobApplyIn(BaseModel):
    name: str
    phone: str
    note: Optional[str] = None

@api.get("/jobs")
async def public_jobs(state: Optional[str] = None):
    """Public list of open jobs — visible to farmers."""
    q = {"status": "open"}
    jobs = await db.jobs.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    if state:
        mandis = await db.mandis.find({"state": state}, {"_id": 0}).to_list(500)
        mids = {m["id"] for m in mandis}
        jobs = [j for j in jobs if j["mandi_id"] in mids]
    # hide applications details for public
    for j in jobs:
        j["applications_count"] = len(j.get("applications", []))
        j.pop("applications", None)
    return jobs

@api.post("/jobs/{jid}/apply")
async def apply_job(jid: str, body: JobApplyIn, user=Depends(current_user)):
    j = await db.jobs.find_one({"id": jid})
    if not j:
        raise HTTPException(404, "Job not found")
    if j["status"] != "open":
        raise HTTPException(400, "Job is closed")
    existing = next((a for a in j.get("applications", []) if a["phone"] == body.phone), None)
    if existing:
        raise HTTPException(400, "Already applied")
    app_rec = {
        "id": new_id(),
        "applicant_id": user["id"],
        "name": body.name,
        "phone": body.phone,
        "note": body.note,
        "status": "pending",
        "applied_at": now_iso(),
    }
    await db.jobs.update_one({"id": jid}, {"$push": {"applications": app_rec}})
    return {"ok": True, "application": app_rec}

@api.get("/admin/jobs")
async def list_jobs(mandi_id: Optional[str] = None, user=Depends(admin_only)):
    q = await _scope_query(user)
    if mandi_id:
        if isinstance(q.get("mandi_id"), dict) and mandi_id not in q["mandi_id"].get("$in", []):
            return []
        q["mandi_id"] = mandi_id
    jobs = await db.jobs.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return jobs

@api.post("/admin/jobs")
async def create_job(body: JobIn, user=Depends(admin_only)):
    if body.role not in JOB_ROLES:
        raise HTTPException(400, f"Invalid role. Allowed: {JOB_ROLES}")
    mid = body.mandi_id or _officer_mandi(user)
    if not mid:
        raise HTTPException(400, "mandi_id required")
    mandi = await db.mandis.find_one({"id": mid})
    if not mandi:
        raise HTTPException(404, "Mandi not found")
    j = {
        "id": new_id(),
        "mandi_id": mid,
        "mandi_name": mandi["name"],
        "mandi_state": mandi["state"],
        "mandi_district": mandi["district"],
        "title": body.title,
        "description": body.description,
        "role": body.role,
        "wage_per_day": body.wage_per_day,
        "workers_needed": body.workers_needed,
        "work_date": body.work_date,
        "contact_phone": body.contact_phone,
        "status": "open",
        "applications": [],
        "posted_by": user["name"],
        "created_at": now_iso(),
    }
    await db.jobs.insert_one(j)
    j.pop("_id", None)
    return j

@api.post("/admin/jobs/{jid}/close")
async def close_job(jid: str, user=Depends(admin_only)):
    await db.jobs.update_one({"id": jid}, {"$set": {"status": "closed"}})
    return {"ok": True}

@api.post("/admin/jobs/{jid}/applications/{aid}/decide")
async def decide_application(jid: str, aid: str, decision: str, user=Depends(admin_only)):
    j = await db.jobs.find_one({"id": jid})
    if not j:
        raise HTTPException(404, "Not found")
    # Only mandi owner (poster) can decide — admins cannot
    if user["role"] == "admin":
        raise HTTPException(403, "Only Mandi Owner who posted the job can decide")
    mids = await _user_mandi_ids(user) or []
    if j.get("mandi_id") not in mids:
        raise HTTPException(404, "Not found")
    if decision not in ("accepted", "rejected"):
        raise HTTPException(400, "Invalid decision")
    await db.jobs.update_one({"id": jid, "applications.id": aid}, {"$set": {"applications.$.status": decision}})
    return {"ok": True}

@api.get("/admin/mandis")

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
