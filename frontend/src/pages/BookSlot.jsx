import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tractor, TrendingUp, MapPin, Calendar, CheckCircle2, ArrowLeft } from "lucide-react";

const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function BookSlot() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [crops, setCrops] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedMandi, setSelectedMandi] = useState(null);
  const [priceMap, setPriceMap] = useState({});
  const [slotDate, setSlotDate] = useState(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const [slotTime, setSlotTime] = useState("10:00");
  const [qty, setQty] = useState(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/crops").then((r) => setCrops(r.data));
  }, []);

  useEffect(() => {
    if (!selectedCrop) return;
    api.get("/mandis", { params: { crop_id: selectedCrop.id } }).then((r) => setMandis(r.data));
    api.get("/mandi-prices", { params: { crop_id: selectedCrop.id } }).then((r) => {
      const m = {};
      r.data.forEach((p) => { m[p.mandi_id] = p; });
      setPriceMap(m);
    });
  }, [selectedCrop]);

  const cropName = (c) => lang === "hi" ? c.name_hi : lang === "pa" ? c.name_pa : c.name_en;

  const inMyRegion = (m) => user?.state && m.state === user.state;
  const sortedMandis = [...mandis].sort((a, b) => {
    const pa = priceMap[a.id]?.price || 0;
    const pb = priceMap[b.id]?.price || 0;
    // My region first, then higher price
    if (inMyRegion(a) !== inMyRegion(b)) return inMyRegion(a) ? -1 : 1;
    return pb - pa;
  });

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/bookings", {
        mandi_id: selectedMandi.id,
        crop_id: selectedCrop.id,
        slot_date: slotDate,
        slot_time: slotTime,
        quantity_quintal: parseFloat(qty),
      });
      toast.success(`Booked! Your Token: #${data.token_number}`);
      nav("/bookings");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Booking failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mb-2">{t("book_slot")}</h1>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-emerald-600" : "bg-slate-200"}`} />
          ))}
        </div>

        {/* Step 1 - Crop */}
        {step === 1 && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold text-emerald-950 mb-4">1. {t("crop")} — Choose the crop you want to sell</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {crops.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`crop-${c.id}`}
                    onClick={() => { setSelectedCrop(c); setStep(2); }}
                    className={`p-5 rounded-2xl border text-left lift ${selectedCrop?.id === c.id ? "bg-emerald-600 border-emerald-700 text-white" : "bg-white border-emerald-100 hover:border-emerald-300"}`}
                  >
                    <Tractor className={`w-6 h-6 mb-2 ${selectedCrop?.id === c.id ? "text-white" : "text-emerald-700"}`} />
                    <div className="font-display font-bold">{cropName(c)}</div>
                    <div className={`text-xs mt-1 ${selectedCrop?.id === c.id ? "text-emerald-100" : "text-slate-500"}`}>
                      MSP ₹{c.msp}/qtl · {c.season}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 - Mandi with price comparison */}
        {step === 2 && selectedCrop && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-emerald-950">2. Compare Mandis for {cropName(selectedCrop)}</h2>
                  <p className="text-sm text-slate-600">Mandis in your region ({user?.state}) shown first, then all-India by best price.</p>
                </div>
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Change Crop</Button>
              </div>

              <div className="grid gap-3">
                {sortedMandis.map((m) => {
                  const p = priceMap[m.id];
                  const priceAbove = p && p.price >= selectedCrop.msp;
                  return (
                    <div
                      key={m.id}
                      data-testid={`mandi-${m.id}`}
                      onClick={() => { setSelectedMandi(m); setStep(3); }}
                      className={`p-4 rounded-2xl border cursor-pointer flex items-center gap-4 lift ${selectedMandi?.id === m.id ? "border-emerald-600 bg-emerald-50" : "border-emerald-100 bg-white"}`}
                    >
                      <div className={`w-12 h-12 rounded-xl grid place-items-center ${inMyRegion(m) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-emerald-950 flex items-center gap-2">
                          {m.name}
                          {inMyRegion(m) && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Your Region</Badge>}
                        </div>
                        <div className="text-xs text-slate-500">{m.district}, {m.state} · Capacity {m.capacity_per_day}/day</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{t("live_price")}</div>
                        <div className={`stat-num text-lg font-bold ${priceAbove ? "text-emerald-700" : "text-slate-700"}`}>
                          ₹{p?.price?.toLocaleString("en-IN") || "-"}<span className="text-xs text-slate-400">/qtl</span>
                        </div>
                        {p && <div className="text-[11px] text-slate-500">{t("arrival")} {p.arrival_quintal} qtl</div>}
                      </div>
                      <Badge className={m.crowd_level === "high" ? "bg-rose-100 text-rose-800" : m.crowd_level === "medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                        {t(`crowd_${m.crowd_level}`)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 - Slot & Confirm */}
        {step === 3 && selectedCrop && selectedMandi && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-xl font-semibold text-emerald-950">3. Choose Slot & Confirm</h2>
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Change Mandi</Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-xs uppercase tracking-widest text-emerald-700">Summary</div>
                    <div className="font-semibold text-emerald-950 mt-1">{cropName(selectedCrop)} @ {selectedMandi.name}</div>
                    <div className="text-sm text-slate-600 mt-1">{selectedMandi.district}, {selectedMandi.state}</div>
                    <div className="text-sm mt-2">Expected price: <span className="font-bold text-emerald-700">₹{priceMap[selectedMandi.id]?.price || selectedCrop.msp}/qtl</span></div>
                  </div>
                  <div>
                    <Label>{t("quantity")}</Label>
                    <Input data-testid="book-qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={1} step="0.5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>{t("slot_date")}</Label>
                    <Input data-testid="book-date" type="date" value={slotDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setSlotDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("slot_time")}</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {TIMES.map((tm) => (
                        <button key={tm} data-testid={`time-${tm}`} onClick={() => setSlotTime(tm)} className={`py-2 rounded-lg text-sm font-medium border ${slotTime === tm ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-slate-700 border-emerald-100 hover:border-emerald-300"}`}>{tm}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                <div className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 mt-0.5 text-amber-700" />
                Estimated earning: <span className="font-bold ml-1">₹{((priceMap[selectedMandi.id]?.price || selectedCrop.msp) * qty).toLocaleString("en-IN")}</span> · Payment via DBT within 48-72 hrs</div>
              </div>

              <Button data-testid="book-confirm" onClick={submit} disabled={loading} className="w-full mt-6 bg-emerald-700 hover:bg-emerald-800 text-white h-12 text-base">
                <Calendar className="w-5 h-5 mr-2" /> Confirm Booking & Generate Token
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
