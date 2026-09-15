import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, ArrowLeft } from "lucide-react";

export default function QueueStatus() {
  const { mandiId } = useParams();
  const { t } = useLang();
  const { user } = useAuth();
  const [mandi, setMandi] = useState(null);
  const [queue, setQueue] = useState({ pending: [], total: 0, in_process: null, completed_count: 0, avg_processing_minutes: 12 });

  const load = () => {
    api.get(`/queue/${mandiId}`).then((r) => setQueue(r.data));
  };

  useEffect(() => {
    api.get(`/mandis/${mandiId}`).then((r) => setMandi(r.data));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [mandiId]);

  const myBooking = user ? queue.pending.find((b) => b.farmer_name === user.name) || (queue.in_process?.farmer_name === user.name ? queue.in_process : null) : null;
  const myPos = myBooking ? queue.pending.findIndex((b) => b.id === myBooking.id) + 1 : null;
  const estWait = myPos ? myPos * queue.avg_processing_minutes : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/mandis" className="text-emerald-700 text-sm inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" />Back to mandis</Link>
        {mandi && (
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950">{mandi.name}</h1>
            <div className="text-slate-600 text-sm flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{mandi.address}</div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border-none shadow-xl">
            <CardContent className="p-8">
              <div className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">{t("active_token")}</div>
              {queue.in_process ? (
                <>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="w-32 h-32 rounded-3xl bg-emerald-500 text-white grid place-items-center font-display text-5xl font-bold pulse-ring">
                      #{queue.in_process.token_number}
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold">{queue.in_process.farmer_name}</div>
                      <div className="text-emerald-200 text-sm mt-1">{queue.in_process.crop_name} · {queue.in_process.quantity_quintal} qtl</div>
                      <div className="text-emerald-300 text-xs mt-2">Slot: {queue.in_process.slot_date} {queue.in_process.slot_time}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 text-emerald-200">No token currently in processing. Waiting for officer to start next token.</div>
              )}

              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-800/50">
                  <div className="text-xs uppercase text-emerald-300 tracking-wider">Total Queue</div>
                  <div className="stat-num text-2xl font-bold mt-1">{queue.total}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-800/50">
                  <div className="text-xs uppercase text-emerald-300 tracking-wider">Pending</div>
                  <div className="stat-num text-2xl font-bold mt-1">{queue.pending.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-800/50">
                  <div className="text-xs uppercase text-emerald-300 tracking-wider">Completed</div>
                  <div className="stat-num text-2xl font-bold mt-1">{queue.completed_count}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-emerald-100">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">{t("your_position")}</div>
              {myPos !== null && myPos > 0 ? (
                <>
                  <div className="stat-num text-6xl font-bold text-emerald-900 mt-3">{myPos}</div>
                  <div className="mt-2 text-slate-600 flex items-center gap-1"><Clock className="w-4 h-4" />{t("est_wait")}: <span className="font-semibold text-emerald-800">~{estWait} {t("minutes")}</span></div>
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">Please reach the mandi at least 15 minutes before your turn. You will receive SMS + app alerts.</div>
                </>
              ) : (
                <div className="mt-4 text-slate-500 text-sm">{user ? "No active booking here." : "Login to see your position."}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-white border-emerald-100">
          <CardContent className="p-6">
            <h2 className="font-display text-xl font-semibold text-emerald-950 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-700" />Live Queue</h2>
            <div className="space-y-2">
              {queue.pending.length === 0 && !queue.in_process && <div className="text-slate-500 text-sm">Queue is empty.</div>}
              {queue.in_process && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white grid place-items-center font-display font-bold pulse-ring">#{queue.in_process.token_number}</div>
                  <div className="flex-1"><div className="font-semibold text-emerald-950">{queue.in_process.farmer_name}</div><div className="text-xs text-slate-500">{queue.in_process.crop_name} · {queue.in_process.quantity_quintal} qtl</div></div>
                  <Badge className="bg-emerald-600 text-white">In Process</Badge>
                </div>
              )}
              {queue.pending.map((b, idx) => (
                <div key={b.id} data-testid={`queue-item-${b.token_number}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 grid place-items-center font-display font-semibold">#{b.token_number}</div>
                  <div className="flex-1"><div className="font-medium text-slate-800">{b.farmer_name}</div><div className="text-xs text-slate-500">{b.crop_name} · {b.quantity_quintal} qtl · {b.slot_time}</div></div>
                  <Badge className="bg-slate-100 text-slate-700">Position {idx + 1}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
