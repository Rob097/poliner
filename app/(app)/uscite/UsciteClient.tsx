"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import {
  aggiornaOrario,
  creaUscitaManuale,
  eliminaUscita,
} from "@/lib/actions/uscite";
import { dateIsoInTimeZone, etichettaGiornoRelativo, formatData } from "@/lib/utils/date";
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";

export interface UscitaRow {
  id: string;
  data: string; // YYYY-MM-DD
  oraUscita: string | null; // "HH:MM"
  oraRientro: string | null;
  note: string | null;
}

interface Props {
  log: UscitaRow[];
  isAdmin: boolean;
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = Math.floor(minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const GIORNI_BREVI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export function UsciteClient({ log, isAdmin }: Props) {
  const [editing, setEditing] = useState<UscitaRow | null>(null);
  const [showNuovo, setShowNuovo] = useState(false);

  // ── Grafico: media settimanale orari per giorno della settimana ──
  // Considera ultime 4 settimane di dati. X = giorno settimana, Y = ora.
  const chartData = useMemo(() => {
    const ultime4Settimane = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const buckets: Array<{
      day: string;
      uscitaSum: number;
      uscitaCount: number;
      rientroSum: number;
      rientroCount: number;
    }> = GIORNI_BREVI.map((day) => ({
      day,
      uscitaSum: 0,
      uscitaCount: 0,
      rientroSum: 0,
      rientroCount: 0,
    }));

    for (const r of log) {
      const date = new Date(r.data + "T12:00");
      if (date < ultime4Settimane) continue;
      const dow = date.getDay();
      const u = timeToMinutes(r.oraUscita);
      const c = timeToMinutes(r.oraRientro);
      if (u !== null) {
        buckets[dow].uscitaSum += u;
        buckets[dow].uscitaCount += 1;
      }
      if (c !== null) {
        buckets[dow].rientroSum += c;
        buckets[dow].rientroCount += 1;
      }
    }

    // Riordina: Lun, Mar, Mer, ..., Dom
    const ordered = [...buckets.slice(1), buckets[0]];
    return ordered.map((b) => ({
      day: b.day,
      uscita: b.uscitaCount > 0 ? b.uscitaSum / b.uscitaCount / 60 : null,
      rientro: b.rientroCount > 0 ? b.rientroSum / b.rientroCount / 60 : null,
    }));
  }, [log]);

  const hasData = chartData.some((d) => d.uscita !== null || d.rientro !== null);

  const {
    visible: logVisible,
    hasMore: logHasMore,
    remaining: logRemaining,
    loadMore: logLoadMore,
  } = usePagination(log);

  return (
    <>
      {isAdmin && (
        <div className="mt-2">
          <Button variant="secondary" fullWidth onClick={() => setShowNuovo(true)}>
            + Aggiungi giornata
          </Button>
        </div>
      )}

      <SectionTitle>Orario medio (ultime 4 settimane)</SectionTitle>
      {hasData ? (
        <Card>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9E968C" }} />
              <YAxis
                domain={[4, 22]}
                ticks={[6, 9, 12, 15, 18, 21]}
                tickFormatter={(v: number) => `${v}h`}
                tick={{ fontSize: 11, fill: "#9E968C" }}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? minutesToTime(value * 60) : "—"
                }
                labelStyle={{ color: "#2E2924", fontWeight: 600 }}
                contentStyle={{
                  background: "white",
                  border: "1px solid #F0EDE8",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="uscita"
                stroke="#FFC857"
                strokeWidth={3}
                dot={{ r: 4, fill: "#FFC857" }}
                connectNulls
                name="Apertura"
              />
              <Line
                type="monotone"
                dataKey="rientro"
                stroke="#5E5EA8"
                strokeWidth={3}
                dot={{ r: 4, fill: "#5E5EA8" }}
                connectNulls
                name="Chiusura"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[12px] mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FFC857]"></span>
              Apertura
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#5E5EA8]"></span>
              Chiusura
            </span>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-(--text-secondary) text-center py-2 m-0">
            Servono almeno 7 giorni di dati per il grafico
          </p>
        </Card>
      )}

      <SectionTitle>Storico</SectionTitle>
      {log.length === 0 ? (
        <EmptyState
          icon="🌅"
          title="Nessuna giornata registrata"
          subtitle={
            isAdmin
              ? "Apri o chiudi il pollaio dalla home per iniziare a tracciare."
              : "Gli admin non hanno ancora registrato uscite."
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {logVisible.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
                <div className="w-10 h-10 rounded-xl bg-(--primary-lighter) flex items-center justify-center text-lg shrink-0">
                  {r.oraUscita && r.oraRientro ? "🐔" : r.oraUscita ? "☀️" : "🌙"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {etichettaGiornoRelativo(r.data)} · {formatData(r.data)}
                  </div>
                  <div className="text-xs text-(--text-secondary)">
                    {r.oraUscita ? `Aperto ${r.oraUscita}` : "Apertura —"}
                    {r.oraRientro ? ` · Chiuso ${r.oraRientro}` : " · Chiusura —"}
                  </div>
                  {r.note && (
                    <div className="text-xs text-(--text-secondary) italic mt-0.5">
                      {r.note}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="text-(--text-secondary) text-sm"
                    aria-label="Modifica"
                  >
                    ✏️
                  </button>
                )}
              </Card>
            ))}
          </div>
          {logHasMore && <LoadMoreButton onClick={logLoadMore} remaining={logRemaining} />}
        </>
      )}

      {editing && (
        <EditUscitaModal
          uscita={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {showNuovo && <NuovaUscitaModal onClose={() => setShowNuovo(false)} />}
    </>
  );
}

function EditUscitaModal({
  uscita,
  onClose,
}: {
  uscita: UscitaRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [oraUscita, setOraUscita] = useState(uscita.oraUscita ?? "");
  const [oraRientro, setOraRientro] = useState(uscita.oraRientro ?? "");
  const [note, setNote] = useState(uscita.note ?? "");
  const [pending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await aggiornaOrario(uscita.id, {
        oraUscita: oraUscita || null,
        oraRientro: oraRientro || null,
        note: note || null,
      });
      if (res.ok) {
        show("✓ Salvato");
        onClose();
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Eliminare questa giornata?")) return;
    startTransition(async () => {
      const res = await eliminaUscita(uscita.id);
      if (res.ok) {
        show("Eliminata");
        onClose();
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  return (
    <Modal title={`${formatData(uscita.data)}`} onClose={onClose}>
      <form onSubmit={handleSave}>
        <FormField label="Ora apertura">
          <Input
            type="time"
            value={oraUscita}
            onChange={(e) => setOraUscita(e.target.value)}
          />
        </FormField>
        <FormField label="Ora chiusura">
          <Input
            type="time"
            value={oraRientro}
            onChange={(e) => setOraRientro(e.target.value)}
          />
        </FormField>
        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder='Es. "Apertura ritardata per pioggia"'
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="block w-full text-sm text-[#c0435a] py-3 mt-2"
        >
          Elimina giornata
        </button>
      </form>
    </Modal>
  );
}

function NuovaUscitaModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [data, setData] = useState(dateIsoInTimeZone());
  const [oraUscita, setOraUscita] = useState("");
  const [oraRientro, setOraRientro] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oraUscita && !oraRientro) {
      show("Inserisci almeno un orario.");
      return;
    }
    startTransition(async () => {
      const res = await creaUscitaManuale({
        data,
        oraUscita: oraUscita || null,
        oraRientro: oraRientro || null,
        note: note || null,
      });
      if (res.ok) {
        show("✓ Giornata aggiunta");
        onClose();
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  return (
    <Modal title="Aggiungi giornata" onClose={onClose}>
      <form onSubmit={handleSave}>
        <FormField label="Data">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Ora apertura">
          <Input
            type="time"
            value={oraUscita}
            onChange={(e) => setOraUscita(e.target.value)}
          />
        </FormField>
        <FormField label="Ora chiusura">
          <Input
            type="time"
            value={oraRientro}
            onChange={(e) => setOraRientro(e.target.value)}
          />
        </FormField>
        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Modal>
  );
}
