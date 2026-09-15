import { useLang } from "@/contexts/LangContext";
import AshokaEmblem from "@/components/AshokaEmblem";
import { PhoneCall, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-emerald-950 text-emerald-50 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <AshokaEmblem size={48} />
            <div>
              <div className="font-display font-bold text-lg">{t("app_name")}</div>
              <div className="text-emerald-200 text-xs uppercase tracking-widest">{t("goi")}</div>
            </div>
          </div>
          <p className="text-emerald-200 text-sm leading-relaxed max-w-md">{t("footer_about")}</p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4 text-white">{t("schemes")}</h4>
          <ul className="space-y-2 text-sm text-emerald-200">
            <li>PMFBY - Fasal Bima</li>
            <li>PM-KISAN</li>
            <li>e-NAM</li>
            <li>PMGKAY</li>
            <li>MSP Procurement</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4 text-white">{t("contact_us")}</h4>
          <ul className="space-y-3 text-sm text-emerald-200">
            <li className="flex gap-2 items-start"><PhoneCall className="w-4 h-4 mt-0.5" /> 1800-11-FARM</li>
            <li className="flex gap-2 items-start"><Mail className="w-4 h-4 mt-0.5" /> help@doca.gov.in</li>
            <li className="flex gap-2 items-start"><MapPin className="w-4 h-4 mt-0.5" /> Krishi Bhavan, New Delhi 110001</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-emerald-300 flex flex-col md:flex-row justify-between gap-2">
          <span>© 2026 {t("all_rights")}</span>
          <span>SIH 2026 · Problem #26032 · Department of Consumer Affairs (DoCA)</span>
        </div>
      </div>
    </footer>
  );
}
