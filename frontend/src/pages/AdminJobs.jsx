import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Users, Calendar, MapPin, PhoneCall, IndianRupee, CheckCircle2, XCircle, Clock, LockKeyhole } from "lucide-react";

const ROLE_LABEL = {
  loader: "Loader", labour: "Labour", cleaner: "Cleaner",
  data_entry: "Data Entry", security: "Security", packer: "Packer", helper: "Helper",
};

const EMPTY = { title: "", description: "", role: "loader", wage_per_day: 750, workers_needed: 3, work_date: "", contact_phone: "" };

export default function AdminJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [mandiId, setMandiId] = useState(user?.mandi_id || "");
  const [newDialog, setNewDialog] = useState(false);
  const [appDialog, setAppDialog] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, contact_phone: user?.phone || "" });

  const load = () => {
    const params = mandiId ? { mandi_id: mandiId } : {};
    api.get("/admin/jobs", { params }).then((r) => setJobs(r.data));
  };

  useEffect(() => {
    if (user?.role === "admin") api.get("/admin/mandis").then((r) => setMandis(r.data));
  }, [user]);
  useEffect(load, [mandiId]);

  const post = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.work_date) return toast.error("Please fill title, description and work date");
    try {
      await api.post("/admin/jobs", { ...form, mandi_id: mandiId || user?.mandi_id, wage_per_day: parseFloat(form.wage_per_day), workers_needed: parseInt(form.workers_needed) });
      toast.success("Job posted"); setNewDialog(false); setForm({ ...EMPTY, contact_phone: user?.phone || "" }); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const closeJob = async (id) => { await api.post(`/admin/jobs/${id}/close`); toast.success("Job closed"); load(); };

  const decide = async (jid, aid, decision) => {
    await api.post(`/admin/jobs/${jid}/applications/${aid}/decide`, null, { params: { decision } });
    toast.success(`Application ${decision}`);
    const updated = await api.get(`/admin/jobs`, { params: mandiId ? { mandi_id: mandiId } : {} });
    setJobs(updated.data);
    setAppDialog(updated.data.find((j) => j.id === jid));
  };

  const openCount = jobs.filter((j) => j.status === "open").length;
  const totalApps = jobs.reduce((s, j) => s + (j.applications?.length || 0), 0);
  const pendingApps = jobs.reduce((s, j) => s + (j.applications?.filter((a) => a.status === "pending").length || 0), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Rush Day Ops</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-700" />Temporary Jobs Board</h1>
          <p className="text-sm text-slate-600 mt-1">Post temporary jobs when farmer rush is expected. Farmers and villagers can apply from the public jobs page.</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && mandis.length > 0 && (
            <select data-testid="job-mandi" value={mandiId} onChange={(e) => setMandiId(e.target.value)} className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm">
              <option value="">All Mandis</option>
              {mandis.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <Button data-testid="job-post" onClick={() => setNewDialog(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white"><Plus className="w-4 h-4 mr-1" />Post Job</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: "Total Jobs", v: jobs.length, c: "emerald", Icon: Briefcase },
          { l: "Open Jobs", v: openCount, c: "amber", Icon: Clock },
          { l: "Applications", v: totalApps, c: "blue", Icon: Users },
          { l: "Pending Review", v: pendingApps, c: "rose", Icon: Clock },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <s.Icon className={`w-5 h-5 mb-2 ${s.c === "amber" ? "text-amber-600" : s.c === "blue" ? "text-blue-600" : s.c === "rose" ? "text-rose-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.l}</div>
              <div className="stat-num text-2xl font-bold text-emerald-950 mt-1" data-testid={`job-stat-${i}`}>{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <Card className="bg-white border-emerald-100"><CardContent className="p-12 text-center text-slate-500"><Briefcase className="w-12 h-12 mx-auto text-emerald-200 mb-3" />No jobs posted yet.</CardContent></Card>
      )}

      <div className="space-y-3">
        {jobs.map((j) => (
          <Card key={j.id} data-testid={`job-card-${j.id}`} className="bg-white border-emerald-100 lift">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-800">{ROLE_LABEL[j.role] || j.role}</Badge>
                    <Badge className={j.status === "open" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}>{j.status}</Badge>
                    <span className="text-xs text-slate-500">Posted {new Date(j.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-display font-bold text-emerald-950 mt-2">{j.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{j.description}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-emerald-800 font-semibold"><IndianRupee className="w-4 h-4" />{j.wage_per_day}/day</span>
                    <span className="flex items-center gap-1 text-slate-700"><Users className="w-4 h-4" />{j.workers_needed} workers</span>
                    <span className="flex items-center gap-1 text-slate-700"><Calendar className="w-4 h-4" />{j.work_date}</span>
                    <span className="flex items-center gap-1 text-slate-700"><MapPin className="w-4 h-4" />{j.mandi_name}</span>
                    <span className="flex items-center gap-1 text-slate-700"><PhoneCall className="w-4 h-4" />{j.contact_phone}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="text-right">
                    <div className="stat-num text-2xl font-bold text-emerald-800">{j.applications?.length || 0}</div>
                    <div className="text-[10px] uppercase text-slate-400 tracking-widest">applications</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAppDialog(j)} data-testid={`job-view-${j.id}`} className="border-emerald-200 text-emerald-700"><Users className="w-3 h-3 mr-1" />View</Button>
                    {j.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => closeJob(j.id)} data-testid={`job-close-${j.id}`} className="border-rose-200 text-rose-700"><LockKeyhole className="w-3 h-3 mr-1" />Close</Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Post new job */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader><DialogTitle>Post Temporary Job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input data-testid="job-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5 loaders needed for tomorrow" /></div>
            <div><Label>Description</Label><Textarea data-testid="job-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Work timings, requirements, food/tea etc." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="job-role" className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Work Date</Label><Input data-testid="job-date" type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} /></div>
              <div><Label>Wage / day (₹)</Label><Input data-testid="job-wage" type="number" value={form.wage_per_day} onChange={(e) => setForm({ ...form, wage_per_day: e.target.value })} /></div>
              <div><Label>Workers Needed</Label><Input data-testid="job-workers" type="number" min={1} value={form.workers_needed} onChange={(e) => setForm({ ...form, workers_needed: e.target.value })} /></div>
            </div>
            <div><Label>Contact Phone</Label><Input data-testid="job-contact" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="10-digit mobile" /></div>
            <Button data-testid="job-save" onClick={post} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">Post Job</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Applications viewer */}
      <Dialog open={!!appDialog} onOpenChange={(o) => !o && setAppDialog(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader><DialogTitle>Applications · {appDialog?.title}</DialogTitle></DialogHeader>
          {appDialog && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(!appDialog.applications || appDialog.applications.length === 0) && (
                <div className="text-center py-10 text-slate-500">No applications yet. Share the public jobs page!</div>
              )}
              {(appDialog.applications || []).map((a) => (
                <div key={a.id} data-testid={`app-${a.id}`} className="p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-semibold">{a.name?.[0]?.toUpperCase() || "?"}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-950">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.phone} · Applied {new Date(a.applied_at).toLocaleString()}</div>
                    {a.note && <div className="text-xs text-slate-600 italic mt-0.5">"{a.note}"</div>}
                  </div>
                  <div className="flex gap-1 items-center">
                    <Badge className={a.status === "accepted" ? "bg-emerald-100 text-emerald-800" : a.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>{a.status}</Badge>
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => decide(appDialog.id, a.id, "accepted")} data-testid={`app-accept-${a.id}`} className="border-emerald-200 text-emerald-700"><CheckCircle2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => decide(appDialog.id, a.id, "rejected")} data-testid={`app-reject-${a.id}`} className="border-rose-200 text-rose-700"><XCircle className="w-3 h-3" /></Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
