import Link from "next/link";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { fetchMeteo, getForecastUrl, hasCoords } from "@/lib/utils/meteo";
import { salvaMeteoStorico } from "@/lib/utils/meteo-storico";

export const dynamic = "force-dynamic";

export default async function MeteoPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  if (!hasCoords(pollaio)) {
    return (
      <ScreenContainer header={<Header title="Meteo" />}>
        <EmptyState
          icon="📍"
          title="Posizione non impostata"
          subtitle="Per mostrarti il meteo ci serve la posizione del pollaio. Aggiungila dalle impostazioni."
        />
        <div className="text-center mt-2">
          <Link href="/impostazioni">
            <Button>Vai alle impostazioni</Button>
          </Link>
        </div>
      </ScreenContainer>
    );
  }

  let meteo;
  try {
    meteo = await fetchMeteo(pollaio.posizione_lat!, pollaio.posizione_lng!);
  } catch (e) {
    console.error("Errore Open-Meteo", e);
    return (
      <ScreenContainer header={<Header title="Meteo" />}>
        <EmptyState
          icon="🌫️"
          title="Meteo non disponibile"
          subtitle="Ops, non sono riuscita a recuperare le previsioni. Riprova tra poco."
        />
      </ScreenContainer>
    );
  }

  // Fire-and-forget: salva snapshot di oggi nello storico per la sezione Statistiche
  const oggi = meteo.giorni.find((g) => g.giornoLabel === "Oggi");
  void salvaMeteoStorico(supabase, pollaio.id, oggi ?? null);
  const forecastUrl = getForecastUrl(pollaio.posizione_nome);

  return (
    <ScreenContainer
      header={(
        <Header
          title="Meteo"
          subtitle={pollaio.posizione_nome ?? "La tua posizione"}
        />
      )}
    >
        {/* Attuale */}
        <Card
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #A8D1FF22, #A8D1FF08)",
            border: "1px solid #A8D1FF44",
          }}
        >
          <div className="text-6xl">{meteo.attuale.icona}</div>
          <div className="text-5xl font-extrabold text-text">
            {meteo.attuale.temp}°C
          </div>
          <div className="text-[15px] text-(--text-secondary)">
            {meteo.attuale.condizione}
          </div>
          <div className="flex justify-center gap-5 mt-3 text-[13px] text-(--text-secondary)">
            <span>💧 {meteo.attuale.umidita}%</span>
            <span>💨 {meteo.attuale.vento} km/h</span>
            <span>🌡️ Percepita {meteo.attuale.percepita}°</span>
          </div>
        </Card>

        {/* Avvisi automatici */}
        {meteo.avvisi.length > 0 && (
          <>
            <SectionTitle>Avvisi</SectionTitle>
            <div className="flex flex-col gap-2">
              {meteo.avvisi.map((a, i) => (
                <Card
                  key={i}
                  className="flex items-start gap-3"
                  style={{
                    background:
                      a.livello === "critical"
                        ? "#FFD6E044"
                        : a.livello === "warning"
                          ? "#FFE07A22"
                          : "#A8D1FF22",
                    border: `1px solid ${
                      a.livello === "critical"
                        ? "#c0435a44"
                        : a.livello === "warning"
                          ? "#FFE07A66"
                          : "#A8D1FF44"
                    }`,
                  }}
                >
                  <span className="text-xl">{a.icona}</span>
                  <p className="text-[13px] text-text leading-relaxed">{a.testo}</p>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Previsioni */}
        {forecastUrl && (
          <Link
            href={forecastUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center text-sm font-semibold text-(--primary) underline-offset-2 hover:underline"
          >
            Vedi previsioni complete su 3B Meteo
          </Link>
        )}
        <SectionTitle>Previsioni</SectionTitle>
        <div className="flex flex-col gap-2">
          {meteo.giorni.map((g) => (
            <Card
              key={g.date}
              className="flex items-center justify-between gap-2"
            >
              <div className="w-20 shrink-0">
                <div className="font-semibold text-sm">{g.giornoLabel}</div>
                <div className="text-[11px] text-(--text-secondary)">
                  {g.tempMin}° / {g.tempMax}°
                </div>
              </div>
              <div className="flex gap-4 flex-1 justify-end">
                {[
                  { label: "Matt", data: g.mattina },
                  { label: "Pom", data: g.pomeriggio },
                  { label: "Sera", data: g.sera },
                ].map((slot) => (
                  <div key={slot.label} className="text-center">
                    <div className="text-[10px] text-(--text-secondary)">
                      {slot.label}
                    </div>
                    <div className="text-lg">{slot.data.icona}</div>
                    <div className="text-[13px] font-semibold">
                      {slot.data.temp}°
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Consiglio */}
        {meteo.consiglio && (
          <Card
            className="mt-3"
            style={{
              background: "#A8D1FF15",
              border: "1px solid #A8D1FF44",
            }}
          >
            <p className="text-sm text-text leading-relaxed">{meteo.consiglio}</p>
          </Card>
        )}
    </ScreenContainer>
  );
}
