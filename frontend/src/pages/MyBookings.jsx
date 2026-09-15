import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tractor, XCircle, ExternalLink, CheckCircle2, Clock } from "lucide-react";

const statusColor = {
  booked: "bg-blue-100 text-blue-800",
  queued: "bg-amber-100 text-amber-800",
  in_process: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-600 text-white",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function MyBookings() {
  const { t } = useLang();
  const [bookings, setBookings] = useState([]);

  const load = () => api.get("/bookings/my").then((r) => setBookings(r.data));

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success("Booking cancelled");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Records</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1">{t("my_bookings")}</h1>
          </div>
          <Link to="/book"><Button className="bg-emerald-700 hover:bg-emerald-800 text-white"><Tractor className="w-4 h-4 mr-2" />{t("book_slot")}</Button></Link>
        </div>

        {bookings.length === 0 && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-12 text-center text-slate-500">
              <Tractor className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              No bookings yet.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b.id} data-testid={`mybooking-${b.id}`} className="bg-white border-emerald-100 lift">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white grid place-items-center font-display text-xl font-bold">
                    #{b.token_number}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-display font-bold text-emerald-950">{b.mandi_name}</div>
                    <div className="text-sm text-slate-600">{b.crop_name} · {b.quantity_quintal} qtl · {b.slot_date} {b.slot_time}</div>
                  </div>
                  <Badge className={statusColor[b.status] || "bg-slate-100"}>{t(b.status)}</Badge>
                  {b.status === "paid" && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{t("total_amount")}</div>
                      <div className="stat-num text-lg font-bold text-emerald-700">₹{b.total_amount?.toLocaleString("en-IN")}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link to={`/queue/${b.mandi_id}`}><Button variant="outline" size="sm" className="border-emerald-200"><ExternalLink className="w-4 h-4 mr-1" />Queue</Button></Link>
                    {["booked", "queued"].includes(b.status) && (
                      <Button variant="outline" size="sm" onClick={() => cancel(b.id)} data-testid={`cancel-${b.id}`} className="border-rose-200 text-rose-700"><XCircle className="w-4 h-4 mr-1" />Cancel</Button>
                    )}
                  </div>
                </div>

                {(b.status === "completed" || b.status === "paid") && (
                  <div className="mt-4 grid md:grid-cols-4 gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-sm">
                    <div><div className="text-xs text-slate-500">{t("weight_recorded")}</div><div className="font-semibold">{b.actual_weight_quintal} qtl</div></div>
                    <div><div className="text-xs text-slate-500">{t("quality_grade")}</div><div className="font-semibold">Grade {b.quality_grade}</div></div>
                    <div><div className="text-xs text-slate-500">{t("price_per_qtl")}</div><div className="font-semibold">₹{b.price_per_quintal}</div></div>
                    <div>
                      <div className="text-xs text-slate-500">{t("payment_status")}</div>
                      <div className="font-semibold flex items-center gap-1">
                        {b.payment_status === "paid" ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" />{t("paid")}</> : <><Clock className="w-4 h-4 text-amber-600" />{t("pending")}</>}
                      </div>
                      {b.payment_ref && <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {b.payment_ref}</div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
