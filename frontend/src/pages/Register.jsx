import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AshokaEmblem from "@/components/AshokaEmblem";
import { CheckCircle2 } from "lucide-react";

const STATES = ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Maharashtra", "Rajasthan", "Bihar", "West Bengal", "Karnataka", "Andhra Pradesh"];

export default function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", phone: "", password: "", email: "", village: "", district: "", state: "Punjab", aadhaar_last4: "" });
  const [otpSent, setOtpSent] = useState(null); // holds simulated code
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setF({ ...f, [k]: typeof e === "string" ? e : e.target.value });

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(f.phone)) return toast.error("Enter a valid 10-digit phone");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", { phone: f.phone });
      setOtpSent(data.simulated_otp);
      toast.success(`OTP sent (demo): ${data.simulated_otp}`);
      setStep(2);
    } catch (e) { toast.error("OTP send failed"); }
    finally { setLoading(false); }
  };

  const verifyAndRegister = async () => {
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { phone: f.phone, code: otp });
      const u = await register(f);
      toast.success(`Welcome ${u.name}!`);
      nav("/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Navbar />
      <div className="max-w-lg mx-auto px-6 py-10">
        <Card className="border-emerald-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3"><AshokaEmblem size={54} /></div>
            <CardTitle className="font-display text-2xl text-emerald-950">{t("register")}</CardTitle>
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 w-16 rounded-full ${step >= s ? "bg-emerald-600" : "bg-slate-200"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-3">
                <div><Label>{t("name")}</Label><Input data-testid="reg-name" value={f.name} onChange={upd("name")} required /></div>
                <div><Label>{t("phone")}</Label><Input data-testid="reg-phone" value={f.phone} onChange={upd("phone")} maxLength={10} placeholder="10-digit mobile" required /></div>
                <div><Label>{t("password")}</Label><Input data-testid="reg-password" type="password" value={f.password} onChange={upd("password")} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("village")}</Label><Input data-testid="reg-village" value={f.village} onChange={upd("village")} /></div>
                  <div><Label>{t("district")}</Label><Input data-testid="reg-district" value={f.district} onChange={upd("district")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("state")}</Label>
                    <select data-testid="reg-state" className="w-full mt-1 h-10 rounded-md border border-input bg-white px-3 text-sm" value={f.state} onChange={upd("state")}>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><Label>{t("aadhaar")}</Label><Input data-testid="reg-aadhaar" value={f.aadhaar_last4} onChange={upd("aadhaar_last4")} maxLength={4} placeholder="XXXX" /></div>
                </div>
                <Button data-testid="reg-send-otp" onClick={sendOtp} disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 mt-2">
                  {t("send_otp")}
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold"><CheckCircle2 className="w-4 h-4" /> Simulated SMS OTP (Demo Mode)</div>
                  <div className="text-amber-800 mt-1">Your OTP is <span className="font-mono font-bold text-lg" data-testid="otp-code">{otpSent}</span></div>
                </div>
                <div><Label>{t("otp")}</Label><Input data-testid="reg-otp-input" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={4} placeholder="4-digit OTP" /></div>
                <Button data-testid="reg-verify" onClick={verifyAndRegister} disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11">
                  {t("verify_otp")} & {t("register")}
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)} className="w-full">← Back</Button>
              </div>
            )}
            <div className="text-center mt-4 text-sm">
              <Link to="/login" data-testid="link-login" className="text-emerald-700 hover:underline">{t("already_have")}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
