import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AshokaEmblem from "@/components/AshokaEmblem";
import { ShieldCheck, Tractor, Building2 } from "lucide-react";

const DEMO = [
  { role: "officer", label: "Mandi Owner / Officer", phone: "9999900002", password: "Officer@123", Icon: Building2, note: "Manage machinery, jobs, procurement", highlight: true },
  { role: "farmer", label: "Farmer", phone: "9876543210", password: "Farmer@123", Icon: Tractor, note: "Book slot, track queue, DBT" },
  { role: "admin", label: "DoCA Admin", phone: "9999900001", password: "Admin@123", Icon: ShieldCheck, note: "National view, all mandis" },
];

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === "farmer" ? "/dashboard" : "/admin"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(phone, password);
      toast.success(`${t("welcome_back")}, ${u.name}`);
      nav(u.role === "farmer" ? "/dashboard" : "/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  const quickFill = (d) => { setPhone(d.phone); setPassword(d.password); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-5 gap-8 items-start">
        <Card className="lg:col-span-2 border-emerald-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3"><AshokaEmblem size={54} /></div>
            <CardTitle className="font-display text-2xl text-emerald-950">{t("login")}</CardTitle>
            <p className="text-sm text-slate-500">{t("welcome_back")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>{t("phone")}</Label>
                <Input data-testid="login-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" required maxLength={10} className="mt-1" />
              </div>
              <div>
                <Label>{t("password")}</Label>
                <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
              </div>
              <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11">
                {loading ? "…" : t("login")}
              </Button>
            </form>
            <div className="text-center mt-4 text-sm">
              <Link to="/register" data-testid="link-register" className="text-emerald-700 hover:underline">{t("new_user")}</Link>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <div className="mb-2">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">SIH 2026 Judges · Quick Access</div>
            <h2 className="font-display text-xl font-bold text-emerald-950 mt-1">One-click Demo Accounts</h2>
            <p className="text-xs text-slate-500 mt-1">Tap any card to autofill credentials, then click Login.</p>
          </div>
          {DEMO.map((d) => (
            <button
              key={d.role} data-testid={`demo-${d.role}`}
              onClick={() => quickFill(d)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition lift flex items-center gap-4 ${d.highlight ? "bg-gradient-to-br from-emerald-50 to-amber-50 border-emerald-500 shadow-md" : "bg-white border-emerald-100 hover:border-emerald-300"}`}
            >
              <div className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${d.highlight ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                <d.Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-display font-bold text-emerald-950">{d.label}</div>
                  {d.highlight && <Badge className="bg-amber-500 text-white text-[10px]">Featured</Badge>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{d.note}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono">
                  <span className="text-slate-500">Phone: <span className="text-emerald-800 font-semibold">{d.phone}</span></span>
                  <span className="text-slate-500">Pwd: <span className="text-emerald-800 font-semibold">{d.password}</span></span>
                </div>
              </div>
              <div className="text-xs text-emerald-700 font-semibold">Autofill →</div>
            </button>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
