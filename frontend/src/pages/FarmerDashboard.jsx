import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Bell, Wallet, ArrowRight, Tractor, MapPin, LifeBuoy } from "lucide-react";

const statusColor = {
  booked: "bg-blue-100 text-blue-800",
  queued: "bg-amber-100 text-amber-800",
  in_process: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-600 text-white",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get("/bookings/my").then((r) => setBookings(r.data));
    api.get("/notifications").then((r) => setNotifications(r.data));
  }, []);

  const active = bookings.filter((b) => ["booked", "queued", "in_process"].includes(b.status));
  const paid = bookings.filter((b) => b.status === "paid");
  const totalEarned = paid.reduce((s, b) => s + (b.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 fade-up">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">{t("welcome_back")}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1" data-testid="dash-greeting">
              {user?.name} <span className="text-2xl">🌾</span>
            </h1>
            {user?.village && <div className="text-slate-600 text-sm mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" />{user.village}, {user.district}, {user.state}</div>}
          </div>
          <Link to="/book"><Button data-testid="dash-book-btn" size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white"><Tractor className="w-4 h-4 mr-2" />{t("book_slot")}</Button></Link>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: "Active Bookings", val: active.length, color: "emerald" },
            { icon: TrendingUp, label: "Total Bookings", val: bookings.length, color: "blue" },
            { icon: Wallet, label: `Total Earned (DBT)`, val: `₹${totalEarned.toLocaleString("en-IN")}`, color: "amber" },
            { icon: Bell, label: "New Notifications", val: notifications.filter((n) => !n.read).length, color: "rose" },
          ].map((s, i) => (
            <Card key={i} className="lift bg-white border-emerald-100">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${s.color === "amber" ? "bg-amber-100 text-amber-700" : s.color === "blue" ? "bg-blue-100 text-blue-700" : s.color === "rose" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-500">{s.label}</div>
                <div className="stat-num text-2xl font-bold text-emerald-950 mt-1" data-testid={`stat-${i}`}>{s.val}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white border-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-emerald-950">{t("recent_bookings")}</h2>
                <Link to="/bookings" className="text-sm text-emerald-700 hover:underline flex items-center">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Tractor className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
                  <div>No bookings yet. Book your first slot!</div>
                  <Link to="/book"><Button className="mt-4 bg-emerald-700 hover:bg-emerald-800">{t("book_slot")}</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b.id} data-testid={`booking-${b.id}`} className="flex items-center gap-4 p-4 rounded-xl border border-emerald-100 hover:bg-emerald-50/50 transition">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white grid place-items-center font-display text-lg font-bold">
                        #{b.token_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-emerald-950 truncate">{b.mandi_name}</div>
                        <div className="text-xs text-slate-500">{b.crop_name} · {b.quantity_quintal} qtl · {b.slot_date} {b.slot_time}</div>
                        {b.total_amount && <div className="text-xs text-emerald-700 font-semibold mt-0.5">₹{b.total_amount.toLocaleString("en-IN")}</div>}
                      </div>
                      <Badge className={statusColor[b.status] || "bg-slate-100"}>{t(b.status)}</Badge>
                      <Link to={`/queue/${b.mandi_id}`}><Button variant="ghost" size="sm" className="text-emerald-700">{t("view_queue")}</Button></Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-emerald-100">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold text-emerald-950 mb-4">{t("quick_actions")}</h2>
              <div className="space-y-2">
                <Link to="/book"><Button variant="outline" className="w-full justify-start border-emerald-200 hover:bg-emerald-50" data-testid="qa-book"><Calendar className="w-4 h-4 mr-2 text-emerald-700" />{t("book_slot")}</Button></Link>
                <Link to="/mandis"><Button variant="outline" className="w-full justify-start border-emerald-200 hover:bg-emerald-50" data-testid="qa-prices"><TrendingUp className="w-4 h-4 mr-2 text-emerald-700" />{t("view_prices")}</Button></Link>
                <Link to="/bookings"><Button variant="outline" className="w-full justify-start border-emerald-200 hover:bg-emerald-50" data-testid="qa-bookings"><Wallet className="w-4 h-4 mr-2 text-emerald-700" />{t("my_bookings")}</Button></Link>
                <Link to="/notifications"><Button variant="outline" className="w-full justify-start border-emerald-200 hover:bg-emerald-50" data-testid="qa-notif"><Bell className="w-4 h-4 mr-2 text-emerald-700" />{t("notifications")}</Button></Link>
                <Link to="/grievances"><Button variant="outline" className="w-full justify-start border-emerald-200 hover:bg-emerald-50" data-testid="qa-grievance"><LifeBuoy className="w-4 h-4 mr-2 text-emerald-700" />{t("grievance_desk")}</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
