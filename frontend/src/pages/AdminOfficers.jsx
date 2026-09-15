import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCheck, Clock, CheckCircle2, XCircle, ShieldCheck, Building2, Phone, Mail, IdCard, Filter } from "lucide-react";

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function AdminOfficers() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dialog, setDialog] = useState(null);
  const [action, setAction] = useState("approve");
  const [reason, setReason] = useState("");

  const load = () => {
    const params = statusFilter === "all" ? {} : { status: statusFilter };
    api.get("/admin/officer-applications", { params }).then((r) => setItems(r.data));
  };
  useEffect(load, [statusFilter]);

  const openReview = (o, act) => { setDialog(o); setAction(act); setReason(""); };

  const submit = async () => {
    try {
      await api.post(`/admin/officers/${dialog.id}/${action}`, { reason });
      toast.success(action === "approve" ? "Officer approved" : "Application rejected");
      setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const counts = items.reduce((a, o) => { const s = o.verification_status || "pending"; a[s] = (a[s] || 0) + 1; return a; }, {});
  const cards = [
    { l: "Total in view", v: items.length, Icon: UserCheck, c: "emerald" },
    { l: "Pending", v: counts.pending || 0, Icon: Clock, c: "amber" },
    { l: "Approved", v: counts.approved || 0, Icon: CheckCircle2, c: "emerald" },
    { l: "Rejected", v: counts.rejected || 0, Icon: XCircle, c: "rose" },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold flex items-center gap-1"><ShieldCheck className="w-3 h-3" />DoCA Verification</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><UserCheck className="w-8 h-8 text-emerald-700" />Officer Onboarding</h1>
        <p className="text-sm text-slate-600 mt-1">Review and approve mandi owners applying to operate DoCA e-Procurement.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <c.Icon className={`w-5 h-5 mb-2 ${c.c === "amber" ? "text-amber-600" : c.c === "rose" ? "text-rose-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{c.l}</div>
              <div className="stat-num text-2xl font-bold text-emerald-950 mt-1" data-testid={`off-stat-${i}`}>{c.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-emerald-100">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 text-xs text-slate-500"><Filter className="w-3 h-3" />Show:</div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="off-filter" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {items.length === 0 && <div className="text-center py-10 text-slate-500">No {statusFilter !== "all" ? statusFilter : ""} officer applications.</div>}

          <div className="space-y-3">
            {items.map((o) => (
              <div key={o.id} data-testid={`off-row-${o.id}`} className="p-4 rounded-xl border border-emerald-100 bg-white flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-display font-bold shrink-0">
                  {o.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-emerald-950">{o.name}</span>
                    <Badge className={STATUS_STYLE[o.verification_status || "pending"]}>{o.verification_status || "pending"}</Badge>
                    {o.designation && <Badge className="bg-slate-100 text-slate-700">{o.designation}</Badge>}
                  </div>
                  <div className="mt-2 grid md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                    <div className="flex gap-2 items-center"><Building2 className="w-3.5 h-3.5 text-emerald-600" />{o.mandi_name} <span className="font-mono text-slate-400">{o.mandi_code}</span></div>
                    <div className="flex gap-2 items-center"><Phone className="w-3.5 h-3.5 text-emerald-600" />{o.phone}</div>
                    <div className="flex gap-2 items-center"><Mail className="w-3.5 h-3.5 text-emerald-600" />{o.email}</div>
                    <div className="flex gap-2 items-center"><IdCard className="w-3.5 h-3.5 text-emerald-600" />Aadhaar ending {o.aadhaar_last4}</div>
                  </div>
                  {o.documents_note && (
                    <div className="mt-2 text-xs text-slate-500 italic">"{o.documents_note}"</div>
                  )}
                  {o.verification_note && (
                    <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold">{o.verification_status === "approved" ? "Approved" : "Reviewed"} by {o.reviewed_by || "System"}:</span> <span className="text-slate-700">{o.verification_note}</span>
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-slate-400">Applied {new Date(o.created_at).toLocaleString()}</div>
                </div>
                {o.verification_status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button data-testid={`off-approve-${o.id}`} size="sm" onClick={() => openReview(o, "approve")} className="bg-emerald-700 hover:bg-emerald-800 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
                    <Button data-testid={`off-reject-${o.id}`} size="sm" variant="outline" onClick={() => openReview(o, "reject")} className="border-rose-200 text-rose-700"><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>{action === "approve" ? "Approve Officer" : "Reject Application"} · {dialog?.name}</DialogTitle></DialogHeader>
          {dialog && (
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Mandi: <b>{dialog.mandi_name}</b> · Aadhaar ending <b>{dialog.aadhaar_last4}</b>
              </div>
              <div>
                <label className="text-sm font-medium">{action === "approve" ? "Approval note" : "Rejection reason"}</label>
                <Textarea data-testid="off-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={action === "approve" ? "Documents verified against govt records…" : "Aadhaar mismatch, invalid appointment order etc."} />
              </div>
              <Button data-testid="off-submit" onClick={submit} className={action === "approve" ? "w-full bg-emerald-700 hover:bg-emerald-800 text-white" : "w-full bg-rose-700 hover:bg-rose-800 text-white"}>
                Confirm {action === "approve" ? "Approval" : "Rejection"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
