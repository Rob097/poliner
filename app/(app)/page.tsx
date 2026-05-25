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
import { formatDataCompleta } from "@/lib/utils/date";
import { AperturaChiusuraCard } from "@/components/home/AperturaChiusuraCard";
import { loadHomeData } from "@/lib/queries/home";

export const dynamic = "force-dynamic";

interface Alert {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  href: string;
  avvisoKey: string;
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export default async function HomePage() {
  const { supabase, user, pollaio, pollaiConRuolo, ruolo } = await requirePollaio();

  const data = await loadHomeData(supabase, pollaio.id, user.id, {
    ambiente: pollaio.conservazione_ambiente_giorni,
    frigo: pollaio.conservazione_frigo_giorni,
  });

  // ── Alerts ──────────────────────────────────────────────
  const alerts: Alert[] = [];

  // Manutenzioni scadute (solo se la voce è stata almeno fatta una volta:
  // evitiamo di mostrare alert per voci appena create che non hanno log)
  for (const s of data.manutenzioneStati
    .filter((x) => x.stato === "scaduta" && x.ultimoIntervento !== null)
    .slice(0, 3)) {
    alerts.push({
      icon: "⚠️",
      title: `${s.voce.nome} in ritardo`,
      subtitle: `Da ${s.giorniDaUltimo} giorni`,
      color: "#E8678A",
      href: "/manutenzione",
      avvisoKey: `manut_ritardo:${s.voce.id}:${s.ultimoIntervento ?? "mai"}`,
    });
  }
  // Manutenzioni in scadenza
  for (const s of data.manutenzioneStati
    .filter((x) => x.stato === "in_scadenza")
    .slice(0, 2)) {
    alerts.push({
      icon: "🔔",
      title: `${s.voce.nome} tra poco`,
      subtitle: `Tra ${s.giorniRimanenti} giorni`,
      color: "#FFE07A",
      href: "/manutenzione",
      avvisoKey: `manut_imminente:${s.voce.id}:${s.ultimoIntervento ?? "mai"}`,
    });
  }
  // Galline con problemi attivi
  for (const e of data.saluteAttivi) {
    alerts.push({
      icon: "❤️‍🩹",
      title: `${e.nome} ha un problema`,
      subtitle: e.descrizione ?? e.tipo,
      color: "#E8678A",
      href: `/galline/${e.animale_id}`,
      avvisoKey: `salute:${e.id}`,
    });
  }
  // Uova in scadenza
  if (data.uovaInScadenzaIds.length > 0) {
    const hashIds = djb2([...data.uovaInScadenzaIds].sort().join(","));
    alerts.push({
      icon: "🥚",
      title: `${data.uovaInScadenzaIds.length} uova in scadenza`,
      subtitle: "Usale o regalale presto!",
      color: "#FFE07A",
      href: "/uova",
      avvisoKey: `uova_scadenza:${hashIds}`,
    });
  }
  // Scorte basse
  for (const s of data.scorteBasse.slice(0, 2)) {
    alerts.push({
      icon: "📦",
      title: `${s.nome} sta finendo`,
      subtitle: `Quantità sotto soglia`,
      color: "#FFE07A",
      href: "/scorte",
      avvisoKey: `scorte_basse:${s.id}:${s.ultimoRifornimento ?? "mai"}`,
    });
  }
  // Promemoria in arrivo (< 24h) o scaduti
  const now = Date.now();
  for (const p of data.promemoriaImminenti) {
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
      avvisoKey: `promemoria:${p.id}`,
    });
  }

  const alertsVisibili = alerts.filter((a) => !data.avvisiLetti.has(a.avvisoKey));

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
    } catch (e) {
      console.error("[home] meteo:", e);
      meteo = null;
    }
  }

  const consiglio = consiglioStagionale();
  const dateStr = formatDataCompleta(new Date());
  const { counters, uscitaOggi, hhList } = data;

  return (
    <ScreenContainer
      header={(
        <Header
          subtitle={<PollaioSwitcher pollai={pollaiConRuolo} attivoId={pollaio.id} prominent />}
          right={
            ruolo === "admin" ? (
              <Link
                href="/notifiche"
                className="relative p-1.5 -mr-1.5"
                aria-label={
                  counters.notificheDaLeggere > 0
                    ? `Notifiche, ${counters.notificheDaLeggere} da leggere`
                    : "Notifiche"
                }
              >
                <span className="text-xl">🔔</span>
                {counters.notificheDaLeggere > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E8678A] text-white text-[10px] font-bold leading-[18px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
                    {counters.notificheDaLeggere > 99 ? "99+" : counters.notificheDaLeggere}
                  </span>
                )}
              </Link>
            ) : null
          }
        />
      )}
    >
        <div className="text-[13px] text-(--text-secondary) mt-1 mb-2">
          {dateStr}
        </div>
        {/* Widget meteo */}
        {meteo ? <MeteoWidget meteo={meteo} /> : <MeteoMissing />}

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
              <div className="text-4xl font-extrabold text-(--primary)">
                {counters.uovaDisponibili}
              </div>
              <div className="text-[13px] text-(--primary) font-semibold">
                uova disponibili
              </div>
              <div className="text-[11px] text-(--text-secondary) mt-1">
                +{counters.uovaOggi} oggi
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
                {counters.galline}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#5a8a5a" }}>
                galline
              </div>
              <div className="text-[11px] text-(--text-secondary) mt-1">
                {counters.galli > 0 ? `+${counters.galli} gallo` : "no gallo"}
              </div>
            </Card>
          </Link>
        </div>

        {/* Galline in Home Hospital */}
        {hhList.length > 0 && (
          <Link href="/galline?filtro=home-hospital" className="block mt-3">
            <Card
              clickable
              style={{
                background: "#FFE07A22",
                border: "1px solid #FFE07A66",
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <span aria-hidden>🏠</span> In casa (Home Hospital)
                </div>
                <span className="text-xs font-bold text-[#7a5d1a]">{hhList.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {hhList.slice(0, 3).map((g) => (
                  <div key={g.animaleId} className="flex items-center gap-2.5 text-xs">
                    <span className="text-base" aria-hidden>🐔</span>
                    <span className="font-semibold text-text flex-1 truncate">{g.nome}</span>
                    <span className="text-(--text-secondary)">
                      {g.giorni === 0
                        ? "da oggi"
                        : `da ${g.giorni} ${g.giorni === 1 ? "giorno" : "giorni"}`}
                    </span>
                  </div>
                ))}
                {hhList.length > 3 && (
                  <div className="text-[11px] text-(--text-secondary) text-right mt-0.5">
                    +{hhList.length - 3} altre →
                  </div>
                )}
              </div>
            </Card>
          </Link>
        )}

        {/* Azioni rapide */}
        <SectionTitle>Azioni rapide</SectionTitle>
        <div
          className={ruolo === "admin" ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-1 gap-2.5"}
        >
          {(ruolo === "admin"
            ? [
                { label: "Aggiungi\nuovo", icon: "🥚", bg: "#FFE4D0", href: "/uova/nuovo" },
                { label: "Segnala\npulizia", icon: "🧹", bg: "#B5D4B5", href: "/manutenzione" },
                { label: "Nota\nrapida", icon: "📝", bg: "#E8DAFF", href: "/note" },
              ]
            : [
                {
                  label: "Richiedi uova in regalo",
                  icon: "🙏",
                  bg: "#FFD6E0",
                  href: "/uova?richiedi=1",
                },
              ]
          ).map((a) => (
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
        {alertsVisibili.length > 0 && (
          <>
            <SectionTitle>Avvisi</SectionTitle>
            <div className="flex flex-col gap-2">
              {alertsVisibili.slice(0, 4).map((a) => (
                <AlertCard
                  key={a.avvisoKey}
                  icon={a.icon}
                  title={a.title}
                  subtitle={a.subtitle}
                  color={a.color}
                  href={a.href}
                  avvisoKey={a.avvisoKey}
                />
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
            <p className="text-[13px] text-(--text-secondary) leading-relaxed m-0">
              {consiglio.messaggio}
            </p>
          </div>
        </Card>
    </ScreenContainer>
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
              <div className="text-[13px] text-(--text-secondary)">
                {meteo.attuale.condizione}
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-(--text-secondary)">
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

function MeteoMissing() {
  return (
    <Card
      className="mt-3 flex gap-3 items-start"
      style={{ background: "#FFE07A22", border: "1px solid #FFE07A66" }}
    >
      <span className="text-2xl">📍</span>
      <div className="flex-1">
        <div className="font-semibold text-sm">Posizione non impostata</div>
        <div className="text-xs text-(--text-secondary) mt-0.5">
          Aggiungi la posizione del pollaio dalle{" "}
          <Link href="/impostazioni" className="text-(--primary) font-semibold">
            impostazioni
          </Link>{" "}
          per vedere il meteo.
        </div>
      </div>
    </Card>
  );
}
