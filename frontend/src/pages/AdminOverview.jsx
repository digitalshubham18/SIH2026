import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Package, CheckCircle2, Wallet, TrendingUp, MapPin, Wheat } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";

const STATE_COLORS = ["#059669", "#0284c7", "#d97706", "#7c3aed", "#e11d48", "#0891b2", "#65a30d"];

export default function AdminOverview() {
  const { t } = useLang();
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ state_wise: [], crop_wise: [], daily_arrivals: [] });

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/analytics").then((r) => setAnalytics(r.data));
  }, []);

  const cards = [
    { icon: Users, label: t("total_farmers"), val: stats.total_farmers || 0, color: "emerald" },
    { icon: Building2, label: "Mandis Onboarded", val: stats.total_mandis || 0, color: "blue" },
    { icon: Package, label: t("active_queue"), val: stats.active_queue || 0, color: "amber" },
    { icon: CheckCircle2, label: t("completed_procurements"), val: stats.completed_procurements || 0, color: "emerald" },
    { icon: Wallet, label: t("total_disbursed"), val: `₹${(stats.total_paid_amount || 0).toLocaleString("en-IN")}`, color: "emerald" },
    { icon: Package, label: "Quintals Procured", val: `${(stats.total_procured_quintal || 0).toLocaleString("en-IN")} qtl`, color: "blue" },
  ];

  const maxStateQ = Math.max(1, ...analytics.state_wise.map((s) => s.quintal));

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Overview</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1">Procurement Command Center</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map((c, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <c.icon className={`w-5 h-5 mb-2 ${c.color === "amber" ? "text-amber-600" : c.color === "blue" ? "text-blue-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{c.label}</div>
              <div className="stat-num text-lg font-bold text-emerald-950 mt-1" data-testid={`admin-stat-${i}`}>{c.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2 bg-white border-emerald-100" data-testid="chart-daily">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">7-Day Trend</div>
            <h3 className="font-display text-lg font-semibold text-emerald-950 flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-emerald-700" />Daily Arrivals & Procurement</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={analytics.daily_arrivals} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #a7f3d0", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#059669" strokeWidth={2.5} fill="url(#gBookings)" />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#d97706" strokeWidth={2.5} fill="url(#gCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-100" data-testid="chart-crop">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Crop Mix</div>
            <h3 className="font-display text-lg font-semibold text-emerald-950 flex items-center gap-2 mb-3"><Wheat className="w-5 h-5 text-amber-600" />Procurement by Crop</h3>
            {analytics.crop_wise.length === 0 ? (
              <div className="h-48 grid place-items-center text-sm text-slate-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analytics.crop_wise} dataKey="quintal" nameKey="crop" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {analytics.crop_wise.map((_, i) => <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #a7f3d0", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 space-y-1 max-h-24 overflow-auto">
              {analytics.crop_wise.slice(0, 5).map((c, i) => (
                <div key={c.crop} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />{c.crop}</span>
                  <span className="font-semibold text-slate-700">{Math.round(c.quintal)} qtl</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-emerald-100" data-testid="chart-state">
        <CardContent className="p-6">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Bharat Map</div>
          <h3 className="font-display text-lg font-semibold text-emerald-950 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-emerald-700" />State-wise Procurement Heatmap</h3>
          {analytics.state_wise.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">No procurement completed yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {analytics.state_wise.map((s, i) => {
                  const pct = (s.quintal / maxStateQ) * 100;
                  return (
                    <div key={s.state} data-testid={`heat-${s.state}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-emerald-950 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATE_COLORS[i % STATE_COLORS.length] }} />
                          {s.state}
                        </span>
                        <span className="text-slate-600">{Math.round(s.quintal).toLocaleString("en-IN")} qtl · ₹{Math.round(s.amount / 100000)}L</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${STATE_COLORS[i % STATE_COLORS.length]}, ${STATE_COLORS[i % STATE_COLORS.length]}dd)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.state_wise} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="state" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #a7f3d0", borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${Math.round(v)} qtl`, "Procured"]} />
                  <Bar dataKey="quintal" radius={[0, 8, 8, 0]}>
                    {analytics.state_wise.map((_, i) => <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
