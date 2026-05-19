import Link from "next/link";
import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { AlertCard } from "@/components/ui/AlertCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { fetchMeteo, hasCoords, type MeteoData } from "@/lib/utils/meteo";
import { consiglioStagionale } from "@/lib/utils/stagione";
import { calcolaStatiManutenzione } from "@/lib/utils/manutenzione";
import { calcolaScadenza } from "@/lib/utils/uova";
import { TIPI_MANUTENZIONE, type TipoManutenzioneId } from "@/lib/constants/manutenzione";
import { formatDataCompleta } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

interface Alert {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  href: string;
}

export default async function HomePage() {
  const { supabase, pollaio } = await requirePollaio();

  // ── Dati in parallelo ───────────────────────────────────
  const [
    uovaDispRes,
    uovaOggiRes,
    gallineCountRes,
    galloCountRes,
    manutRes,
    configRes,
    saluteAttiviRes,
    uovaTutte,
    scorteRes,
    promemoriaRes,
  ] = await Promise.all([
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaio.id)
      .eq("stato", "disponibile"),
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaio.id)
      .gte("data_deposizione", startOfTodayIso()),
    supabase
      .from("animali")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaio.id)
      .eq("tipo", "gallina")
      .eq("attivo", true),
    supabase
      .from("animali")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaio.id)
      .eq("tipo", "gallo")
      .eq("attivo", true),
    supabase
      .from("manutenzioni")
      .select("id, tipo, data")
      .eq("pollaio_id", pollaio.id)
      .order("data", { ascending: false }),
    supabase
      .from("manutenzioni_config")
      .select("tipo, frequenza_giorni")
      .eq("pollaio_id", pollaio.id),
    supabase
      .from("eventi_salute")
      .select("id, animale_id, descrizione, tipo, animali(nome)")
      .eq("pollaio_id", pollaio.id)
      .eq("stato", "in_corso")
      .limit(5),
    supabase
      .from("uova")
      .select("id, data_deposizione, conservazione")
      .eq("pollaio_id", pollaio.id)
      .eq("stato", "disponibile"),
    supabase
      .from("scorte_cibo")
      .select("id, nome, quantita, soglia_avviso")
      .eq("pollaio_id", pollaio.id),
    supabase
      .from("note")
      .select("id, testo, promemoria_data")
      .eq("pollaio_id", pollaio.id)
      .eq("archiviata", false)
      .not("promemoria_data", "is", null)
      .lte("promemoria_data", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("promemoria_data", { ascending: true })
      .limit(3),
  ]);

  // ── Manutenzioni: ultimo per tipo + override ────────────
  const ultimoPerTipo = new Map<TipoManutenzioneId, string>();
  for (const m of manutRes.data ?? []) {
    if (!ultimoPerTipo.has(m.tipo as TipoManutenzioneId)) {
      ultimoPerTipo.set(m.tipo as TipoManutenzioneId, m.data);
    }
  }
  const freqOverride = new Map<TipoManutenzioneId, number>();
  for (const c of configRes.data ?? []) {
    freqOverride.set(c.tipo as TipoManutenzioneId, c.frequenza_giorni);
  }
  const stati = calcolaStatiManutenzione(ultimoPerTipo, freqOverride);

  // ── Alerts ──────────────────────────────────────────────
  const alerts: Alert[] = [];

  // Manutenzioni scadute
  for (const s of stati.filter((x) => x.stato === "scaduta").slice(0, 3)) {
    alerts.push({
      icon: "⚠️",
      title: `${s.tipo.nome} in ritardo`,
      subtitle: `Da ${s.giorniDaUltimo} giorni`,
      color: "#E8678A",
      href: "/manutenzione",
    });
  }
  // Manutenzioni in scadenza
  for (const s of stati.filter((x) => x.stato === "in_scadenza").slice(0, 2)) {
    alerts.push({
      icon: "🔔",
      title: `${s.tipo.nome} tra poco`,
      subtitle: `Tra ${s.giorniRimanenti} giorni`,
      color: "#FFE07A",
      href: "/manutenzione",
    });
  }
  // Galline con problemi attivi
  for (const e of saluteAttiviRes.data ?? []) {
    const animale = e.animali as unknown as
      | { nome: string }
      | { nome: string }[]
      | null;
    const nome = Array.isArray(animale)
      ? animale[0]?.nome
      : animale?.nome ?? "Una gallina";
    alerts.push({
      icon: "❤️‍🩹",
      title: `${nome} ha un problema`,
      subtitle: e.descrizione ?? e.tipo,
      color: "#E8678A",
      href: `/galline/${e.animale_id}`,
    });
  }
  // Uova in scadenza
  const scadenzaSettings = {
    ambiente: pollaio.conservazione_ambiente_giorni,
    frigo: pollaio.conservazione_frigo_giorni,
  };
  const inScadenzaCount = (uovaTutte.data ?? []).filter((u) => {
    const s = calcolaScadenza(
      u.data_deposizione,
      u.conservazione as "ambiente" | "frigo",
      scadenzaSettings,
    );
    return s.livello === "in_scadenza" || s.livello === "urgente";
  }).length;
  if (inScadenzaCount > 0) {
    alerts.push({
      icon: "🥚",
      title: `${inScadenzaCount} uova in scadenza`,
      subtitle: "Usale o regalale presto!",
      color: "#FFE07A",
      href: "/uova",
    });
  }
  // Scorte basse
  const scorteBasse = (scorteRes.data ?? []).filter(
    (s) =>
      s.quantita !== null &&
      s.soglia_avviso !== null &&
      Number(s.quantita) <= Number(s.soglia_avviso),
  );
  for (const s of scorteBasse.slice(0, 2)) {
    alerts.push({
      icon: "📦",
      title: `${s.nome} sta finendo`,
      subtitle: `Quantità sotto soglia`,
      color: "#FFE07A",
      href: "/scorte",
    });
  }
  // Promemoria in arrivo (< 24h) o scaduti
  const now = Date.now();
  for (const p of promemoriaRes.data ?? []) {
    if (!p.promemoria_data) continue;
    const dt = new Date(p.promemoria_data).getTime();
    const diffH = Math.round((dt - now) / (1000 * 60 * 60));
    const subtitle =
      diffH < 0
        ? `Promemoria scaduto ${Math.abs(diffH)}h fa`
        : diffH === 0
          ? "Adesso"
          : `Tra ${diffH}h`;
    alerts.push({
      icon: "🔔",
      title: p.testo.slice(0, 60) + (p.testo.length > 60 ? "..." : ""),
      subtitle,
      color: diffH < 0 ? "#E8678A" : "#E8DAFF",
      href: "/note",
    });
  }

  // ── Meteo (fail-safe: home non si rompe se Open-Meteo è giù) ──
  let meteo: MeteoData | null = null;
  if (hasCoords(pollaio)) {
    try {
      meteo = await fetchMeteo(pollaio.posizione_lat!, pollaio.posizione_lng!);
    } catch {
      meteo = null;
    }
  }

  const consiglio = consiglioStagionale();
  const disponibili = uovaDispRes.count ?? 0;
  const oggiUova = uovaOggiRes.count ?? 0;
  const gallineN = gallineCountRes.count ?? 0;
  const galloN = galloCountRes.count ?? 0;
  const dateStr = formatDataCompleta(new Date());

  return (
    <>
      <Header
        title={pollaio.nome}
        subtitle={dateStr}
        right={
          <Link
            href="/notifiche"
            className="p-1.5 -mr-1.5"
            aria-label="Notifiche"
          >
            <span className="text-xl">🔔</span>
          </Link>
        }
      />
      <ScreenContainer>
        {/* Widget meteo */}
        {meteo ? <MeteoWidget meteo={meteo} /> : <MeteoMissing pollaioId={pollaio.id} />}

        {/* Counter uova + galline */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Link href="/uova">
            <Card
              clickable
              className="text-center"
              style={{
                background: "var(--primary-lighter)",
                border: "1px solid var(--primary-light)",
              }}
            >
              <div className="text-4xl">🥚</div>
              <div className="text-4xl font-extrabold text-[var(--primary)]">
                {disponibili}
              </div>
              <div className="text-[13px] text-[var(--primary)] font-semibold">
                uova disponibili
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                +{oggiUova} oggi
              </div>
            </Card>
          </Link>
          <Link href="/galline">
            <Card
              clickable
              className="text-center"
              style={{
                background: "#B5D4B520",
                border: "1px solid #B5D4B544",
              }}
            >
              <div className="text-4xl">🐔</div>
              <div className="text-4xl font-extrabold" style={{ color: "#5a8a5a" }}>
                {gallineN}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#5a8a5a" }}>
                galline
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                {galloN > 0 ? `+${galloN} gallo` : "no gallo"}
              </div>
            </Card>
          </Link>
        </div>

        {/* Azioni rapide */}
        <SectionTitle>Azioni rapide</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Aggiungi\nuovo", icon: "🥚", bg: "#FFE4D0", href: "/uova/nuovo" },
            { label: "Segnala\npulizia", icon: "🧹", bg: "#B5D4B5", href: "/manutenzione" },
            { label: "Nota\nrapida", icon: "📝", bg: "#E8DAFF", href: "/note" },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Card clickable className="text-center px-2 py-4 border-none">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2"
                  style={{ background: a.bg }}
                >
                  {a.icon}
                </div>
                <div className="text-xs font-semibold text-text whitespace-pre-line leading-tight">
                  {a.label}
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <>
            <SectionTitle>Avvisi</SectionTitle>
            <div className="flex flex-col gap-2">
              {alerts.slice(0, 4).map((a, i) => (
                <Link key={i} href={a.href}>
                  <AlertCard
                    icon={a.icon}
                    title={a.title}
                    subtitle={a.subtitle}
                    color={a.color}
                  />
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Consiglio di stagione */}
        <Card
          className="mt-4 flex gap-3 items-start"
          style={{ background: "#B5D4B515", border: "1px solid #B5D4B544" }}
        >
          <span className="text-3xl">{consiglio.icona}</span>
          <div>
            <div className="font-bold text-sm text-text mb-1">
              {consiglio.titolo}
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed m-0">
              {consiglio.messaggio}
            </p>
          </div>
        </Card>
      </ScreenContainer>
    </>
  );
}

function MeteoWidget({ meteo }: { meteo: MeteoData }) {
  const prossimi = meteo.giorni.slice(1, 3);
  return (
    <Link href="/meteo">
      <Card
        clickable
        className="mt-3"
        style={{
          background: "linear-gradient(135deg, #A8D1FF22, #A8D1FF11)",
          border: "1px solid #A8D1FF44",
        }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{meteo.attuale.icona}</span>
            <div>
              <div className="text-2xl font-extrabold text-text">
                {meteo.attuale.temp}°C
              </div>
              <div className="text-[13px] text-[var(--text-secondary)]">
                {meteo.attuale.condizione}
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
            {prossimi.map((p) => (
              <div key={p.date} className="text-center">
                <div className="text-lg mb-0.5">{p.pomeriggio.icona}</div>
                <div className="font-semibold text-text">{p.tempMax}°</div>
                <div>{p.giornoLabel}</div>
              </div>
            ))}
          </div>
        </div>
        {meteo.consiglio && (
          <div
            className="mt-2.5 px-3 py-2 rounded-lg text-[13px] text-text"
            style={{ background: "#A8D1FF22" }}
          >
            {meteo.consiglio}
          </div>
        )}
      </Card>
    </Link>
  );
}

function MeteoMissing({ pollaioId: _pollaioId }: { pollaioId: string }) {
  return (
    <Card
      className="mt-3 flex gap-3 items-start"
      style={{ background: "#FFE07A22", border: "1px solid #FFE07A66" }}
    >
      <span className="text-2xl">📍</span>
      <div className="flex-1">
        <div className="font-semibold text-sm">Posizione non impostata</div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
          Aggiungi la posizione del pollaio dalle{" "}
          <Link href="/impostazioni" className="text-[var(--primary)] font-semibold">
            impostazioni
          </Link>{" "}
          per vedere il meteo.
        </div>
      </div>
    </Card>
  );
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
