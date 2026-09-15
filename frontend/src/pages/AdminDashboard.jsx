import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Building2, Package, CheckCircle2, Wallet, PlayCircle, CreditCard, ShieldCheck } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useLang();
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [completeDialog, setCompleteDialog] = useState(null);
  const [form, setForm] = useState({ actual_weight_quintal: 0, quality_grade: "A", price_per_quintal: 0 });

  const loadStats = () => api.get("/admin/stats").then((r) => setStats(r.data));
  const loadBookings = () => {
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    api.get("/admin/bookings", { params }).then((r) => setBookings(r.data));
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadBookings(); }, [statusFilter]);

  const startBooking = async (id) => {
    try { await api.post(`/admin/bookings/${id}/start`); toast.success("Processing started"); loadBookings(); loadStats(); }
    catch (e) { toast.error("Failed"); }
  };

  const openComplete = (b) => {
    setForm({ actual_weight_quintal: b.quantity_quintal, quality_grade: "A", price_per_quintal: 2300 });
    setCompleteDialog(b);
  };

  const completeBooking = async () => {
    try {
      await api.post(`/admin/bookings/${completeDialog.id}/complete`, {
        actual_weight_quintal: parseFloat(form.actual_weight_quintal),
        quality_grade: form.quality_grade,
        price_per_quintal: parseFloat(form.price_per_quintal),
      });
      toast.success("Procurement completed");
      setCompleteDialog(null);
      loadBookings(); loadStats();
    } catch (e) { toast.error("Failed"); }
  };

  const payBooking = async (id) => {
    try { const r = await api.post(`/admin/bookings/${id}/pay`); toast.success(`DBT Paid - ${r.data.payment_ref}`); loadBookings(); loadStats(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const cards = [
    { icon: Users, label: t("total_farmers"), val: stats.total_farmers || 0, color: "emerald" },
    { icon: Building2, label: "Mandis Onboarded", val: stats.total_mandis || 0, color: "blue" },
    { icon: Package, label: t("active_queue"), val: stats.active_queue || 0, color: "amber" },
    { icon: CheckCircle2, label: t("completed_procurements"), val: stats.completed_procurements || 0, color: "emerald" },
    { icon: Wallet, label: t("total_disbursed"), val: `₹${(stats.total_paid_amount || 0).toLocaleString("en-IN")}`, color: "emerald" },
    { icon: Package, label: "Quintals Procured", val: `${(stats.total_procured_quintal || 0).toLocaleString("en-IN")} qtl`, color: "blue" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Officer / Admin Console</div>
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

        <Card className="bg-white border-emerald-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-semibold text-emerald-950">Bookings Queue</h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="admin-filter" className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="in_process">In Process</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-slate-500 border-b border-emerald-100">
                    <th className="py-3 pr-2">Token</th>
                    <th className="py-3 pr-2">Farmer</th>
                    <th className="py-3 pr-2">Mandi</th>
                    <th className="py-3 pr-2">Crop / Qty</th>
                    <th className="py-3 pr-2">Slot</th>
                    <th className="py-3 pr-2">Status</th>
                    <th className="py-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} data-testid={`admin-row-${b.id}`} className="border-b border-slate-100">
                      <td className="py-3 pr-2 font-display font-bold text-emerald-700">#{b.token_number}</td>
                      <td className="py-3 pr-2">
                        <div className="font-semibold text-emerald-950">{b.farmer_name}</div>
                        <div className="text-xs text-slate-500">{b.farmer_phone}</div>
                      </td>
                      <td className="py-3 pr-2">{b.mandi_name}</td>
                      <td className="py-3 pr-2">{b.crop_name}<br/><span className="text-xs text-slate-500">{b.quantity_quintal} qtl</span></td>
                      <td className="py-3 pr-2 text-xs">{b.slot_date}<br/>{b.slot_time}</td>
                      <td className="py-3 pr-2"><Badge className="bg-emerald-100 text-emerald-800">{b.status}</Badge></td>
                      <td className="py-3 pr-2 text-right">
                        {b.status === "booked" && <Button data-testid={`start-${b.id}`} size="sm" onClick={() => startBooking(b.id)} className="bg-orange-600 hover:bg-orange-700 text-white"><PlayCircle className="w-3 h-3 mr-1" />{t("mark_start")}</Button>}
                        {b.status === "in_process" && <Button data-testid={`complete-${b.id}`} size="sm" onClick={() => openComplete(b)} className="bg-emerald-700 hover:bg-emerald-800 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />{t("mark_complete")}</Button>}
                        {b.status === "completed" && <Button data-testid={`pay-${b.id}`} size="sm" onClick={() => payBooking(b.id)} className="bg-amber-600 hover:bg-amber-700 text-white"><CreditCard className="w-3 h-3 mr-1" />{t("initiate_payment")}</Button>}
                        {b.status === "paid" && <span className="text-xs text-emerald-600 font-mono">{b.payment_ref}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && <div className="py-10 text-center text-slate-500">No bookings.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!completeDialog} onOpenChange={(o) => !o && setCompleteDialog(null)}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Complete Procurement · Token #{completeDialog?.token_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("weight_recorded")}</Label><Input data-testid="complete-weight" type="number" step="0.1" value={form.actual_weight_quintal} onChange={(e) => setForm({ ...form, actual_weight_quintal: e.target.value })} /></div>
            <div>
              <Label>{t("quality_grade")}</Label>
              <Select value={form.quality_grade} onValueChange={(v) => setForm({ ...form, quality_grade: v })}>
                <SelectTrigger data-testid="complete-grade" className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="A">{t("grade_a")}</SelectItem>
                  <SelectItem value="B">{t("grade_b")}</SelectItem>
                  <SelectItem value="C">{t("grade_c")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("price_per_qtl")}</Label><Input data-testid="complete-price" type="number" value={form.price_per_quintal} onChange={(e) => setForm({ ...form, price_per_quintal: e.target.value })} /></div>
            <div className="text-sm text-slate-600">Total: <span className="font-bold text-emerald-700">₹{(form.actual_weight_quintal * form.price_per_quintal).toLocaleString("en-IN")}</span></div>
            <Button data-testid="complete-submit" onClick={completeBooking} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">Complete Procurement</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
