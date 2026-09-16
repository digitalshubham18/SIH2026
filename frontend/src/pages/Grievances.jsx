import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Plus, AlertTriangle, Clock } from "lucide-react";

export default function Grievances() {
  const { user } = useAuth();
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mandi_id: "", subject: "", description: "", booking_id: "" });
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/grievances/my").then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/mandis").then((r) => setMandis(r.data));
    api.get("/bookings/my").then((r) => setBookings(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.mandi_id || !form.subject.trim() || !form.description.trim()) return toast.error("Mandi, Subject and Description are required");
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.booking_id) delete payload.booking_id;
      const r = await api.post("/grievances", payload);
      toast.success(`Ticket ${r.data.ticket_no} raised.`);
      setShowForm(false);
      setForm({ mandi_id: "", subject: "", description: "", booking_id: "" });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Support</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-emerald-700" />Grievance Desk
            </h1>
            <p className="text-sm text-slate-600 mt-1">Raise a ticket about any mandi issue. Answered within 48 hours per DoCA SLA.</p>
          </div>
          <Button data-testid="raise-ticket-btn" onClick={() => setShowForm(!showForm)} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="w-4 h-4 mr-1" />Raise New Ticket
          </Button>
        </div>

        {showForm && (
          <Card className="bg-white border-emerald-200 mb-6 fade-up">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Mandi</Label>
                  <Select value={form.mandi_id} onValueChange={(v) => setForm({ ...form, mandi_id: v })}>
                    <SelectTrigger data-testid="grievance-mandi" className="bg-white"><SelectValue placeholder="Select the mandi" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-72">
                      {mandis.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.district}, {m.state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {bookings.length > 0 && (
                  <div>
                    <Label>Related Booking <span className="text-slate-400 text-xs">(optional)</span></Label>
                    <Select value={form.booking_id || "none"} onValueChange={(v) => setForm({ ...form, booking_id: v === "none" ? "" : v })}>
                      <SelectTrigger data-testid="grievance-booking" className="bg-white"><SelectValue placeholder="Select booking (optional)" /></SelectTrigger>
                      <SelectContent className="bg-white max-h-64">
                        <SelectItem value="none">— None —</SelectItem>
                        {bookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>#{b.token_number} · {b.crop_name} @ {b.mandi_name} ({b.slot_date})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Subject</Label>
                  <Input data-testid="grievance-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief title" required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea data-testid="grievance-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Explain in detail" required />
                </div>

                <div className="flex gap-2">
                  <Button data-testid="grievance-submit" type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    {loading ? "…" : "Submit Ticket"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {items.length === 0 && !showForm && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-12 text-center text-slate-500">
              <LifeBuoy className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              You have not raised any grievance yet.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {items.map((g) => (
            <Card key={g.id} data-testid={`grievance-${g.id}`} className={`bg-white border ${g.sla_breached ? "border-rose-300" : "border-emerald-100"} lift`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><LifeBuoy className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{g.ticket_no}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{g.status.replace("_"," ")}</span>
                      {g.sla_breached && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />SLA Breach</span>}
                      <span className="text-xs text-slate-500">· {g.mandi_name}</span>
                    </div>
                    <div className="font-display font-semibold text-emerald-950 mt-1">{g.subject}</div>
                    <div className="text-sm text-slate-600 mt-1 leading-relaxed">{g.description}</div>
                    {g.resolution_note && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
                        <div className="text-xs font-semibold text-emerald-800 mb-1">Response by {g.responded_by}</div>
                        <div className="text-slate-700">{g.resolution_note}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                      <span>Raised {new Date(g.created_at).toLocaleString()}</span>
                      {(g.status === "open" || g.status === "in_review") && (
                        <span className={`flex items-center gap-1 ${g.sla_hours_left < 6 ? "text-rose-700 font-semibold" : "text-emerald-700"}`}>
                          <Clock className="w-3 h-3" />SLA: {g.sla_hours_left > 0 ? `${g.sla_hours_left} hrs left` : `${Math.abs(g.sla_hours_left)} hrs over`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
