import { requireAdminPollaio, requireUser } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificheList, type NotificaItem } from "./NotificheList";

export const dynamic = "force-dynamic";

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
        <NotificheList items={items} unreadCount={unreadCount} />
      )}
    </ScreenContainer>
  );
}
