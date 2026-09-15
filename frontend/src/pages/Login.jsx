import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AshokaEmblem from "@/components/AshokaEmblem";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-12">
        <Card className="border-emerald-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3"><AshokaEmblem size={54} /></div>
            <CardTitle className="font-display text-2xl text-emerald-950">{t("login")}</CardTitle>
            <p className="text-sm text-slate-500">{t("welcome_back")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>{t("phone")}</Label>
                <Input data-testid="login-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" required maxLength={10} className="mt-1" />
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
            <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <div className="font-semibold mb-1">Demo Accounts (SIH Judges):</div>
              <div>Farmer: 9876543210 / Farmer@123</div>
              <div>Officer: 9999900002 / Officer@123</div>
              <div>Admin: 9999900001 / Admin@123</div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
