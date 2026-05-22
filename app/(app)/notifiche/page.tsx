import { requireAdminPollaio, requireUser } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificheList, type NotificaItem, type CategoriaMeta } from "./NotificheList";

export const dynamic = "force-dynamic";

const META: Record<string, CategoriaMeta> = {
  promemoria: {
    label: "Promemoria",
    icona: "🔔",
    color: "#E8DAFF",
    hrefFn: () => "/note",
  },
  uova_scadenza: {
    label: "Uova in scadenza",
    icona: "🥚",
    color: "#FFE07A",
    hrefFn: () => "/uova",
  },
  manutenzione: {
    label: "Manutenzione",
    icona: "🧹",
    color: "#B5D4B5",
    hrefFn: () => "/manutenzione",
  },
  trattamenti: {
    label: "Trattamento",
    icona: "💊",
    color: "#FFD6E0",
    hrefFn: () => "/galline",
  },
  scorte: {
    label: "Scorte basse",
    icona: "📦",
    color: "#FFE4D0",
    hrefFn: () => "/scorte",
  },
  meteo: {
    label: "Meteo",
    icona: "⛅",
    color: "#D9EEF8",
    hrefFn: () => "/meteo",
  },
  chiusura_pollaio: {
    label: "Chiusura pollaio",
    icona: "🌙",
    color: "#E6E0FF",
    hrefFn: () => "/",
  },
  fine_produzione: {
    label: "Fine produzione",
    icona: "🐔",
    color: "#FFF0D6",
    hrefFn: () => "/galline",
  },
  muta_lunga: {
    label: "Muta lunga",
    icona: "🪶",
    color: "#F0EDE8",
    hrefFn: (riferimentoId: string) => `/galline/${riferimentoId.split("-")[0]}`,
  },
};

export default async function NotifichePage() {
  await requireAdminPollaio();
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("notifiche_inviate")
    .select("id, categoria, riferimento_id, inviata_il, letta_il")
    .eq("user_id", user.id)
    .order("inviata_il", { ascending: false })
    .limit(80);

  const items: NotificaItem[] = (data as unknown as NotificaItem[]) ?? [];
  const unreadCount = items.filter((item) => item.letta_il === null).length;

  return (
    <ScreenContainer
      header={(
        <Header
          title="Notifiche"
          subtitle={
            items.length > 0
              ? unreadCount > 0
                ? `${unreadCount} da leggere · ultimi ${items.length} avvisi`
                : `Ultimi ${items.length} avvisi inviati`
              : "Storico avvisi"
          }
        />
      )}
    >
      {items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nessuna notifica ancora"
          subtitle="Le notifiche inviate appariranno qui."
        />
      ) : (
        <NotificheList items={items} unreadCount={unreadCount} meta={META} />
      )}
    </ScreenContainer>
  );
}
