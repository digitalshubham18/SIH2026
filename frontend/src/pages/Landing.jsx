import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tractor, Calendar, Users, ShieldCheck, TrendingUp, CreditCard, ArrowRight, CheckCircle2, Clock, BellRing, Building2, FileText } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1673538064388-21d1aaaf6594?crop=entropy&cs=srgb&fm=jpg&q=85";

function Stat({ value, label, suffix = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = parseFloat(value);
    let start = 0;
    const step = target / 40;
    const id = setInterval(() => { start += step; if (start >= target) { setN(target); clearInterval(id); } else setN(start); }, 25);
    return () => clearInterval(id);
  }, [value]);
  return (
    <div className="fade-up">
      <div className="stat-num text-3xl md:text-4xl font-bold text-emerald-900">
        {Math.round(n).toLocaleString("en-IN")}{suffix}
      </div>
      <div className="text-xs uppercase tracking-widest text-emerald-700 mt-1">{label}</div>
    </div>
  );
}

export default function Landing() {
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Digital India · DoCA Initiative
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-emerald-950 leading-[1.1] tracking-tight">
              {t("hero_title")}
            </h1>
            <p className="mt-6 text-lg text-slate-700 max-w-xl leading-relaxed">{t("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button data-testid="hero-get-started" size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white h-12 px-6">
                  {t("get_started")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/mandis">
                <Button data-testid="hero-view-prices" variant="outline" size="lg" className="border-emerald-700 text-emerald-800 h-12 px-6 bg-white hover:bg-emerald-50">
                  {t("view_prices")}
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              <Stat value="87450" label={t("farmers_registered")} />
              <Stat value="12" label={t("mandis_onboarded")} />
              <Stat value="524300" label={t("quintals_procured")} />
              <Stat value="1287" label={t("paid_via_dbt")} suffix=" Cr" />
            </div>
          </div>

          <div className="lg:col-span-5 fade-up">
            <div className="relative">
              <img src={HERO_IMG} alt="Farmer harvest" className="rounded-3xl shadow-2xl border-8 border-white object-cover w-full h-[420px]" />
              <Card className="absolute -bottom-6 -left-6 w-64 bg-white border-emerald-200 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-xs uppercase tracking-widest text-emerald-700 mb-1">{t("active_token")}</div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white grid place-items-center font-display text-2xl font-bold pulse-ring">A47</div>
                    <div>
                      <div className="text-sm font-semibold">Khanna Mandi</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />~14 {t("minutes")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="absolute -top-6 -right-4 w-56 bg-white border-amber-200 shadow-xl">
                <CardContent className="p-4">
                  <div className="text-xs uppercase tracking-widest text-amber-700 mb-1">DBT {t("paid")}</div>
                  <div className="text-xl font-display font-bold text-emerald-900">₹ 48,750</div>
                  <div className="text-xs text-slate-500 mt-0.5">Ref: DBT-482910</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">4 Simple Steps</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mt-2">{t("how_it_works")}</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Users, title: t("step1_title"), desc: t("step1_desc"), color: "emerald" },
            { icon: TrendingUp, title: t("step2_title"), desc: t("step2_desc"), color: "amber" },
            { icon: Calendar, title: t("step3_title"), desc: t("step3_desc"), color: "blue" },
            { icon: CreditCard, title: t("step4_title"), desc: t("step4_desc"), color: "emerald" },
          ].map((s, i) => (
            <Card key={i} className="lift bg-white border-emerald-100">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-2xl grid place-items-center mb-4 ${s.color === "amber" ? "bg-amber-100 text-amber-700" : s.color === "blue" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-400 mb-1">STEP {i + 1}</div>
                <h3 className="font-display font-semibold text-lg text-emerald-950">{s.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-emerald-50/50 border-y border-emerald-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mb-10">{t("features")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Calendar, t: "Real-time Slot Booking", d: "Reserve your procurement slot in advance and skip long queues at the mandi." },
              { icon: BellRing, t: "SMS + App Alerts", d: "Get instant notifications when your turn approaches, procurement completes, or payment is disbursed." },
              { icon: Building2, t: "All-India Mandi Directory", d: "Compare live prices across mandis in your region and beyond to get the best rates." },
              { icon: CreditCard, t: "Direct Benefit Transfer", d: "Aadhaar-linked instant DBT payment directly to your bank account after grading." },
              { icon: ShieldCheck, t: "Transparent Quality Grading", d: "Digital quality assay with A/B/C grades and tamper-proof digital receipts." },
              { icon: FileText, t: "Multi-lingual Interface", d: "English, हिन्दी, ਪੰਜਾਬੀ - built for every farmer of Bharat." },
            ].map((f, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border border-emerald-100 lift">
                <f.icon className="w-8 h-8 text-emerald-700 mb-3" />
                <div className="font-display font-semibold text-emerald-950">{f.t}</div>
                <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-emerald-950 mb-8 text-center">{t("faq")}</h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            { q: "Who can register on this portal?", a: "Any farmer with a valid Aadhaar and a bank account linked to their Aadhaar can register to sell notified crops at MSP." },
            { q: "Is there any fee to book a slot?", a: "No. Slot booking, procurement, quality grading, and DBT payment are 100% free of cost." },
            { q: "How is the payment made?", a: "Payment is credited to your Aadhaar-linked bank account through Direct Benefit Transfer (DBT) within 48-72 hours of procurement completion." },
            { q: "Can I cancel a booked slot?", a: "Yes, you can cancel any slot before it enters processing state. Cancelling helps other farmers get earlier tokens." },
            { q: "What if I miss my slot?", a: "You will be automatically moved to the next available slot. Repeated no-shows may attract cooldown restrictions." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} data-testid={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium text-emerald-950">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-10 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl md:text-3xl font-bold">Ready to sell your harvest with dignity?</h3>
            <p className="text-emerald-100 mt-2">Join 87,000+ farmers already using DoCA e-Procurement.</p>
          </div>
          <Link to="/register">
            <Button data-testid="cta-register" size="lg" className="bg-amber-500 hover:bg-amber-600 text-white h-12 px-8">
              <Tractor className="w-5 h-5 mr-2" /> {t("get_started")}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
