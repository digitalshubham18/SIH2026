import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import AshokaEmblem from "@/components/AshokaEmblem";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Package, LifeBuoy, Building2, Bell, LogOut, Languages, ShieldCheck, ExternalLink, Wheat, Wrench, Briefcase, UserCheck } from "lucide-react";

const baseLinks = [
  { to: "/admin", label: "Command Center", icon: LayoutDashboard, end: true },
  { to: "/admin/today", label: "Today's Crops", icon: Wheat },
  { to: "/admin/bookings", label: "Bookings Queue", icon: Package },
  { to: "/admin/machinery", label: "Machinery", icon: Wrench },
  { to: "/admin/jobs", label: "Job Postings", icon: Briefcase },
  { to: "/admin/grievances", label: "Grievance Desk", icon: LifeBuoy },
  { to: "/admin/mandis", label: "Mandi Directory", icon: Building2 },
];
const adminOnly = [
  { to: "/admin/officers", label: "Officer Onboarding", icon: UserCheck },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const nav = useNavigate();
  const links = user?.role === "admin" ? [...baseLinks, ...adminOnly] : baseLinks;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 shrink-0 bg-emerald-950 text-emerald-50 flex flex-col sticky top-0 h-screen" data-testid="admin-sidebar">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#FF9933 0 33%,#FFFFFF 33% 66%,#138808 66% 100%)" }} />
        <Link to="/admin" className="p-5 flex items-center gap-3 border-b border-emerald-800/50" data-testid="sidebar-logo">
          <AshokaEmblem size={40} />
          <div>
            <div className="font-display font-bold leading-tight">DoCA Console</div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Officer / Admin</div>
          </div>
        </Link>

        <div className="px-4 py-3 border-b border-emerald-800/50 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-300"><ShieldCheck className="w-3 h-3" /> Signed in as</div>
          <div className="font-semibold mt-0.5" data-testid="sidebar-user">{user?.name}</div>
          <div className="text-emerald-400 text-[10px] uppercase tracking-wider mt-0.5">{user?.role}{user?.mandi_name ? ` · ${user.mandi_name}` : ""}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((l) => (
            <NavLink
              key={l.to} to={l.to} end={l.end}
              data-testid={`sb-${l.to.split("/").pop() || "home"}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40" : "text-emerald-100 hover:bg-emerald-900/50"}`
              }
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-emerald-800/50 space-y-2">
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger data-testid="sb-lang" className="w-full bg-emerald-900 border-emerald-800 text-emerald-100 h-9">
              <Languages className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिन्दी</SelectItem>
              <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/" data-testid="sb-public"><Button variant="outline" size="sm" className="w-full bg-transparent border-emerald-700 text-emerald-100 hover:bg-emerald-900 hover:text-white"><ExternalLink className="w-3.5 h-3.5 mr-1" />Public Site</Button></Link>
          <Button variant="ghost" size="sm" data-testid="sb-logout" onClick={() => { logout(); nav("/"); }} className="w-full text-rose-200 hover:bg-rose-900/30 hover:text-rose-100">
            <LogOut className="w-3.5 h-3.5 mr-1" />Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 bg-white border-b border-emerald-100 flex items-center justify-between px-6 sticky top-0 z-30" data-testid="admin-topbar">
          <div className="text-xs text-slate-500 uppercase tracking-widest">Ministry of Consumer Affairs · Government of India</div>
          <button onClick={() => nav("/notifications")} data-testid="admin-bell" className="text-emerald-800 hover:bg-emerald-50 p-2 rounded-lg">
            <Bell className="w-5 h-5" />
          </button>
        </header>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
