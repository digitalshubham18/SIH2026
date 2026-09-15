import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wheat, Users, Package, PlayCircle, CheckCircle2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#059669", "#d97706", "#0284c7", "#7c3aed", "#e11d48", "#0891b2", "#65a30d", "#db2777"];

export default function AdminTodayCrops() {
  const { user } = useAuth();
  const [data, setData] = useState({ crops: [], bookings: [], total_expected_quintal: 0, total_farmers: 0 });
  const [mandis, setMandis] = useState([]);
  const [mandiId, setMandiId] = useState(user?.mandi_id || "");

  useEffect(() => {
    if (user?.role === "admin") api.get("/admin/mandis").then((r) => setMandis(r.data));
  }, [user]);

  useEffect(() => {
    const params = mandiId ? { mandi_id: mandiId } : {};
    api.get("/admin/today-crops", { params }).then((r) => setData(r.data));
  }, [mandiId]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Today · {today}</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Wheat className="w-8 h-8 text-amber-600" />Today's Crop Intake</h1>
          <p className="text-sm text-slate-600 mt-1">Plan machinery, workers and grade-wise slots based on what is arriving today.</p>
        </div>
        {user?.role === "admin" && mandis.length > 0 && (
          <select data-testid="today-mandi" value={mandiId} onChange={(e) => setMandiId(e.target.value)} className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm">
            <option value="">All Mandis</option>
            {mandis.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { l: "Expected Quintal", v: `${data.total_expected_quintal.toFixed(1)} qtl`, Icon: Package, c: "emerald" },
          { l: "Farmers Coming", v: data.total_farmers, Icon: Users, c: "blue" },
          { l: "In Processing", v: data.bookings.filter((b) => b.status === "in_process").length, Icon: PlayCircle, c: "amber" },
          { l: "Completed Today", v: data.bookings.filter((b) => ["completed", "paid"].includes(b.status)).length, Icon: CheckCircle2, c: "emerald" },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <s.Icon className={`w-5 h-5 mb-2 ${s.c === "amber" ? "text-amber-600" : s.c === "blue" ? "text-blue-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.l}</div>
              <div className="stat-num text-xl font-bold text-emerald-950 mt-1" data-testid={`today-stat-${i}`}>{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-emerald-100 mb-6">
        <CardContent className="p-6">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Crop Breakdown</div>
          <h3 className="font-display text-lg font-semibold text-emerald-950 mb-4">Which crops to prepare for today</h3>
          {data.crops.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No arrivals scheduled today.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {data.crops.map((c, i) => (
                  <div key={c.crop} data-testid={`crop-row-${c.crop}`} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-100">
                    <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: `${COLORS[i % COLORS.length]}22`, color: COLORS[i % COLORS.length] }}>
                      <Wheat className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-emerald-950">{c.crop}</div>
                      <div className="text-xs text-slate-500">{c.farmers} farmer(s) · {c.in_process} in process · {c.completed} done</div>
                    </div>
                    <div className="text-right">
                      <div className="stat-num font-bold text-emerald-800">{c.quintal_expected.toFixed(1)}</div>
                      <div className="text-[10px] uppercase text-slate-400 tracking-widest">qtl</div>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.crops} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="crop" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #a7f3d0", borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v.toFixed(1)} qtl`, "Expected"]} />
                  <Bar dataKey="quintal_expected" radius={[8, 8, 0, 0]}>
                    {data.crops.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {data.bookings.length > 0 && (
        <Card className="bg-white border-emerald-100">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Slot Schedule</div>
            <h3 className="font-display text-lg font-semibold text-emerald-950 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-700" />Today's slots</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-slate-500 border-b border-emerald-100">
                    <th className="py-2 pr-2">Token</th>
                    <th className="py-2 pr-2">Time</th>
                    <th className="py-2 pr-2">Farmer</th>
                    <th className="py-2 pr-2">Crop</th>
                    <th className="py-2 pr-2">Qty</th>
                    <th className="py-2 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.sort((a, b) => a.slot_time.localeCompare(b.slot_time)).map((b) => (
                    <tr key={b.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2 font-display font-bold text-emerald-700">#{b.token_number}</td>
                      <td className="py-2 pr-2">{b.slot_time}</td>
                      <td className="py-2 pr-2">{b.farmer_name}</td>
                      <td className="py-2 pr-2">{b.crop_name}</td>
                      <td className="py-2 pr-2">{b.quantity_quintal} qtl</td>
                      <td className="py-2 pr-2"><Badge className="bg-emerald-100 text-emerald-800">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
