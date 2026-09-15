import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, Building2, Search, ArrowRight } from "lucide-react";

export default function Mandis() {
  const { t, lang } = useLang();
  const [mandis, setMandis] = useState([]);
  const [crops, setCrops] = useState([]);
  const [prices, setPrices] = useState({});
  const [q, setQ] = useState("");
  const [crop, setCrop] = useState("all");
  const [state, setState] = useState("all");

  useEffect(() => {
    api.get("/mandis").then((r) => setMandis(r.data));
    api.get("/crops").then((r) => setCrops(r.data));
  }, []);

  useEffect(() => {
    if (crop === "all") { setPrices({}); return; }
    api.get("/mandi-prices", { params: { crop_id: crop } }).then((r) => {
      const m = {};
      r.data.forEach((p) => { m[p.mandi_id] = p; });
      setPrices(m);
    });
  }, [crop]);

  const states = [...new Set(mandis.map((m) => m.state))];
  const filtered = mandis.filter((m) =>
    (state === "all" || m.state === state) &&
    (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.district.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Directory</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1">{t("all_mandis")} · {t("prices")}</h1>
        </div>

        <Card className="mb-6 bg-white border-emerald-100">
          <CardContent className="p-4 grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input data-testid="mandi-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="pl-9" />
            </div>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger data-testid="mandi-filter-crop" className="bg-white"><SelectValue placeholder={t("filter_by_crop")} /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">{t("filter_by_crop")}</SelectItem>
                {crops.map((c) => <SelectItem key={c.id} value={c.id}>{lang === "hi" ? c.name_hi : lang === "pa" ? c.name_pa : c.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger data-testid="mandi-filter-state" className="bg-white"><SelectValue placeholder={t("filter_by_state")} /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">{t("filter_by_state")}</SelectItem>
                {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const p = prices[m.id];
            return (
              <Card key={m.id} data-testid={`mandi-card-${m.id}`} className="bg-white border-emerald-100 lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <Badge className={m.crowd_level === "high" ? "bg-rose-100 text-rose-800" : m.crowd_level === "medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                      {t(`crowd_${m.crowd_level}`)}
                    </Badge>
                  </div>
                  <h3 className="font-display font-bold text-emerald-950 mt-3">{m.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{m.district}, {m.state}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><div className="text-slate-500">Capacity</div><div className="font-semibold text-slate-800">{m.capacity_per_day}/day</div></div>
                    <div><div className="text-slate-500">Today&apos;s Load</div><div className="font-semibold text-slate-800">{m.current_load}</div></div>
                  </div>
                  {p && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3" />{t("live_price")}</span>
                        <span className="text-xs text-slate-500">MSP ₹{p.msp}</span>
                      </div>
                      <div className="stat-num text-2xl font-bold text-emerald-800 mt-1">₹{p.price.toLocaleString("en-IN")}<span className="text-xs text-slate-500">/qtl</span></div>
                    </div>
                  )}
                  <Link to={`/queue/${m.id}`}>
                    <Button variant="outline" size="sm" data-testid={`mandi-queue-${m.id}`} className="mt-4 w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                      {t("view_queue")} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">No mandis match your filters.</div>
        )}
      </div>
      <Footer />
    </div>
  );
}
