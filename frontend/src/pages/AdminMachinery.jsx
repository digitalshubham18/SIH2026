import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wrench, Plus, Scale, Droplets, Truck, Shield, Zap, Camera, Loader, HardDrive, Edit2, Trash2, AlertTriangle, CheckCircle2, Wrench as WrenchIcon } from "lucide-react";

const TYPE_META = {
  weighing_scale: { label: "Weighing Scale", Icon: Scale, color: "emerald" },
  moisture_meter: { label: "Moisture Meter", Icon: Droplets, color: "blue" },
  forklift: { label: "Forklift", Icon: Truck, color: "amber" },
  tarpaulin: { label: "Tarpaulin", Icon: Shield, color: "slate" },
  computer: { label: "Computer Terminal", Icon: HardDrive, color: "indigo" },
  generator: { label: "Generator", Icon: Zap, color: "yellow" },
  cctv: { label: "CCTV / Security", Icon: Camera, color: "rose" },
  loader: { label: "Belt Loader", Icon: Loader, color: "violet" },
};

const STATUS_STYLE = {
  operational: "bg-emerald-100 text-emerald-800",
  maintenance: "bg-amber-100 text-amber-800",
  broken: "bg-rose-100 text-rose-800",
};
const STATUS_ICON = { operational: CheckCircle2, maintenance: WrenchIcon, broken: AlertTriangle };

const EMPTY = { name: "", type: "weighing_scale", status: "operational", notes: "", last_serviced: "" };

export default function AdminMachinery() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [mandiId, setMandiId] = useState(user?.mandi_id || "");
  const [dialog, setDialog] = useState(null); // null | "new" | machinery obj
  const [form, setForm] = useState(EMPTY);

  const load = () => {
    const params = mandiId ? { mandi_id: mandiId } : {};
    api.get("/admin/machinery", { params }).then((r) => setItems(r.data));
  };

  useEffect(() => {
    if (user?.role === "admin") api.get("/admin/mandis").then((r) => setMandis(r.data));
  }, [user]);
  useEffect(load, [mandiId]);

  const openNew = () => { setForm(EMPTY); setDialog("new"); };
  const openEdit = (m) => { setForm({ name: m.name, type: m.type, status: m.status, notes: m.notes || "", last_serviced: m.last_serviced || "" }); setDialog(m); };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Please provide equipment name");
    try {
      const payload = { ...form, mandi_id: mandiId || user?.mandi_id };
      if (dialog === "new") { await api.post("/admin/machinery", payload); toast.success("Machinery added"); }
      else { await api.patch(`/admin/machinery/${dialog.id}`, payload); toast.success("Updated"); }
      setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this machinery record?")) return;
    await api.delete(`/admin/machinery/${id}`); toast.success("Removed"); load();
  };

  const counts = items.reduce((a, m) => { a[m.status] = (a[m.status] || 0) + 1; return a; }, {});

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Assets</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Wrench className="w-8 h-8 text-emerald-700" />Machinery & Equipment</h1>
          <p className="text-sm text-slate-600 mt-1">Track scales, forklifts, moisture meters and infrastructure health at your mandi.</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && mandis.length > 0 && (
            <select data-testid="mach-mandi" value={mandiId} onChange={(e) => setMandiId(e.target.value)} className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm">
              <option value="">All Mandis</option>
              {mandis.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <Button data-testid="mach-add" onClick={openNew} className="bg-emerald-700 hover:bg-emerald-800 text-white"><Plus className="w-4 h-4 mr-1" />Add Equipment</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: "Total Assets", v: items.length, c: "emerald", Icon: Wrench },
          { l: "Operational", v: counts.operational || 0, c: "emerald", Icon: CheckCircle2 },
          { l: "In Maintenance", v: counts.maintenance || 0, c: "amber", Icon: WrenchIcon },
          { l: "Broken / Down", v: counts.broken || 0, c: "rose", Icon: AlertTriangle },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <s.Icon className={`w-5 h-5 mb-2 ${s.c === "amber" ? "text-amber-600" : s.c === "rose" ? "text-rose-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.l}</div>
              <div className="stat-num text-2xl font-bold text-emerald-950 mt-1" data-testid={`mach-stat-${i}`}>{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card className="bg-white border-emerald-100"><CardContent className="p-12 text-center text-slate-500"><Wrench className="w-12 h-12 mx-auto text-emerald-200 mb-3" />No equipment logged. Add your first weighbridge, forklift or moisture meter.</CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => {
          const meta = TYPE_META[m.type] || TYPE_META.computer;
          const StatIcon = STATUS_ICON[m.status] || CheckCircle2;
          return (
            <Card key={m.id} data-testid={`mach-card-${m.id}`} className="bg-white border-emerald-100 lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl grid place-items-center bg-${meta.color}-100 text-${meta.color}-700`} style={{ background: "#ECFDF5", color: "#059669" }}>
                    <meta.Icon className="w-5 h-5" />
                  </div>
                  <Badge className={STATUS_STYLE[m.status]}><StatIcon className="w-3 h-3 mr-1" />{m.status}</Badge>
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">{meta.label}</div>
                <h3 className="font-display font-bold text-emerald-950">{m.name}</h3>
                {m.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{m.notes}</p>}
                {m.last_serviced && <div className="text-xs text-slate-400 mt-2">Last serviced: {m.last_serviced}</div>}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)} data-testid={`mach-edit-${m.id}`} className="border-emerald-200 text-emerald-700"><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(m.id)} data-testid={`mach-del-${m.id}`} className="border-rose-200 text-rose-700"><Trash2 className="w-3 h-3 mr-1" />Remove</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>{dialog === "new" ? "Add Equipment" : "Edit Equipment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input data-testid="mach-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weighbridge #2" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="mach-type" className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="mach-status" className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">In Maintenance</SelectItem>
                  <SelectItem value="broken">Broken / Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Last Serviced</Label><Input data-testid="mach-serviced" type="date" value={form.last_serviced} onChange={(e) => setForm({ ...form, last_serviced: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea data-testid="mach-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Capacity, calibration date, vendor…" /></div>
            <Button data-testid="mach-save" onClick={submit} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
