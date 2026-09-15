import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, MessageCircle, Scale, CreditCard, Award, HelpCircle } from "lucide-react";

const CAT_ICON = { weight: Scale, grade: Award, payment: CreditCard, other: HelpCircle };
const STATUS_STYLE = {
  open: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function Grievances() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "weight", subject: "", description: "", booking_id: "" });
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/grievances/my").then((r) => setItems(r.data));

  useEffect(() => {
    load();
    api.get("/bookings/my").then((r) => setBookings(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return toast.error("Please fill subject and description");
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.booking_id) delete payload.booking_id;
      const r = await api.post("/grievances", payload);
      toast.success(`Ticket ${r.data.ticket_no} raised. SLA ${r.data.sla_hours} hrs.`);
      setShowForm(false);
      setForm({ category: "weight", subject: "", description: "", booking_id: "" });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to raise ticket"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">{t("support")}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-emerald-700" />{t("grievance_desk")}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t("grievance_desc")}</p>
          </div>
          <Button data-testid="raise-ticket-btn" onClick={() => setShowForm(!showForm)} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="w-4 h-4 mr-1" />{t("raise_ticket")}
          </Button>
        </div>

        {showForm && (
          <Card className="bg-white border-emerald-200 mb-6 fade-up">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>{t("category")}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                    {[
                      { v: "weight", l: t("cat_weight"), Icon: Scale },
                      { v: "grade", l: t("cat_grade"), Icon: Award },
                      { v: "payment", l: t("cat_payment"), Icon: CreditCard },
                      { v: "other", l: t("cat_other"), Icon: HelpCircle },
                    ].map((c) => (
                      <button
                        type="button" key={c.v} data-testid={`cat-${c.v}`}
                        onClick={() => setForm({ ...form, category: c.v })}
                        className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${form.category === c.v ? "bg-emerald-600 border-emerald-700 text-white" : "bg-white border-emerald-100 text-slate-700 hover:border-emerald-300"}`}
                      >
                        <c.Icon className="w-4 h-4" />{c.l}
                      </button>
                    ))}
                  </div>
                </div>

                {bookings.length > 0 && (
                  <div>
                    <Label>{t("related_booking")} <span className="text-slate-400 text-xs">(optional)</span></Label>
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
                  <Label>{t("subject")}</Label>
                  <Input data-testid="grievance-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("subject_ph")} required />
                </div>
                <div>
                  <Label>{t("description")}</Label>
                  <Textarea data-testid="grievance-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder={t("desc_ph")} required />
                </div>

                <div className="flex gap-2">
                  <Button data-testid="grievance-submit" type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    {loading ? "…" : t("submit_ticket")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>{t("cancel")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {items.length === 0 && !showForm && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-12 text-center text-slate-500">
              <LifeBuoy className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              {t("no_grievances")}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {items.map((g) => {
            const Icon = CAT_ICON[g.category] || HelpCircle;
            const showSla = g.status === "open" || g.status === "in_review";
            return (
              <Card key={g.id} data-testid={`grievance-${g.id}`} className={`bg-white border ${g.sla_breached ? "border-rose-300" : "border-emerald-100"} lift`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{g.ticket_no}</span>
                        <Badge className={STATUS_STYLE[g.status]}>{t(`s_${g.status}`)}</Badge>
                        {g.sla_breached && <Badge className="bg-rose-100 text-rose-800"><AlertTriangle className="w-3 h-3 mr-1" />SLA Breach</Badge>}
                        {g.booking_ref && <span className="text-xs text-slate-500">· Token #{g.booking_ref.token_number} {g.booking_ref.mandi_name}</span>}
                      </div>
                      <div className="font-display font-semibold text-emerald-950 mt-1">{g.subject}</div>
                      <div className="text-sm text-slate-600 mt-1 leading-relaxed">{g.description}</div>
                      {g.resolution_note && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
                          <div className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                            {g.status === "resolved" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {t("officer_response")} · {g.responded_by}
                          </div>
                          <div className="text-slate-700">{g.resolution_note}</div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                        <span>Raised {new Date(g.created_at).toLocaleString()}</span>
                        {showSla && (
                          <span className={`flex items-center gap-1 ${g.sla_hours_left < 6 ? "text-rose-700 font-semibold" : "text-emerald-700"}`}>
                            <Clock className="w-3 h-3" />
                            SLA: {g.sla_hours_left > 0 ? `${g.sla_hours_left} hrs left` : `${Math.abs(g.sla_hours_left)} hrs over`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-2">
          <MessageCircle className="w-4 h-4 mt-0.5" />
          <div>Every grievance is guaranteed a response within <b>48 hours</b> per DoCA SLA. Escalate to <b>1800-11-FARM</b> if breached.</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
