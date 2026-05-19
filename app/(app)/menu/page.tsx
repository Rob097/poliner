"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  bg: string;
  desc: string;
  href: string;
}

const ITEMS: MenuItem[] = [
  { id: "manutenzione", label: "Manutenzione", icon: "🧹", bg: "#B5D4B5", desc: "Pulizie e interventi", href: "/manutenzione" },
  { id: "meteo", label: "Meteo", icon: "⛅", bg: "#A8D1FF", desc: "Previsioni e storico", href: "/meteo" },
  { id: "spese", label: "Spese", icon: "💶", bg: "#FFE07A", desc: "Registro e costi", href: "/spese" },
  { id: "scorte", label: "Scorte cibo", icon: "📦", bg: "#FFE4D0", desc: "Inventario alimentare", href: "/scorte" },
  { id: "lista-spesa", label: "Lista spesa", icon: "🛒", bg: "#FFD6E0", desc: "Cose da comprare", href: "/lista-spesa" },
  { id: "note", label: "Note", icon: "📝", bg: "#E8DAFF", desc: "Appunti e promemoria", href: "/note" },
  { id: "rubrica", label: "Rubrica", icon: "👥", bg: "#FFE4D0", desc: "Contatti e regali", href: "/rubrica" },
  { id: "statistiche", label: "Statistiche", icon: "📊", bg: "#A8D1FF", desc: "Grafici e analisi", href: "/statistiche" },
  { id: "impostazioni", label: "Impostazioni", icon: "⚙️", bg: "#F0EDE8", desc: "Profilo e preferenze", href: "/impostazioni" },
];

export default function MenuPage() {
  const router = useRouter();

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Header title="Menu" />
      <ScreenContainer>
        <div className="grid grid-cols-2 gap-2.5">
          {ITEMS.map((item) => (
            <Card
              key={item.id}
              clickable
              onClick={() => router.push(item.href)}
              className="text-center px-3 py-5"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2.5"
                style={{ background: `${item.bg}44` }}
              >
                {item.icon}
              </div>
              <div className="font-bold text-sm text-text">{item.label}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.desc}</div>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Button variant="secondary" fullWidth onClick={onLogout} className="text-[#c0435a]">
            {"Esci dall'account"}
          </Button>
        </div>
      </ScreenContainer>
    </>
  );
}
