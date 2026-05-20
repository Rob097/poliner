import Link from "next/link";
import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { PollaioSwitcher } from "@/components/layout/PollaioSwitcher";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { AlertCard } from "@/components/ui/AlertCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { fetchMeteo, getAlbaTramonto, hasCoords, type MeteoData } from "@/lib/utils/meteo";
import { consiglioStagionale } from "@/lib/utils/stagione";
import {
  calcolaStatiManutenzione,
  type VoceManutenzione,
} from "@/lib/utils/manutenzione";
import { calcolaScadenza } from "@/lib/utils/uova";
import { formatDataCompleta } from "@/lib/utils/date";
import { AperturaChiusuraCard } from "@/components/home/AperturaChiusuraCard";

export const dynamic = "force-dynamic";

interface Alert {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  href: string;
}

export default async function HomePage() {
  const { supabase, user, pollaio, pollaiConRuolo, ruolo } = await requirePollaio();
  const oggiIso = new Date().toISOString().slice(0, 10);

  // ── Dati in parallelo ───────────────────────────────────
  const [
    uovaDispRes,
    uovaOggiRes,
    gallineCountRes,
    galloCountRes,
    vociAttiveRes,
    manutRes,
    saluteAttiviRes,
    uovaTutte,
    scorteRes,
    promemoriaRes,
    uscitaOggiRes,
    notificheNonLetteRes,
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
      .from("manutenzioni_voci")
      .select("id, nome, dove, icona, frequenza_giorni, consiglio_id, attivo")
      .eq("pollaio_id", pollaio.id)
      .eq("attivo", true),
    supabase
      .from("manutenzioni")
      .select("id, voce_id, data")
      .eq("pollaio_id", pollaio.id)
      .order("data", { ascending: false }),
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
    supabase
      .from("log_uscite")
      .select("id, ora_uscita, ora_rientro")
      .eq("pollaio_id", pollaio.id)
      .eq("data", oggiIso)
      .maybeSingle(),
    supabase
      .from("notifiche_inviate")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("letta_il", null),
  ]);

  // ── Manutenzioni: stati dalle voci attive ───────────────
  type VoceRow = {
    id: string;
    nome: string;
    dove: string | null;
    icona: string;
    frequenza_giorni: number;
    consiglio_id: string | null;
    attivo: boolean;
  };
  type LogRow = { id: string; voce_id: string; data: string };
  const voci: VoceManutenzione[] = ((vociAttiveRes.data ?? []) as unknown as VoceRow[]).map((v) => ({
    id: v.id,
    nome: v.nome,
    dove: v.dove,
    icona: v.icona,
    frequenza_giorni: v.frequenza_giorni,
    consiglio_id: v.consiglio_id,
    attivo: v.attivo,
  }));
  const ultimoPerVoce = new Map<string, string>();
  for (const m of (manutRes.data ?? []) as unknown as LogRow[]) {
    if (!ultimoPerVoce.has(m.voce_id)) ultimoPerVoce.set(m.voce_id, m.data);
  }
  const stati = calcolaStatiManutenzione(voci, ultimoPerVoce);

  // ── Alerts ──────────────────────────────────────────────
  const alerts: Alert[] = [];

  // Manutenzioni scadute (solo se la voce è stata almeno fatta una volta:
  // evitiamo di mostrare alert per voci appena create che non hanno log)
  for (const s of stati
    .filter((x) => x.stato === "scaduta" && x.ultimoIntervento !== null)
    .slice(0, 3)) {
    alerts.push({
      icon: "⚠️",
      title: `${s.voce.nome} in ritardo`,
      subtitle: `Da ${s.giorniDaUltimo} giorni`,
      color: "#E8678A",
      href: "/manutenzione",
    });
  }
  // Manutenzioni in scadenza
  for (const s of stati.filter((x) => x.stato === "in_scadenza").slice(0, 2)) {
    alerts.push({
      icon: "🔔",
      title: `${s.voce.nome} tra poco`,
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
  let alba: string | null = null;
  let tramonto: string | null = null;
  if (hasCoords(pollaio)) {
    try {
      [meteo, { alba, tramonto }] = await Promise.all([
        fetchMeteo(pollaio.posizione_lat!, pollaio.posizione_lng!),
        getAlbaTramonto(pollaio.posizione_lat!, pollaio.posizione_lng!),
      ]);
    } catch {
      meteo = null;
    }
  }

  // Stato uscita di oggi
  type UscitaRow = { id: string; ora_uscita: string | null; ora_rientro: string | null };
  const uscitaOggi = (uscitaOggiRes.data ?? null) as UscitaRow | null;

  const consiglio = consiglioStagionale();
  const disponibili = uovaDispRes.count ?? 0;
  const oggiUova = uovaOggiRes.count ?? 0;
  const gallineN = gallineCountRes.count ?? 0;
  const galloN = galloCountRes.count ?? 0;
  const notificheDaLeggere = notificheNonLetteRes.count ?? 0;
  const dateStr = formatDataCompleta(new Date());

  return (
    <>
      <Header
        subtitle={<PollaioSwitcher pollai={pollaiConRuolo} attivoId={pollaio.id} prominent />}
        right={
          <Link
            href="/notifiche"
            className="relative p-1.5 -mr-1.5"
            aria-label={
              notificheDaLeggere > 0
                ? `Notifiche, ${notificheDaLeggere} da leggere`
                : "Notifiche"
            }
          >
            <span className="text-xl">🔔</span>
            {notificheDaLeggere > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8678A] text-white text-[10px] font-bold leading-[18px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
                {notificheDaLeggere > 99 ? "99+" : notificheDaLeggere}
              </span>
            )}
          </Link>
        }
      />
      <ScreenContainer>
        <div className="text-[13px] text-[var(--text-secondary)] mt-1 mb-2">
          {dateStr}
        </div>
        {/* Widget meteo */}
        {meteo ? <MeteoWidget meteo={meteo} /> : <MeteoMissing pollaioId={pollaio.id} />}

        {/* Apertura/chiusura pollaio */}
        <div className="mt-3">
          <AperturaChiusuraCard
            oraUscita={uscitaOggi?.ora_uscita ?? null}
            oraRientro={uscitaOggi?.ora_rientro ?? null}
            alba={alba}
            tramonto={tramonto}
            isAdmin={ruolo === "admin"}
          />
        </div>

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
