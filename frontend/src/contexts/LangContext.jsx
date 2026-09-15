import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "@/lib/i18n";

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.body.className = `lang-${lang}`;
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
