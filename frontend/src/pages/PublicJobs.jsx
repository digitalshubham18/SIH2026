import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Calendar, MapPin, IndianRupee, Users, PhoneCall } from "lucide-react";

const ROLE_LABEL = {
  loader: "Loader", labour: "Labour", cleaner: "Cleaner",
  data_entry: "Data Entry", security: "Security", packer: "Packer", helper: "Helper",
};

export default function PublicJobs() {
  const { user } = useAuth();
  const { t } = useLang();
  const [jobs, setJobs] = useState([]);
  const [applyJob, setApplyJob] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });

  const load = () => api.get("/jobs").then((r) => setJobs(r.data));

  useEffect(() => {
    load();
    if (user) setForm({ name: user.name || "", phone: user.phone || "", note: "" });
  }, [user]);

  const openApply = (j) => {
    if (!user) return toast.error("Please login to apply");
    setForm({ name: user.name, phone: user.phone, note: "" });
    setApplyJob(j);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone required");
    try {
      await api.post(`/jobs/${applyJob.id}/apply`, form);
      toast.success("Applied! The mandi will contact you.");
      setApplyJob(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Rush Day Opportunities</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-700" />{t("jobs_title")}</h1>
          <p className="text-sm text-slate-600 mt-1">{t("jobs_sub")}</p>
        </div>

        {jobs.length === 0 && (
          <Card className="bg-white border-emerald-100">
            <CardContent className="p-12 text-center text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
              No open jobs right now. Check back during peak procurement season.
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <Card key={j.id} data-testid={`pub-job-${j.id}`} className="bg-white border-emerald-100 lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Badge className="bg-amber-100 text-amber-800">{ROLE_LABEL[j.role] || j.role}</Badge>
                  <div className="text-right">
                    <div className="stat-num text-xl font-bold text-emerald-700 flex items-center"><IndianRupee className="w-4 h-4" />{j.wage_per_day}</div>
                    <div className="text-[10px] uppercase text-slate-400 tracking-widest">per day</div>
                  </div>
                </div>
                <h3 className="font-display font-bold text-emerald-950 mt-3">{j.title}</h3>
                <p className="text-sm text-slate-600 mt-1 line-clamp-3">{j.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-700"><Calendar className="w-3.5 h-3.5" />{j.work_date}</div>
                  <div className="flex items-center gap-1 text-slate-700"><Users className="w-3.5 h-3.5" />{j.workers_needed} workers</div>
                  <div className="flex items-center gap-1 text-slate-700 col-span-2"><MapPin className="w-3.5 h-3.5" />{j.mandi_name}, {j.mandi_district}, {j.mandi_state}</div>
                  <div className="flex items-center gap-1 text-slate-700 col-span-2"><PhoneCall className="w-3.5 h-3.5" />{j.contact_phone}</div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{j.applications_count} applied</span>
                  <Button data-testid={`pub-apply-${j.id}`} onClick={() => openApply(j)} className="bg-emerald-700 hover:bg-emerald-800 text-white" size="sm">{t("apply_now")}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!applyJob} onOpenChange={(o) => !o && setApplyJob(null)}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Apply · {applyJob?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
              <div className="font-semibold text-emerald-950">{applyJob?.mandi_name}</div>
              <div className="text-slate-600 text-xs mt-1">₹{applyJob?.wage_per_day}/day · {applyJob?.work_date}</div>
            </div>
            <div><Label>Your Name</Label><Input data-testid="apply-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input data-testid="apply-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={10} /></div>
            <div><Label>Message (optional)</Label><Textarea data-testid="apply-note" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Experience / availability" /></div>
            <Button data-testid="apply-submit" onClick={submit} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">Submit Application</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
