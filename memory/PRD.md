# DoCA Smart Grain Procurement & Queue Management Portal (SIH 2026 · Problem #26032)

## Problem Statement
Farmers often face long waiting times, lack of information regarding procurement schedules, and uncertainty about procurement status.
Ministry of Consumer Affairs, Food & Public Distribution · Department of Consumer Affairs (DoCA). Category: Software · Theme: Smart Automation.

## Solution Snapshot
A PMFBY-inspired government portal with real-time slot booking, live queue tracking, DBT payment simulation, multi-lingual UI (EN/HI/PA), and separate consoles for farmers and mandi officers/admins.

## Personas
- **Farmer**: Registers with phone+OTP, books a slot at the best-priced mandi in region, tracks queue, receives DBT payment.
- **Procurement Officer**: Starts processing tokens, records weight/grade/price, initiates DBT payments.
- **DoCA Admin**: Views nation-wide stats and monitors all bookings.
- **SIH Judge**: Uses demo accounts to walk the whole loop from booking → payment.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async), JWT auth via `pyjwt`, bcrypt hashing, seed-on-startup.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + lucide-react + sonner. Multi-lingual via `LangContext` (EN/HI/PA) with Noto Devanagari/Gurmukhi fonts.
- **Data**: Users, Crops (8), Mandis (12 across 6 states), MandiPrices, Bookings (with lifecycle: booked → in_process → completed → paid), Notifications.
- **SMS**: Simulated (OTP shown on screen) — swap-ready for real Twilio Verify SID.

## What's Implemented (2026-02)
- Landing (hero, Ashoka emblem, animated counters, how-it-works, features, FAQ, CTA)
- Registration with simulated OTP; JWT login
- Farmer Dashboard (stats + recent bookings + quick actions)
- 3-step BookSlot (crop → region-sorted mandi with live price comparison → date/time/qty confirm)
- Queue Status page with 5-second polling and personal position + ETA
- My Bookings with cancel + completion details + DBT ref
- Notifications with mark-all-read
- Admin/Officer Console: 6 stat cards, bookings table with Start → Complete → Pay lifecycle
- All-India Mandi Directory with crop/state/search filters + live crowd level
- Multi-lingual EN/HI/PA everywhere, GoI tricolor strip + Ashoka emblem SVG

## Backlog (P0/P1/P2)
- **P1** Grievance/Support ticket flow
- **P1** Downloadable PDF receipt for procurement
- **P1** SMS handoff to real Twilio Verify
- **P2** Aadhaar eKYC integration
- **P2** Weather + market advisory widget on dashboard
- **P2** Bank verification (Penny drop) before DBT
- **P2** Analytics charts (Recharts) on admin console
