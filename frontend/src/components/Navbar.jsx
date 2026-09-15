import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import AshokaEmblem from "@/components/AshokaEmblem";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Bell, LogOut, LayoutDashboard, Languages, User, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const nav = useNavigate();

  return (
    <>
      <div className="gov-strip" />
      <div className="bg-emerald-950 text-emerald-100 text-xs py-1.5 px-4 flex justify-between items-center">
        <span data-testid="gov-ministry">{t("ministry")} · {t("goi")}</span>
        <span className="hidden md:inline">{t("helpline")}: 1800-11-FARM</span>
      </div>
      <header className="sticky top-0 z-40 glass border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-3">
            <AshokaEmblem size={44} />
            <div className="leading-tight">
              <div className="font-display font-bold text-emerald-900 text-lg">{t("app_name")}</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-widest">{t("tagline")}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <Link to="/" data-testid="nav-home" className="hover:text-emerald-700">{t("home")}</Link>
            <Link to="/mandis" data-testid="nav-mandis" className="hover:text-emerald-700">{t("mandis")}</Link>
            {user && <Link to="/dashboard" data-testid="nav-dashboard" className="hover:text-emerald-700">{t("dashboard")}</Link>}
            {user && <Link to="/bookings" data-testid="nav-bookings" className="hover:text-emerald-700">{t("my_bookings")}</Link>}
            {user && user.role === "farmer" && <Link to="/grievances" data-testid="nav-grievances" className="hover:text-emerald-700">{t("grievance_desk")}</Link>}
            {user && ["admin","officer"].includes(user.role) && (
              <Link to="/admin" data-testid="nav-admin" className="hover:text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-4 h-4" />{t("admin")}</Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger data-testid="lang-switcher" className="w-[110px] h-9 bg-white border-emerald-200">
                <Languages className="w-4 h-4 mr-1 text-emerald-700" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="en" data-testid="lang-en">English</SelectItem>
                <SelectItem value="hi" data-testid="lang-hi">हिन्दी</SelectItem>
                <SelectItem value="pa" data-testid="lang-pa">ਪੰਜਾਬੀ</SelectItem>
              </SelectContent>
            </Select>

            {user ? (
              <>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => nav("/notifications")}
                  data-testid="nav-notifications"
                  className="hover:bg-emerald-50"
                >
                  <Bell className="w-5 h-5 text-emerald-800" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-testid="user-menu" className="border-emerald-300 text-emerald-900 bg-white">
                      <User className="w-4 h-4 mr-1" />{user.name.split(" ")[0]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    <DropdownMenuItem onClick={() => nav("/dashboard")} data-testid="menu-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />{t("dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { logout(); nav("/"); }} data-testid="menu-logout" className="text-rose-700">
                      <LogOut className="w-4 h-4 mr-2" />{t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => nav("/login")} data-testid="nav-login" className="text-emerald-900 hover:bg-emerald-50">
                  {t("login")}
                </Button>
                <Button onClick={() => nav("/register")} data-testid="nav-register" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {t("register")}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
