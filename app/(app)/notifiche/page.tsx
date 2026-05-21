import Link from "next/link";
import { requireUser } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { etichettaGiornoRelativo, formatData } from "@/lib/utils/date";
import { segnaNotificaComeLetta, segnaTutteComeLette } from "./actions";

export const dynamic = "force-dynamic";

interface CategoriaMeta {
  label: string;
  icona: string;
  color: string;
  hrefFn?: (riferimentoId: string) => string;
}

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
  const { supabase, user } = await requireUser();

  interface NotificaRow {
    id: string;
    categoria: string;
    riferimento_id: string;
    inviata_il: string;
    letta_il: string | null;
  }

  const { data } = await supabase
    .from("notifiche_inviate")
    .select("id, categoria, riferimento_id, inviata_il, letta_il")
    .eq("user_id", user.id)
    .order("inviata_il", { ascending: false })
    .limit(80);

  const items: NotificaRow[] = (data as unknown as NotificaRow[]) ?? [];
  const unreadCount = items.filter((item) => item.letta_il === null).length;

  const grouped = new Map<string, NotificaRow[]>();
  for (const n of items) {
    const key = n.inviata_il.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(n);
  }

  return (
    <>
      <Header
        title="Notifiche"
        subtitle={
          items && items.length > 0
            ? unreadCount > 0
              ? `${unreadCount} da leggere · ultimi ${items.length} avvisi`
              : `Ultimi ${items.length} avvisi inviati`
            : "Storico avvisi"
        }
      />
      <ScreenContainer>
        {!items || items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Nessuna notifica ancora"
            subtitle="Le notifiche inviate (push e email) appariranno qui."
          />
        ) : (
          <>
            {unreadCount > 0 && (
              <form action={segnaTutteComeLette} className="flex justify-end mb-3">
                <Button type="submit" variant="secondary" size="md" className="text-xs px-3 py-2">
                  Segna tutte come lette
                </Button>
              </form>
            )}
            {Array.from(grouped.entries()).map(([date, group]) => (
              <div key={date}>
                <div className="text-[13px] font-bold text-[var(--text-secondary)] mt-4 mb-2">
                  {etichettaGiornoRelativo(date)} · {formatData(date)}
                </div>
                <div className="flex flex-col gap-1.5">
                  {(group ?? []).map((n) => {
                    const meta = META[n.categoria] ?? {
                      label: n.categoria,
                      icona: "🔔",
                      color: "#F0EDE8",
                    };
                    const href = meta.hrefFn?.(n.riferimento_id) ?? null;
                    const isUnread = n.letta_il === null;

                    return (
                      <Card
                        key={n.id}
                        className="flex items-center gap-3 py-2.5 px-3.5"
                        style={{
                          background: isUnread ? "#FFF7DD" : undefined,
                          borderColor: isUnread ? "#FFE07A66" : undefined,
                        }}
                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${meta.color}44` }}
                        >
                          {meta.icona}
                        </span>
                        <div className="flex-1 min-w-0">
                          {href ? (
                            <Link href={href} className="block">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <span>{meta.label}</span>
                                {isUnread && (
                                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {new Date(n.inviata_il).toLocaleTimeString(
                                  "it-IT",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </Link>
                          ) : (
                            <>
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <span>{meta.label}</span>
                                {isUnread && (
                                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {new Date(n.inviata_il).toLocaleTimeString(
                                  "it-IT",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {isUnread ? (
                          <form action={segnaNotificaComeLetta} className="flex-shrink-0">
                            <input type="hidden" name="id" value={n.id} />
                            <Button
                              type="submit"
                              variant="icon"
                              aria-label="Segna come letta"
                              className="text-[var(--primary)] text-lg"
                            >
                              ✓
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0">
                            Letta
                          </span>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-center text-xs text-[var(--text-secondary)] mt-6 italic">
              Mostriamo solo gli ultimi 80 avvisi degli ultimi 30 giorni.
            </p>
          </>
        )}
      </ScreenContainer>
    </>
  );
}
