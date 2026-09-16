"""Backend test suite for SIH 2026 Grain Procurement Portal.
Focus: role/mandi-based data isolation, officer approval, FCFS ordering,
authorization on booking processing and job decisions.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"phone": "9999900001", "password": "Admin@123"}
OFFICER = {"phone": "9999900002", "password": "Officer@123"}
FARMER = {"phone": "9876543210", "password": "Farmer@123"}

KHANNA_MANDI_ID = "mandi-pb-khn-01"


# ---------- Fixtures ----------
def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def officer_token():
    return _login(OFFICER)


@pytest.fixture(scope="session")
def farmer_token():
    return _login(FARMER)


# ---------- Health ----------
class TestHealth:
    def test_crops(self):
        r = requests.get(f"{API}/crops", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_mandis(self):
        r = requests.get(f"{API}/mandis", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5


# ---------- Officer registration + approval flow ----------
class TestOfficerRegistration:
    _created = {}

    def test_officer_register_pending(self):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Officer_{suffix}",
            "phone": f"777888{suffix[:4]}",  # unique-ish
            "password": "Test@1234",
            "email": f"test_off_{suffix}@example.com",
            "commission_id": f"ENAM-TEST-{suffix.upper()}",
            "aadhaar_last4": "1234",
        }
        r = requests.post(f"{API}/auth/officer-register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["verification_status"] == "pending"
        assert data["user"]["commission_id"].startswith("ENAM-TEST-")
        TestOfficerRegistration._created = {"payload": payload, "id": data["user"]["id"]}

    def test_pending_officer_cannot_login(self):
        p = TestOfficerRegistration._created["payload"]
        r = requests.post(f"{API}/auth/login", json={"phone": p["phone"], "password": p["password"]}, timeout=15)
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"

    def test_admin_approves_officer(self, admin_token):
        oid = TestOfficerRegistration._created["id"]
        r = requests.post(f"{API}/admin/officers/{oid}/approve", json={"reason": "test approve"}, headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200

    def test_approved_officer_can_login(self):
        p = TestOfficerRegistration._created["payload"]
        r = requests.post(f"{API}/auth/login", json={"phone": p["phone"], "password": p["password"]}, timeout=15)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_officer_register_bad_commission(self):
        r = requests.post(f"{API}/auth/officer-register", json={
            "name": "X", "phone": f"888{uuid.uuid4().hex[:7]}", "password": "P@ss1234",
            "email": f"bad_{uuid.uuid4().hex[:6]}@x.com", "commission_id": "AB", "aadhaar_last4": "1234"
        }, timeout=15)
        assert r.status_code == 400

    def test_officer_register_bad_aadhaar(self):
        r = requests.post(f"{API}/auth/officer-register", json={
            "name": "X", "phone": f"888{uuid.uuid4().hex[:7]}", "password": "P@ss1234",
            "email": f"bad2_{uuid.uuid4().hex[:6]}@x.com", "commission_id": "ENAM-XX-01", "aadhaar_last4": "12"
        }, timeout=15)
        assert r.status_code == 400


# ---------- Data isolation: Bookings ----------
class TestBookingIsolation:
    def test_admin_sees_all_bookings(self, admin_token):
        r = requests.get(f"{API}/admin/bookings", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        bookings = r.json()
        assert len(bookings) >= 30, f"expected many bookings, got {len(bookings)}"
        # FCFS ordering: created_at should be ascending
        created = [b.get("created_at", "") for b in bookings]
        assert created == sorted(created), "admin bookings not sorted by created_at ASC (FCFS)"

    def test_officer_sees_only_khanna(self, officer_token):
        r = requests.get(f"{API}/admin/bookings", headers=_hdr(officer_token), timeout=15)
        assert r.status_code == 200
        bookings = r.json()
        assert len(bookings) > 0
        mandi_ids = {b["mandi_id"] for b in bookings}
        assert mandi_ids == {KHANNA_MANDI_ID}, f"officer saw non-Khanna mandis: {mandi_ids}"
        # FCFS
        created = [b.get("created_at", "") for b in bookings]
        assert created == sorted(created)

    def test_officer_sees_fewer_than_admin(self, admin_token, officer_token):
        a = len(requests.get(f"{API}/admin/bookings", headers=_hdr(admin_token), timeout=15).json())
        o = len(requests.get(f"{API}/admin/bookings", headers=_hdr(officer_token), timeout=15).json())
        assert o < a


# ---------- Data isolation: Machinery / Jobs ----------
class TestMachineryJobsIsolation:
    def test_admin_sees_all_machinery(self, admin_token):
        r = requests.get(f"{API}/admin/machinery", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200

    def test_officer_machinery_scoped(self, officer_token):
        r = requests.get(f"{API}/admin/machinery", headers=_hdr(officer_token), timeout=15)
        assert r.status_code == 200
        items = r.json()
        for it in items:
            assert it["mandi_id"] == KHANNA_MANDI_ID

    def test_admin_sees_all_jobs(self, admin_token):
        r = requests.get(f"{API}/admin/jobs", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200

    def test_officer_jobs_scoped(self, officer_token):
        r = requests.get(f"{API}/admin/jobs", headers=_hdr(officer_token), timeout=15)
        assert r.status_code == 200
        for j in r.json():
            assert j["mandi_id"] == KHANNA_MANDI_ID


# ---------- Data isolation: Grievances ----------
class TestGrievances:
    _khanna_gid = None

    def test_farmer_creates_grievance_with_mandi(self, farmer_token):
        payload = {
            "mandi_id": KHANNA_MANDI_ID,
            "subject": "TEST_Payment Delay",
            "description": "TEST test grievance description",
        }
        r = requests.post(f"{API}/grievances", json=payload, headers=_hdr(farmer_token), timeout=15)
        assert r.status_code == 200, r.text
        g = r.json()
        assert g["mandi_id"] == KHANNA_MANDI_ID
        assert g["ticket_no"].startswith("GRV-")
        TestGrievances._khanna_gid = g["id"]

    def test_grievance_requires_mandi(self, farmer_token):
        r = requests.post(f"{API}/grievances", json={
            "subject": "no mandi", "description": "should fail"
        }, headers=_hdr(farmer_token), timeout=15)
        assert r.status_code in (400, 422)

    def test_admin_sees_all_grievances(self, admin_token):
        r = requests.get(f"{API}/admin/grievances", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        gs = r.json()
        assert len(gs) >= 1

    def test_officer_sees_only_own_mandi_grievances(self, officer_token):
        r = requests.get(f"{API}/admin/grievances", headers=_hdr(officer_token), timeout=15)
        assert r.status_code == 200
        gs = r.json()
        for g in gs:
            assert g["mandi_id"] == KHANNA_MANDI_ID


# ---------- Booking processing authorization ----------
class TestBookingProcessing:
    """Admin cannot start/complete/pay. Officer of that mandi can. Other-mandi officer -> 404."""

    def _get_khanna_booked(self, token, farmer_token=None):
        bookings = requests.get(f"{API}/admin/bookings", headers=_hdr(token), timeout=15).json()
        for b in bookings:
            if b["mandi_id"] == KHANNA_MANDI_ID and b["status"] == "booked":
                return b
        # Create a fresh booking as farmer for testing
        if farmer_token:
            from datetime import datetime, timedelta
            future = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
            r = requests.post(f"{API}/bookings", json={
                "mandi_id": KHANNA_MANDI_ID, "crop_id": "crop-wheat",
                "slot_date": future, "slot_time": "10:00", "quantity_quintal": 5.0
            }, headers=_hdr(farmer_token), timeout=15)
            if r.status_code == 200:
                return r.json()
        return None

    def test_admin_cannot_start(self, admin_token, officer_token, farmer_token):
        b = self._get_khanna_booked(officer_token, farmer_token)
        if not b:
            pytest.skip("no booked booking to test")
        # Note: server currently allows admin to start (no admin-block in start). Requirement says admin should NOT be able to start/complete/pay.
        r = requests.post(f"{API}/admin/bookings/{b['id']}/start", headers=_hdr(admin_token), timeout=15)
        # Per requirements, admin should get 403
        assert r.status_code == 403, f"REQ: admin should get 403 on start; got {r.status_code}"

    def test_admin_cannot_complete(self, admin_token, officer_token, farmer_token):
        b = self._get_khanna_booked(officer_token, farmer_token)
        if not b:
            pytest.skip("no booking")
        r = requests.post(f"{API}/admin/bookings/{b['id']}/complete", json={
            "actual_weight_quintal": 5.0, "quality_grade": "A", "price_per_quintal": 2275
        }, headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 403

    def test_admin_cannot_pay(self, admin_token, officer_token):
        # Find completed booking
        bookings = requests.get(f"{API}/admin/bookings", headers=_hdr(officer_token), timeout=15).json()
        completed = next((b for b in bookings if b["status"] == "completed"), None)
        if not completed:
            pytest.skip("no completed booking to try pay")
        r = requests.post(f"{API}/admin/bookings/{completed['id']}/pay", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 403

    def test_officer_can_start_and_complete(self, officer_token, farmer_token):
        b = self._get_khanna_booked(officer_token, farmer_token)
        if not b:
            pytest.skip("no booking")
        r = requests.post(f"{API}/admin/bookings/{b['id']}/start", headers=_hdr(officer_token), timeout=15)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/admin/bookings/{b['id']}/complete", json={
            "actual_weight_quintal": 8.0, "quality_grade": "A", "price_per_quintal": 2275
        }, headers=_hdr(officer_token), timeout=15)
        assert r2.status_code == 200
        r3 = requests.post(f"{API}/admin/bookings/{b['id']}/pay", headers=_hdr(officer_token), timeout=15)
        assert r3.status_code == 200
        assert "payment_ref" in r3.json()

    def test_cross_officer_cannot_access_other_mandi_booking(self, admin_token):
        # Register + approve fresh officer with different mandi, then try to start Khanna booking
        suffix = uuid.uuid4().hex[:6]
        reg = requests.post(f"{API}/auth/officer-register", json={
            "name": f"TEST_OtherOff_{suffix}",
            "phone": f"7770{suffix[:6]}",
            "password": "Other@1234",
            "email": f"other_{suffix}@x.com",
            "commission_id": f"ENAM-OTHER-{suffix.upper()}",
            "aadhaar_last4": "9999",
        }, timeout=15).json()
        oid = reg["user"]["id"]
        # approve
        requests.post(f"{API}/admin/officers/{oid}/approve", json={"reason": "ok"}, headers=_hdr(admin_token), timeout=15)
        other_tok = _login({"phone": f"7770{suffix[:6]}", "password": "Other@1234"})

        # Fetch a Khanna booking via admin
        bookings = requests.get(f"{API}/admin/bookings?mandi_id={KHANNA_MANDI_ID}", headers=_hdr(admin_token), timeout=15).json()
        assert bookings, "no khanna bookings"
        bid = bookings[0]["id"]

        # This other officer has no mandi -> should get 404
        r = requests.post(f"{API}/admin/bookings/{bid}/start", headers=_hdr(other_tok), timeout=15)
        assert r.status_code == 404

        # Also list bookings — should be empty
        r2 = requests.get(f"{API}/admin/bookings", headers=_hdr(other_tok), timeout=15)
        assert r2.status_code == 200
        assert r2.json() == []


# ---------- Job application decision authorization ----------
class TestJobDecideAuth:
    def test_admin_cannot_decide_application(self, admin_token, officer_token):
        # Grab any job with applications, else create one and apply
        jobs = requests.get(f"{API}/admin/jobs", headers=_hdr(officer_token), timeout=15).json()
        job_with_app = next((j for j in jobs if j.get("applications")), None)
        if not job_with_app:
            pytest.skip("no job with application to test decide")
        aid = job_with_app["applications"][0]["id"]
        jid = job_with_app["id"]
        r = requests.post(f"{API}/admin/jobs/{jid}/applications/{aid}/decide?decision=accepted",
                          headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 403
