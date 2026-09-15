import { useEffect, useState } from "react";
import { useLang } from "@/contexts/LangContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LifeBuoy, Clock, AlertTriangle, CheckCircle2, XCircle, EyeIcon, Filter, Scale, Award, CreditCard, HelpCircle } from "lucide-react";

const CAT_ICON = { weight: Scale, grade: Award, payment: CreditCard, other: HelpCircle };
const STATUS_STYLE = {
  open: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function AdminGrievances() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState("");
  const [action, setAction] = useState("resolve");

  const load = () => {
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (catFilter !== "all") params.category = catFilter;
    api.get("/admin/grievances", { params }).then((r) => setItems(r.data));
    api.get("/admin/grievance-stats").then((r) => setStats(r.data));
  };

  useEffect(() => { load(); }, [statusFilter, catFilter]);

  const openRespond = (g) => { setDialog(g); setNote(""); setAction("resolve"); };

  const respond = async () => {
    if (!note.trim()) return toast.error("Please write a response note");
    try {
      await api.post(`/admin/grievances/${dialog.id}/respond`, { action, resolution_note: note });
      toast.success("Response sent to farmer");
      setDialog(null); load();
    } catch { toast.error("Failed"); }
  };

  const cards = [
    { l: "Total Tickets", v: stats.total || 0, c: "emerald", Icon: LifeBuoy },
    { l: "Open", v: stats.open || 0, c: "amber", Icon: Clock },
    { l: "In Review", v: stats.in_review || 0, c: "blue", Icon: EyeIcon },
    { l: "Resolved", v: stats.resolved || 0, c: "emerald", Icon: CheckCircle2 },
    { l: "Rejected", v: stats.rejected || 0, c: "rose", Icon: XCircle },
    { l: "SLA Breached", v: stats.sla_breached || 0, c: "rose", Icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Support</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-1 flex items-center gap-3"><LifeBuoy className="w-8 h-8 text-emerald-700" />Grievance Desk</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map((c, i) => (
          <Card key={i} className="bg-white border-emerald-100 lift">
            <CardContent className="p-4">
              <c.Icon className={`w-5 h-5 mb-2 ${c.c === "amber" ? "text-amber-600" : c.c === "blue" ? "text-blue-600" : c.c === "rose" ? "text-rose-600" : "text-emerald-600"}`} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{c.l}</div>
              <div className="stat-num text-2xl font-bold text-emerald-950 mt-1" data-testid={`grv-stat-${i}`}>{c.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-emerald-100">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="flex items-center gap-1 text-xs text-slate-500"><Filter className="w-3 h-3" />Filters:</div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="grv-filter-status" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger data-testid="grv-filter-cat" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {items.length === 0 && <div className="text-center py-10 text-slate-500">No grievances match.</div>}

          <div className="space-y-3">
            {items.map((g) => {
              const Icon = CAT_ICON[g.category] || HelpCircle;
              const showSla = g.status === "open" || g.status === "in_review";
              return (
                <div key={g.id} data-testid={`grv-row-${g.id}`} className={`p-4 rounded-xl border ${g.sla_breached ? "border-rose-300 bg-rose-50/30" : "border-emerald-100 bg-white"} flex items-start gap-4`}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{g.ticket_no}</span>
                      <Badge className={STATUS_STYLE[g.status]}>{g.status.replace("_", " ")}</Badge>
                      <Badge className="bg-slate-100 text-slate-700">{g.category}</Badge>
                      {g.sla_breached && <Badge className="bg-rose-100 text-rose-800"><AlertTriangle className="w-3 h-3 mr-1" />SLA Breach</Badge>}
                    </div>
                    <div className="font-semibold text-emerald-950 mt-1">{g.subject}</div>
                    <div className="text-sm text-slate-600 mt-1 line-clamp-2">{g.description}</div>
                    <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-3">
                      <span>{g.farmer_name} · {g.farmer_phone}</span>
                      {g.farmer_state && <span>· {g.farmer_state}</span>}
                      {g.booking_ref && <span>· Token #{g.booking_ref.token_number} @ {g.booking_ref.mandi_name}</span>}
                      <span>· {new Date(g.created_at).toLocaleString()}</span>
                      {showSla && (
                        <span className={`flex items-center gap-1 ${g.sla_hours_left < 6 ? "text-rose-700 font-semibold" : "text-emerald-700"}`}>
                          <Clock className="w-3 h-3" />{g.sla_hours_left > 0 ? `${g.sla_hours_left}h left` : `${Math.abs(g.sla_hours_left)}h over`}
                        </span>
                      )}
                    </div>
                    {g.resolution_note && (
                      <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-100 text-xs">
                        <span className="font-semibold text-emerald-800">Response by {g.responded_by}:</span> <span className="text-slate-700">{g.resolution_note}</span>
                      </div>
                    )}
                  </div>
                  {(g.status === "open" || g.status === "in_review") && (
                    <Button data-testid={`grv-respond-${g.id}`} onClick={() => openRespond(g)} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Respond</Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Respond · {dialog?.ticket_no}</DialogTitle></DialogHeader>
          {dialog && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                <div className="font-semibold text-emerald-950">{dialog.subject}</div>
                <div className="text-slate-600 mt-1">{dialog.description}</div>
                <div className="text-xs text-slate-500 mt-2">From {dialog.farmer_name} ({dialog.farmer_phone})</div>
              </div>
              <div>
                <label className="text-sm font-medium">Action</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger data-testid="grv-action" className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="in_review">Mark In Review</SelectItem>
                    <SelectItem value="resolve">Resolve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Resolution Note (visible to farmer)</label>
                <Textarea data-testid="grv-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Explain the resolution or next steps…" />
              </div>
              <Button data-testid="grv-send" onClick={respond} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">Send Response</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
