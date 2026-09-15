import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search } from "lucide-react";

export default function AdminMandis() {
  const [mandis, setMandis] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/admin/mandis").then((r) => setMandis(r.data)); }, []);

  const filtered = mandis.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.district.toLowerCase().includes(q.toLowerCase()) || m.state.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Network</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Building2 className="w-8 h-8 text-emerald-700" />Mandi Directory</h1>
        <p className="text-sm text-slate-600 mt-1">{mandis.length} procurement centers onboarded across India</p>
      </div>

      <Card className="mb-4 bg-white border-emerald-100">
        <CardContent className="p-4 relative">
          <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input data-testid="admin-mandi-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by mandi, district or state…" className="pl-9" />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <Card key={m.id} data-testid={`admin-mandi-${m.id}`} className="bg-white border-emerald-100 lift">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge className={m.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>{m.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <h3 className="font-display font-bold text-emerald-950 mt-3">{m.name}</h3>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{m.district}, {m.state}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">{m.code}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-slate-500">Capacity/day</div><div className="font-semibold text-emerald-950">{m.capacity_per_day}</div></div>
                <div><div className="text-slate-500">Crops Notified</div><div className="font-semibold text-emerald-950">{(m.crops || []).length}</div></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center text-slate-500 py-10">No mandis match.</div>}
    </div>
  );
}
