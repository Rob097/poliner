import Link from "next/link";
import { requireUser } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { etichettaGiornoRelativo, formatData } from "@/lib/utils/date";

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
};

export default async function NotifichePage() {
  const { supabase, user } = await requireUser();

  interface NotificaRow {
    id: string;
    categoria: string;
    riferimento_id: string;
    inviata_il: string;
  }

  const { data } = await supabase
    .from("notifiche_inviate")
    .select("id, categoria, riferimento_id, inviata_il")
    .eq("user_id", user.id)
    .order("inviata_il", { ascending: false })
    .limit(80);

  const items: NotificaRow[] = (data as unknown as NotificaRow[]) ?? [];

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
            ? `Ultimi ${items.length} avvisi inviati`
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
                    const inner = (
                      <Card className="flex items-center gap-3 py-2.5 px-3.5">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${meta.color}44` }}
                        >
                          {meta.icona}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {meta.label}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {new Date(n.inviata_il).toLocaleTimeString(
                              "it-IT",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                    return href ? (
                      <Link key={n.id} href={href}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
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
