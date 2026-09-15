import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle, Info, CheckCheck } from "lucide-react";

const icons = { success: CheckCircle2, warning: AlertCircle, info: Info };
const colors = { success: "text-emerald-600 bg-emerald-100", warning: "text-amber-600 bg-amber-100", info: "text-blue-600 bg-blue-100" };

export default function Notifications() {
  const { t } = useLang();
  const [ns, setNs] = useState([]);

  const load = () => api.get("/notifications").then((r) => setNs(r.data));
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.post("/notifications/read-all"); load(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Alerts</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-2"><Bell className="w-8 h-8 text-emerald-700" />{t("notifications")}</h1>
          </div>
          {ns.length > 0 && <Button data-testid="read-all-btn" variant="outline" onClick={readAll} className="border-emerald-200 text-emerald-800"><CheckCheck className="w-4 h-4 mr-1" />{t("mark_all_read")}</Button>}
        </div>

        {ns.length === 0 && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-12 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              {t("no_notifications")}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {ns.map((n) => {
            const Icon = icons[n.type] || Info;
            return (
              <Card key={n.id} data-testid={`notif-${n.id}`} className={`border-emerald-100 ${n.read ? "bg-white" : "bg-emerald-50/40"}`}>
                <CardContent className="p-4 flex gap-4">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${colors[n.type] || colors.info}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-950">{n.title}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{n.message}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
