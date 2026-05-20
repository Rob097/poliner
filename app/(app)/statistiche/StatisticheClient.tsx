"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import {
  bucketDi,
  granularitaPerPeriodo,
  sogliaPerPeriodo,
  type PeriodoStats,
} from "@/lib/utils/stats";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";

export interface StatsData {
  uova: { data: string; stato: "disponibile" | "consumato" | "regalato"; animaleId: string | null }[];
  animali: { id: string; nome: string; fotoUrl: string | null; tipo: "gallina" | "gallo" }[];
  spese: { data: string; importo: number; categoria: string | null }[];
  meteo: { data: string; tempMin: number | null; tempMax: number | null }[];
  periodiMuta: { animaleId: string; inizio: string; fine: string | null }[];
}

const COLORS = {
  primary: "#E8678A",
  sage: "#B5D4B5",
  peach: "#FFE4D0",
  lavender: "#E8DAFF",
  butter: "#FFE07A",
  sky: "#A8D1FF",
};

export function StatisticheClient({ data }: { data: StatsData }) {
  const [periodo, setPeriodo] = useState<PeriodoStats>("mese");
  const soglia = useMemo(() => sogliaPerPeriodo(periodo), [periodo]);
  const sogliaIso = soglia?.toISOString() ?? null;

  // ── Filtra per periodo ────────────────────────────────
  const uovaInPeriodo = useMemo(
    () => data.uova.filter((u) => !sogliaIso || u.data >= sogliaIso),
    [data.uova, sogliaIso],
  );
  const speseInPeriodo = useMemo(
    () =>
      data.spese.filter(
        (s) => !sogliaIso || s.data >= sogliaIso.slice(0, 10),
      ),
    [data.spese, sogliaIso],
  );
  const meteoInPeriodo = useMemo(
    () =>
      data.meteo.filter(
        (m) => !sogliaIso || m.data >= sogliaIso.slice(0, 10),
      ),
    [data.meteo, sogliaIso],
  );

  // ── Numeri riassuntivi ────────────────────────────────
  const totUova = uovaInPeriodo.length;
  const totSpese = speseInPeriodo.reduce((s, x) => s + x.importo, 0);
  const totRegalate = uovaInPeriodo.filter((u) => u.stato === "regalato").length;
  const costoPerUovo = totUova > 0 ? totSpese / totUova : null;

  // ── Bucket produzione (settimana o mese) ──────────────
  const gran = granularitaPerPeriodo(periodo);
  const produzionePerBucket = useMemo(() => {
    const m = new Map<string, { key: string; label: string; date: Date; prodotte: number; regalate: number; consumate: number; disponibili: number }>();
    for (const u of uovaInPeriodo) {
      const b = bucketDi(new Date(u.data), gran);
      const cur = m.get(b.key) ?? {
        ...b,
        prodotte: 0,
        regalate: 0,
        consumate: 0,
        disponibili: 0,
      };
      cur.prodotte += 1;
      if (u.stato === "regalato") cur.regalate += 1;
      else if (u.stato === "consumato") cur.consumate += 1;
      else cur.disponibili += 1;
      m.set(b.key, cur);
    }
    return Array.from(m.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [uovaInPeriodo, gran]);

  // ── Destinazione (pie) ────────────────────────────────
  const destinazione = useMemo(() => {
    const disp = uovaInPeriodo.filter((u) => u.stato === "disponibile").length;
    const cons = uovaInPeriodo.filter((u) => u.stato === "consumato").length;
    const reg = uovaInPeriodo.filter((u) => u.stato === "regalato").length;
    return [
      { name: "Disponibili", value: disp, color: COLORS.sage },
      { name: "Consumate", value: cons, color: COLORS.peach },
      { name: "Regalate", value: reg, color: COLORS.lavender },
    ].filter((s) => s.value > 0);
  }, [uovaInPeriodo]);

  // ── Per gallina ───────────────────────────────────────
  const perGallina = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of uovaInPeriodo) {
      if (!u.animaleId) continue;
      m.set(u.animaleId, (m.get(u.animaleId) ?? 0) + 1);
    }
    return data.animali
      .filter((a) => a.tipo === "gallina")
      .map((a) => ({
        ...a,
        uova: m.get(a.id) ?? 0,
      }))
      .sort((a, b) => b.uova - a.uova);
  }, [uovaInPeriodo, data.animali]);
  const maxPerGallina = Math.max(...perGallina.map((g) => g.uova), 1);

  // ── Spese mensili ─────────────────────────────────────
  const spesePerBucket = useMemo(() => {
    const m = new Map<string, { key: string; label: string; date: Date; spese: number }>();
    for (const s of speseInPeriodo) {
      const b = bucketDi(new Date(s.data), gran);
      const cur = m.get(b.key) ?? { ...b, spese: 0 };
      cur.spese += s.importo;
      m.set(b.key, cur);
    }
    return Array.from(m.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [speseInPeriodo, gran]);

  // ── Spese per categoria (pie) ─────────────────────────
  const spesePerCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of speseInPeriodo) {
      const k = s.categoria ?? "Altro";
      m.set(k, (m.get(k) ?? 0) + s.importo);
    }
    const palette = [COLORS.butter, COLORS.sage, COLORS.lavender, COLORS.peach, COLORS.sky, COLORS.primary];
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: palette[i % palette.length],
      }));
  }, [speseInPeriodo]);

  // ── Meteo sovrapposto: produzione + temp_max ──────────
  const meteoOverlay = useMemo(() => {
    // Aggrega temp_max per bucket
    const m = new Map<string, { tempMaxSum: number; tempMaxCount: number }>();
    for (const x of meteoInPeriodo) {
      if (x.tempMax === null) continue;
      const b = bucketDi(new Date(x.data), gran);
      const cur = m.get(b.key) ?? { tempMaxSum: 0, tempMaxCount: 0 };
      cur.tempMaxSum += x.tempMax;
      cur.tempMaxCount += 1;
      m.set(b.key, cur);
    }

    // Combina con produzione per bucket
    return produzionePerBucket.map((p) => {
      const t = m.get(p.key);
      return {
        ...p,
        tempMaxMedia:
          t && t.tempMaxCount > 0
            ? Math.round((t.tempMaxSum / t.tempMaxCount) * 10) / 10
            : null,
      };
    });
  }, [produzionePerBucket, meteoInPeriodo, gran]);

  const hasMeteoData = meteoOverlay.some((m) => m.tempMaxMedia !== null);

  return (
    <ScreenContainer pad={false}>
      <div className="px-4">
        <SegmentedControl
          options={[
            { value: "settimana", label: "Sett" },
            { value: "mese", label: "Mese" },
            { value: "tre_mesi", label: "3M" },
            { value: "anno", label: "Anno" },
            { value: "tutto", label: "Tutto" },
          ]}
          value={periodo}
          onChange={setPeriodo}
        />
      </div>

      <div className="px-4 pt-3 pb-6">
        {/* Riepilogo */}
        <div className="grid grid-cols-3 gap-2">
          <RiepilogoCard value={totUova} label="Uova totali" color={COLORS.primary} />
          <RiepilogoCard
            value={costoPerUovo ? `€${costoPerUovo.toFixed(2)}` : "—"}
            label="Costo/uovo"
            color="#3d6b3d"
          />
          <RiepilogoCard
            value={totRegalate}
            label="Regalate"
            color="#7b5ea7"
          />
        </div>

        {totUova === 0 && totSpese === 0 ? (
          <EmptyState
            icon="📊"
            title="Nessun dato nel periodo"
            subtitle="Inizia a registrare uova e spese per vedere le tue statistiche."
          />
        ) : (
          <>
            {/* Produzione uova */}
            <SectionTitle>Produzione uova</SectionTitle>
            <Card>
              {produzionePerBucket.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={produzionePerBucket}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9E968C" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9E968C" }} allowDecimals={false} />
                    <Tooltip {...tooltipProps()} />
                    <Bar dataKey="prodotte" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  Nessuna uovo nel periodo
                </p>
              )}
              <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
                Media: {produzionePerBucket.length > 0
                  ? Math.round(
                      produzionePerBucket.reduce((s, x) => s + x.prodotte, 0) /
                        produzionePerBucket.length,
                    )
                  : 0}{" "}
                uova / {gran === "settimana" ? "settimana" : "mese"}
              </p>
            </Card>

            {/* Destinazione */}
            <SectionTitle>Destinazione uova</SectionTitle>
            <Card>
              {destinazione.length > 0 ? (
                <div className="flex items-center gap-4 justify-center">
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie
                        data={destinazione}
                        innerRadius={36}
                        outerRadius={60}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {destinazione.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps()} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 text-sm">
                    {destinazione.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ background: d.color }}
                        />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  Nessun dato
                </p>
              )}
            </Card>

            {/* Per gallina */}
            {perGallina.length > 0 && perGallina.some((g) => g.uova > 0) && (
              <>
                <SectionTitle>Per gallina</SectionTitle>
                <Card>
                  <div className="flex flex-col gap-2.5">
                    {perGallina.map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5">
                        <Avatar
                          size={28}
                          src={g.fotoUrl ?? undefined}
                          emoji={!g.fotoUrl ? defaultEmojiFor(g.tipo) : undefined}
                          bg={avatarBgFor(g.id)}
                          name={g.nome}
                        />
                        <div className="text-sm font-semibold w-20 truncate">
                          {g.nome}
                        </div>
                        <div className="flex-1 h-3 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${(g.uova / maxPerGallina) * 100}%`,
                              background: avatarBgFor(g.id),
                            }}
                          />
                        </div>
                        <div className="text-sm font-bold w-6 text-right">
                          {g.uova}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* Meteo sovrapposto */}
            {hasMeteoData && (
              <>
                <SectionTitle>Produzione vs temperatura</SectionTitle>
                <Card>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={meteoOverlay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9E968C" }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#9E968C" }}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#9E968C" }}
                        unit="°"
                      />
                      <Tooltip {...tooltipProps()} />
                      <Bar
                        yAxisId="left"
                        dataKey="prodotte"
                        fill={COLORS.primary}
                        radius={[6, 6, 0, 0]}
                        name="Uova"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="tempMaxMedia"
                        stroke={COLORS.butter}
                        strokeWidth={2.5}
                        dot={{ fill: COLORS.butter, r: 3 }}
                        name="Temp max"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2 italic">
                    Sovrapposizione produzione (barre) e temperatura massima (linea)
                  </p>
                </Card>
              </>
            )}

            {/* Spese */}
            {spesePerBucket.length > 0 && (
              <>
                <SectionTitle>Spese</SectionTitle>
                <Card>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={spesePerBucket}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9E968C" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9E968C" }}
                        unit="€"
                      />
                      <Tooltip {...tooltipProps("€")} />
                      <Bar
                        dataKey="spese"
                        fill={COLORS.butter}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
                    Totale periodo: €{totSpese.toFixed(2)}
                  </p>
                </Card>
              </>
            )}

            {/* Spese per categoria */}
            {spesePerCategoria.length > 1 && (
              <>
                <SectionTitle>Spese per categoria</SectionTitle>
                <Card>
                  <div className="flex items-center gap-4 justify-center">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie
                          data={spesePerCategoria}
                          innerRadius={36}
                          outerRadius={60}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {spesePerCategoria.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipProps("€")} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 text-sm">
                      {spesePerCategoria.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded"
                            style={{ background: d.color }}
                          />
                          <span>{d.name}</span>
                          <span className="text-[var(--text-secondary)]">
                            €{d.value.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </ScreenContainer>
  );
}

function RiepilogoCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <Card className="text-center py-3 px-2">
      <div className="text-xl font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-1">{label}</div>
    </Card>
  );
}

function tooltipProps(suffix = "") {
  return {
    cursor: { fill: "rgba(0,0,0,0.04)" },
    contentStyle: {
      borderRadius: 12,
      border: "1px solid #F0EDE8",
      fontSize: 13,
      fontFamily: '"Quicksand", "Trebuchet MS", sans-serif',
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    },
    labelStyle: { fontWeight: 700, color: "#2E2924" },
    formatter: (value: unknown, name?: unknown) =>
      [`${value}${suffix}`, name as string] as [string, string],
  };
}
