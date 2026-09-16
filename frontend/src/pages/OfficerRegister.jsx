import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AshokaEmblem from "@/components/AshokaEmblem";
import { Building2, ShieldCheck, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export default function OfficerRegister() {
  const nav = useNavigate();
  const [mandis, setMandis] = useState([]);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", phone: "", password: "", email: "", mandi_id: "", commission_id: "", aadhaar_last4: "", designation: "Mandi Owner", documents_note: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => { api.get("/mandis").then((r) => setMandis(r.data)); }, []);

  const upd = (k) => (e) => setF({ ...f, [k]: typeof e === "string" ? e : e.target.value });

  const canNext1 = f.name.trim() && /^\d{10}$/.test(f.phone) && f.password.length >= 6 && /^\S+@\S+\.\S+$/.test(f.email);
  const canSubmit = /^\d{4}$/.test(f.aadhaar_last4) && f.commission_id && f.commission_id.length >= 3;

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/officer-register", f);
      toast.success("Application submitted!");
      setSubmitted(data.user);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-12">
          <Card className="border-emerald-200 shadow-xl bg-white">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 grid place-items-center mx-auto mb-4"><Clock className="w-8 h-8 text-amber-700" /></div>
              <h1 className="font-display text-2xl font-bold text-emerald-950">Application Submitted</h1>
              <p className="text-sm text-slate-600 mt-2">Thank you, {submitted.name}. Your officer application for <b>{submitted.mandi_name}</b> is under DoCA verification.</p>
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-left space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Application ID</span><span className="font-mono text-emerald-800">{submitted.id.slice(0, 8).toUpperCase()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mandi Code</span><span className="font-mono text-emerald-800">{submitted.mandi_code}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-amber-700 font-semibold">Pending Verification</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SLA</span><span className="text-slate-700">24-48 hours</span></div>
              </div>
              <p className="text-xs text-slate-500 mt-4">You will receive an SMS + email once DoCA approves your account. You can then log in to unlock your Mandi Console.</p>
              <Link to="/login"><Button data-testid="op-goto-login" className="mt-6 bg-emerald-700 hover:bg-emerald-800 text-white">Go to Login</Button></Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Card className="border-emerald-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3"><AshokaEmblem size={54} /></div>
            <CardTitle className="font-display text-2xl text-emerald-950 flex items-center justify-center gap-2"><Building2 className="w-6 h-6 text-emerald-700" />Mandi Owner / Officer Registration</CardTitle>
            <p className="text-sm text-slate-500">Register your mandi to manage bookings, machinery, jobs and payments through DoCA e-Procurement.</p>
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2].map((s) => <div key={s} className={`h-1.5 w-24 rounded-full ${step >= s ? "bg-emerald-600" : "bg-slate-200"}`} />)}
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold mb-2">Step 1 · Personal Details</div>
                <div><Label>Full Name</Label><Input data-testid="op-name" value={f.name} onChange={upd("name")} placeholder="As per Aadhaar" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone Number</Label><Input data-testid="op-phone" value={f.phone} onChange={upd("phone")} maxLength={10} placeholder="10-digit mobile" /></div>
                  <div><Label>Email</Label><Input data-testid="op-email" type="email" value={f.email} onChange={upd("email")} placeholder="you@example.com" /></div>
                </div>
                <div><Label>Set Password</Label><Input data-testid="op-password" type="password" value={f.password} onChange={upd("password")} placeholder="Min 6 characters" /></div>
                <div><Label>Designation</Label><Input data-testid="op-designation" value={f.designation} onChange={upd("designation")} /></div>
                <Button data-testid="op-next" onClick={() => setStep(2)} disabled={!canNext1} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 mt-2">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold mb-2">Step 2 · Mandi & Verification</div>
                <div>
                  <Label>Preferred Mandi <span className="text-slate-400 text-xs">(optional — you'll create your own after approval)</span></Label>
                  <Select value={f.mandi_id} onValueChange={upd("mandi_id")}>
                    <SelectTrigger data-testid="op-mandi" className="bg-white"><SelectValue placeholder="Optional — select existing mandi" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-72">
                      {mandis.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.code} ({m.district}, {m.state})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Aadhaar Last 4 Digits</Label><Input data-testid="op-aadhaar" value={f.aadhaar_last4} onChange={upd("aadhaar_last4")} maxLength={4} placeholder="XXXX" /></div>
                <div>
                  <Label>e-NAM / APMC Commission ID</Label>
                  <Input data-testid="op-commission" value={f.commission_id || ""} onChange={upd("commission_id")} placeholder="e.g. ENAM-PB-LDH-2019-KHN" />
                  <a href="https://www.enam.gov.in/web/" target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline mt-1 inline-block">Find your Commission ID on e-NAM →</a>
                </div>
                <div><Label>Supporting Documents Note <span className="text-slate-400 text-xs">(optional)</span></Label><Textarea data-testid="op-docs" rows={3} value={f.documents_note} onChange={upd("documents_note")} placeholder="Government appointment order number / mandi license / anything to help DoCA verify" /></div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2 items-start">
                  <ShieldCheck className="w-4 h-4 mt-0.5" />
                  <div>Your application will be verified by DoCA officials within 24-48 hours. Console access unlocks after approval.</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                  <Button data-testid="op-submit" onClick={submit} disabled={!canSubmit || loading} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white h-11">
                    {loading ? "…" : "Submit for Verification"}
                  </Button>
                </div>
              </div>
            )}
            <div className="text-center mt-4 text-sm">
              <Link to="/login" data-testid="op-link-login" className="text-emerald-700 hover:underline">Already approved? Login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
