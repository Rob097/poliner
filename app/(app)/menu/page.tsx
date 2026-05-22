import { requirePollaio } from "@/lib/supabase/queries";
import { MenuClient, type MenuItem } from "./MenuClient";

const ADMIN_ITEMS: MenuItem[] = [
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

const GUEST_ITEMS: MenuItem[] = [
  { id: "membri", label: "Membri", icon: "👥", bg: "#FFE4D0", desc: "Chi partecipa al pollaio", href: "/impostazioni/membri" },
  { id: "impostazioni", label: "Impostazioni", icon: "⚙️", bg: "#F0EDE8", desc: "Profilo e preferenze", href: "/impostazioni" },
];

export default async function MenuPage() {
  const { ruolo } = await requirePollaio();
  const items = ruolo === "admin" ? ADMIN_ITEMS : GUEST_ITEMS;
  return <MenuClient items={items} />;
}
