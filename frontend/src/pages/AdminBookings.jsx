import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, PlayCircle, CreditCard, Package } from "lucide-react";

export default function AdminBookings() {
  const { t } = useLang();
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [completeDialog, setCompleteDialog] = useState(null);
  const [form, setForm] = useState({ actual_weight_quintal: 0, quality_grade: "A", price_per_quintal: 0 });

  const load = () => {
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    api.get("/admin/bookings", { params }).then((r) => setBookings(r.data));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const startBooking = async (id) => {
    try { await api.post(`/admin/bookings/${id}/start`); toast.success("Processing started"); load(); }
    catch { toast.error("Failed"); }
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
      setCompleteDialog(null); load();
    } catch { toast.error("Failed"); }
  };

  const payBooking = async (id) => {
    try { const r = await api.post(`/admin/bookings/${id}/pay`); toast.success(`DBT Paid - ${r.data.payment_ref}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Live Operations</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Package className="w-8 h-8 text-emerald-700" />Bookings Queue</h1>
      </div>

      <Card className="bg-white border-emerald-100">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-500">{bookings.length} bookings</div>
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
                  <tr key={b.id} data-testid={`admin-row-${b.id}`} className="border-b border-slate-100 hover:bg-slate-50">
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
    </div>
  );
}
