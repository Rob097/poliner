import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { GalleriaAnimali } from "./GalleriaAnimali";

export interface PollaioPubblico {
  id: string;
  nome: string;
  fotoUrl: string | null;
  posizioneNome: string | null;
  descrizionePubblica: string | null;
}

export interface AnimalePubblico {
  id: string;
  nome: string;
  fotoUrl: string | null;
  razzaId: string | null;
  razzaCustom: string | null;
  dataNascita: string | null;
  tipo: "gallina" | "gallo";
  colorePiumaggio: string | null;
  descrizionePubblica: string | null;
}

export interface StatsPubbliche {
  uovaTotali: number;
  uovaUltimoMese: number;
  gallineCount: number;
}

export interface RazzaChip {
  key: string;
  nome: string;
  count: number;
}

export interface StatsAnagrafica {
  etaMediaMesi: number | null;
  capostipiteNome: string | null;
  capostipiteEtaMesi: number | null;
}

function mesiInTesto(mesi: number): string {
  if (mesi < 12) return `${mesi} mes${mesi === 1 ? "e" : "i"}`;
  const anni = Math.floor(mesi / 12);
  const resto = mesi % 12;
  if (resto === 0) return `${anni} ann${anni === 1 ? "o" : "i"}`;
  return `${anni} ann${anni === 1 ? "o" : "i"} e ${resto} mes${resto === 1 ? "e" : "i"}`;
}

export function PaginaPubblicaView({
  pollaio,
  animali,
  stats,
  razzeChips,
  anagrafica,
  curiosita,
}: {
  pollaio: PollaioPubblico;
  animali: AnimalePubblico[];
  stats: StatsPubbliche;
  razzeChips: RazzaChip[];
  anagrafica: StatsAnagrafica;
  curiosita: string;
}) {
  const galline = animali.filter((a) => a.tipo === "gallina");
  const galli = animali.filter((a) => a.tipo === "gallo");

  const mapsUrl = pollaio.posizioneNome
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pollaio.posizioneNome)}`
    : null;

  return (
    <main className="min-h-dvh pb-12">
      {/* Hero */}
      <section className="relative">
        {pollaio.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pollaio.fotoUrl}
            alt={pollaio.nome}
            className="w-full aspect-16/10 object-cover"
          />
        ) : (
          <div
            className="w-full aspect-16/10 flex items-center justify-center text-7xl"
            style={{ background: "var(--primary-lighter)" }}
            aria-hidden
          >
            🐔
          </div>
        )}
        <div className="px-5 pt-4">
          <h1 className="font-serif text-2xl font-bold m-0">{pollaio.nome}</h1>
          {pollaio.posizioneNome && (
            <div className="text-sm text-(--text-secondary) mt-1">
              📍 {pollaio.posizioneNome}
            </div>
          )}
          <div className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--primary-lighter) text-(--primary)">
            Su Poliner
          </div>
        </div>
      </section>

      {/* Descrizione */}
      {pollaio.descrizionePubblica && (
        <section className="px-5 mt-4">
          <Card>
            <p className="text-[15px] text-text leading-relaxed m-0 whitespace-pre-wrap">
              {pollaio.descrizionePubblica}
            </p>
          </Card>
        </section>
      )}

      {/* Stats */}
      <section className="px-5 mt-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={stats.gallineCount} label="galline" emoji="🐔" />
          <StatCard value={stats.uovaTotali} label="uova totali" emoji="🥚" />
          <StatCard value={stats.uovaUltimoMese} label="ultimo mese" emoji="📅" />
        </div>
      </section>

      {/* Sapevi che… */}
      <section className="px-5 mt-4">
        <Card
          style={{
            background: "#FFE07A22",
            border: "1px solid #FFE07A66",
          }}
        >
          <div className="text-[13px] font-semibold mb-1">💡 Sapevi che…</div>
          <p className="text-sm text-text leading-relaxed m-0">{curiosita}</p>
        </Card>
      </section>

      {/* Anagrafica del pollaio */}
      {(anagrafica.etaMediaMesi !== null || anagrafica.capostipiteNome) && (
        <section className="px-5 mt-4">
          <Card>
            <div className="text-[13px] font-semibold mb-2">
              👵 La famiglia del pollaio
            </div>
            <div className="flex flex-col gap-1 text-sm text-text">
              {anagrafica.etaMediaMesi !== null && (
                <div>
                  <span className="text-(--text-secondary)">Età media: </span>
                  <span className="font-semibold">
                    {mesiInTesto(anagrafica.etaMediaMesi)}
                  </span>
                </div>
              )}
              {anagrafica.capostipiteNome && anagrafica.capostipiteEtaMesi !== null && (
                <div>
                  <span className="text-(--text-secondary)">
                    La più anziana:{" "}
                  </span>
                  <span className="font-semibold">
                    {anagrafica.capostipiteNome}
                  </span>
                  <span className="text-(--text-secondary)">
                    {" "}
                    ({mesiInTesto(anagrafica.capostipiteEtaMesi)})
                  </span>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* Razze del pollaio */}
      {razzeChips.length > 0 && (
        <section className="px-5 mt-4">
          <Card>
            <div className="text-[13px] font-semibold mb-2">
              🐓 Razze del pollaio
            </div>
            <div className="flex flex-wrap gap-1.5">
              {razzeChips.map((r) => (
                <span
                  key={r.key}
                  className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full"
                  style={{ background: "var(--primary-lighter)", color: "var(--primary)" }}
                >
                  <span className="font-semibold">{r.nome}</span>
                  {r.count > 1 && (
                    <span className="text-(--text-secondary)">×{r.count}</span>
                  )}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Galline + Galli con modale */}
      <GalleriaAnimali galline={galline} galli={galli} />

      {/* Mini mappa / posizione */}
      {mapsUrl && pollaio.posizioneNome && (
        <section className="px-5 mt-6">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="block"
          >
            <Card className="flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: "var(--primary-lighter)" }}
                aria-hidden
              >
                📍
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-(--text-secondary) leading-tight">
                  Posizione
                </div>
                <div className="font-semibold text-sm truncate">
                  {pollaio.posizioneNome}
                </div>
                <div className="text-[11px] text-(--primary) mt-0.5">
                  Apri su Google Maps →
                </div>
              </div>
            </Card>
          </a>
        </section>
      )}

      {/* Footer */}
      <footer className="px-5 mt-10 text-center">
        <p className="text-xs text-(--text-secondary) m-0 leading-relaxed">
          Vuoi gestire anche tu il tuo pollaio?
        </p>
        <Link
          href="/"
          className="inline-block mt-2 text-sm font-semibold text-(--primary)"
        >
          Scopri Poliner →
        </Link>
      </footer>
    </main>
  );
}

function StatCard({
  value,
  label,
  emoji,
}: {
  value: number;
  label: string;
  emoji: string;
}) {
  return (
    <Card className="text-center py-3 px-2">
      <div className="text-2xl" aria-hidden>{emoji}</div>
      <div className="text-xl font-extrabold text-(--primary) mt-0.5">
        {value}
      </div>
      <div className="text-[11px] text-(--text-secondary) mt-0.5">{label}</div>
    </Card>
  );
}
