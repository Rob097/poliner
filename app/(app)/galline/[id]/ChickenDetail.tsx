"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatNumber } from "@/components/ui/StatNumber";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { IconEdit, IconPlus } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { calcolaEta, faseProduttiva } from "@/lib/utils/eta";
import { statoMutaCorrente } from "@/lib/utils/muta";
import { trovaRazza, uovaAnnoLabel } from "@/lib/data/razze";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { formatData, formatDataLunga, todayIso } from "@/lib/utils/date";
import {
  aggiornaHomeHospital,
  aggiungiEventoSalute,
  aggiungiTrattamento,
  avviaMuta,
  eliminaTrattamento,
  risolviEventoSalute,
  terminaMuta,
} from "../actions";
import { SegnaDefuntaSheet } from "@/components/galline/SegnaDefuntaSheet";
import { MessaggioEmpaticoModal } from "@/components/galline/MessaggioEmpaticoModal";
import {
  InserimentoTab,
  type EventoInserimento,
} from "@/components/galline/InserimentoTab";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";

type Tipo = "gallina" | "gallo";

interface Animale {
  id: string;
  nome: string;
  tipo: string;
  razza_id: string | null;
  razza_custom: string | null;
  data_nascita: string | null;
  colore_piumaggio: string | null;
  foto_url: string | null;
  note: string | null;
  defunta_il: string | null;
  causa_decesso: string | null;
  note_decesso: string | null;
}

interface UovoRow {
  id: string;
  data_deposizione: string;
  stato: string;
  nido_id: string | null;
  note: string | null;
}

interface Trattamento {
  id: string;
  data: string;
  tipo: string;
  prodotto: string | null;
  dose: string | null;
  note: string | null;
  prossima_data: string | null;
  applica_a_tutti: boolean;
  animale_id: string | null;
}

interface PeriodoMuta {
  id: string;
  data_inizio: string;
  data_fine: string | null;
}

interface EventoSalute {
  id: string;
  data: string;
  tipo: string;
  descrizione: string | null;
  stato: string;
  data_risoluzione: string | null;
  home_hospital: boolean;
  hh_da: string | null;
  hh_a: string | null;
}

export interface ChickenData {
  animale: Animale;
  uova: UovoRow[];
  trattamenti: Trattamento[];
  periodiMuta: PeriodoMuta[];
  eventiSalute: EventoSalute[];
  eventiInserimento: EventoInserimento[];
  statsUova: {
    ultimaSettimana: number;
    totali: number;
    regalate: number;
  };
}

type TabId = "info" | "uova" | "salute" | "inserimento";

const TIPI_PROBLEMA = [
  { value: "ferita", label: "Ferita" },
  { value: "malattia", label: "Malattia" },
  { value: "comportamento", label: "Comportamento anomalo" },
  { value: "parassiti", label: "Parassiti" },
  { value: "guscio", label: "Problema al guscio" },
  { value: "altro", label: "Altro" },
] as const;

const SUGGERIMENTI_TRATTAMENTO = [
  "Sverminazione",
  "Antiparassitario",
  "Vitamina",
  "Antibiotico",
  "Disinfezione ferita",
  "Vaccino",
];

export function ChickenDetail({ data }: { data: ChickenData }) {
  const router = useRouter();
  const { animale, uova, trattamenti, periodiMuta, eventiSalute, eventiInserimento, statsUova } = data;
  const inInserimento =
    eventiInserimento.length > 0 &&
    !eventiInserimento.some((e) => e.tipo === "completato");
  const tipo = animale.tipo as Tipo;

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [showTrattamento, setShowTrattamento] = useState(false);
  const [showProblema, setShowProblema] = useState(false);
  const [showDefunta, setShowDefunta] = useState(false);
  const [showEmpatico, setShowEmpatico] = useState(false);
  const [editingHHEvento, setEditingHHEvento] = useState<EventoSalute | null>(null);

  const isDefunta = !!animale.defunta_il;
  const eta = animale.data_nascita ? calcolaEta(animale.data_nascita) : null;
  const fase = faseProduttiva({
    tipo,
    dataNascita: animale.data_nascita,
    razzaId: animale.razza_id,
  });
  const razza = trovaRazza(animale.razza_id);
  const razzaNome = razza?.nome ?? animale.razza_custom ?? "Razza non specificata";
  const muta = statoMutaCorrente(periodiMuta);
  const problemaAttivo = eventiSalute.find((e) => e.stato === "in_corso");
  const bg = avatarBgFor(animale.id);
  const emoji = defaultEmojiFor(tipo);

  const tabs = tipo === "gallina"
    ? [
        { value: "info" as const, label: "Info" },
        { value: "uova" as const, label: "Uova" },
        { value: "salute" as const, label: "Salute" },
        { value: "inserimento" as const, label: "Inserimento" },
      ]
    : [
        { value: "info" as const, label: "Info" },
        { value: "salute" as const, label: "Salute" },
        { value: "inserimento" as const, label: "Inserimento" },
      ];

  return (
    <>
      <Header
        title={animale.nome}
        onBack={() => router.back()}
        right={
          isDefunta ? null : (
            <Button
              variant="icon"
              onClick={() => router.push(`/galline/${animale.id}/modifica`)}
              aria-label="Modifica"
            >
              <IconEdit size={20} color="var(--text-secondary)" />
            </Button>
          )
        }
      />

      <div className="screen-scroll pad-tab px-4 pt-2">
        {/* Hero card */}
        <Card
          className="text-center"
          style={{
            background: `${bg}33`,
            border: `1px solid ${bg}88`,
          }}
        >
          {animale.foto_url ? (
            <div className="flex justify-center mb-2">
              <Avatar src={animale.foto_url} name={animale.nome} size={88} />
            </div>
          ) : (
            <div className="text-6xl mb-2">{emoji}</div>
          )}
          <div className="font-serif text-2xl font-bold text-text">
            {animale.nome}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            {razzaNome} · {tipo === "gallo" ? "Gallo" : "Gallina"}
            {eta ? ` · ${eta}` : ""}
          </div>

          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {isDefunta && (
              <Badge bg="#E8E2DC" color="#5b4d3e">
                💔 In memoria
              </Badge>
            )}
            {!isDefunta && inInserimento && (
              <Badge bg="#FFE07A55" color="#7a5d1a">
                🏠+→ In inserimento
              </Badge>
            )}
            {!isDefunta && problemaAttivo && (
              <Badge bg="#FFD6E0" color="#c0435a">
                ❤️‍🩹 Problema salute
              </Badge>
            )}
            {!isDefunta && muta.inMuta && (
              <Badge bg="#E8DAFF" color="#7b5ea7">
                🪶 In muta da {muta.giorni} {muta.giorni === 1 ? "giorno" : "giorni"}
              </Badge>
            )}
            {fase && (
              <Badge bg={`${fase.colore}44`} color="#3d3d3d">
                {fase.label}
              </Badge>
            )}
          </div>

          {tipo === "gallina" && (
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-[var(--border)]">
              <StatNumber
                value={statsUova.ultimaSettimana}
                label="questa settimana"
                color="var(--primary)"
                small
              />
              <StatNumber value={statsUova.totali} label="totali" small />
              <StatNumber value={statsUova.regalate} label="regalate" small />
            </div>
          )}
        </Card>

        <div className="mt-3">
          <SegmentedControl
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "info" && (
          <InfoTab
            animale={animale}
            eta={eta}
            fase={fase}
            problema={problemaAttivo}
            isDefunta={isDefunta}
            onSegnaDefunta={() => setShowDefunta(true)}
          />
        )}

        {activeTab === "uova" && tipo === "gallina" && (
          <UovaTab stats={statsUova} uova={uova} />
        )}

        {activeTab === "salute" && (
          <SaluteTab
            animaleId={animale.id}
            trattamenti={trattamenti}
            periodiMuta={periodiMuta}
            eventiSalute={eventiSalute}
            mutaInCorso={muta.inMuta}
            readOnly={isDefunta}
            onAddTrattamento={() => setShowTrattamento(true)}
            onAddProblema={() => setShowProblema(true)}
            onEditHH={(e) => setEditingHHEvento(e)}
          />
        )}

        {activeTab === "inserimento" && (
          <InserimentoTab
            animaleId={animale.id}
            eventi={eventiInserimento}
            readOnly={isDefunta}
          />
        )}
      </div>

      {showTrattamento && (
        <AggiungiTrattamentoSheet
          animaleId={animale.id}
          onClose={() => setShowTrattamento(false)}
        />
      )}
      {showProblema && (
        <RegistraProblemaSheet
          animaleId={animale.id}
          onClose={() => setShowProblema(false)}
        />
      )}
      {showDefunta && (
        <SegnaDefuntaSheet
          animaleId={animale.id}
          animaleNome={animale.nome}
          onClose={() => setShowDefunta(false)}
          onConfirmed={() => {
            setShowDefunta(false);
            setShowEmpatico(true);
          }}
        />
      )}
      {showEmpatico && (
        <MessaggioEmpaticoModal
          nome={animale.nome}
          onClose={() => {
            setShowEmpatico(false);
            router.push("/galline/in-memoria");
          }}
        />
      )}
      {editingHHEvento && (
        <AggiornaHomeHospitalSheet
          evento={editingHHEvento}
          animaleId={animale.id}
          onClose={() => setEditingHHEvento(null)}
        />
      )}
    </>
  );
}

// ─── INFO TAB ──────────────────────────────────────────
function InfoTab({
  animale,
  eta,
  fase,
  problema,
  isDefunta,
  onSegnaDefunta,
}: {
  animale: Animale;
  eta: string | null;
  fase: ReturnType<typeof faseProduttiva>;
  problema: EventoSalute | undefined;
  isDefunta: boolean;
  onSegnaDefunta: () => void;
}) {
  const razza = trovaRazza(animale.razza_id);
  const showRazzaInfo = razza && razza.origine !== "mista";
  const showEggInfo = animale.tipo === "gallina";

  return (
    <div className="mt-3">
      {showRazzaInfo && razza && (
        <>
          <SectionTitle>Informazioni razza</SectionTitle>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              {showEggInfo && <KV label="Produzione" value={`🥚 ${uovaAnnoLabel(razza)}/anno`} />}
              <KV label="Taglia" value={`📏 ${razza.taglia}`} />
              {showEggInfo && <KV label="Colore uova" value={`🎨 ${razza.coloreUova}`} />}
              <KV label="Temperamento" value={`💛 ${razza.temperamento}`} />
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Dettagli</SectionTitle>
      <Card>
        <div className="flex flex-col gap-3">
          {animale.colore_piumaggio && (
            <Row label="Colore piumaggio" value={animale.colore_piumaggio} />
          )}
          {animale.data_nascita && (
            <Row label="Data di nascita" value={formatDataLunga(animale.data_nascita)} />
          )}
          {eta && <Row label="Età" value={eta} />}
          {fase && <Row label="Fase produttiva" value={fase.label} />}
        </div>
      </Card>

      {animale.note && (
        <>
          <SectionTitle>Note</SectionTitle>
          <Card>
            <p className="text-sm text-text leading-relaxed m-0 whitespace-pre-wrap">
              {animale.note}
            </p>
          </Card>
        </>
      )}

      {problema && !isDefunta && (
        <>
          <SectionTitle>Problema attivo</SectionTitle>
          <Card style={{ borderLeft: "4px solid #E8678A" }}>
            <div className="font-semibold text-sm mb-1">
              ❤️‍🩹 {problema.descrizione ?? problema.tipo}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Registrato il {formatData(problema.data)} · Stato: in corso
            </div>
          </Card>
        </>
      )}

      {isDefunta && animale.defunta_il && (
        <>
          <SectionTitle>In memoria</SectionTitle>
          <Card style={{ borderLeft: "4px solid #b89a7a" }}>
            <div className="font-semibold text-sm mb-1">
              💔 Defunta il {formatDataLunga(animale.defunta_il)}
            </div>
            {animale.causa_decesso && (
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Causa: {animale.causa_decesso}
              </div>
            )}
            {animale.note_decesso && (
              <p className="text-sm text-text leading-relaxed mt-2 whitespace-pre-wrap m-0">
                {animale.note_decesso}
              </p>
            )}
          </Card>
        </>
      )}

      {!isDefunta && (
        <details className="mt-5 group">
          <summary
            className="list-none cursor-pointer flex items-center justify-between px-1 py-2 text-[12px] uppercase tracking-wider font-bold text-[var(--text-secondary)]"
          >
            <span>Zona delicata</span>
            <span
              className="text-[var(--text-secondary)] transition-transform group-open:rotate-90"
              aria-hidden
            >
              ›
            </span>
          </summary>
          <Card className="mt-2">
            <button
              type="button"
              onClick={onSegnaDefunta}
              className="w-full text-left flex items-center justify-between gap-3 py-1"
            >
              <div>
                <div className="font-semibold text-sm text-[#c0435a]">
                  💔 Segna come defunta
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Lo storico resta intatto, la trovi in “In memoria”.
                </div>
              </div>
              <span className="text-[var(--text-secondary)]" aria-hidden>›</span>
            </button>
          </Card>
        </details>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--text-secondary)]">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

// ─── UOVA TAB ──────────────────────────────────────────
function UovaTab({
  stats,
  uova,
}: {
  stats: ChickenData["statsUova"];
  uova: UovoRow[];
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-center gap-5 mb-4">
        <StatNumber
          value={stats.ultimaSettimana}
          label="questa settimana"
          color="var(--primary)"
        />
        <StatNumber value={stats.totali} label="totali" />
      </div>

      <SectionTitle>Ultime uova</SectionTitle>
      {uova.length === 0 ? (
        <EmptyState
          icon="🥚"
          title="Nessun uovo ancora"
          subtitle="Le uova di questa gallina appariranno qui"
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {uova.map((u) => (
            <Card key={u.id} className="flex items-center gap-3 py-2.5 px-3.5">
              <span className="text-xl">🥚</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {formatData(u.data_deposizione)}
                </div>
                {u.note && (
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {u.note}
                  </div>
                )}
              </div>
              <Badge small bg={statoUovoColor(u.stato).bg} color={statoUovoColor(u.stato).color}>
                {statoUovoLabel(u.stato)}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function statoUovoLabel(stato: string): string {
  if (stato === "disponibile") return "Disponibile";
  if (stato === "consumato") return "Consumato";
  if (stato === "regalato") return "Regalato";
  return stato;
}
function statoUovoColor(stato: string): { bg: string; color: string } {
  if (stato === "disponibile") return { bg: "#B5D4B533", color: "#3d6b3d" };
  if (stato === "consumato") return { bg: "#F0EDE8", color: "var(--text-secondary)" };
  return { bg: "#FFE4D044", color: "#b87333" };
}

// ─── SALUTE TAB ────────────────────────────────────────
function SaluteTab({
  animaleId,
  trattamenti,
  periodiMuta,
  eventiSalute,
  mutaInCorso,
  readOnly,
  onAddTrattamento,
  onAddProblema,
  onEditHH,
}: {
  animaleId: string;
  trattamenti: Trattamento[];
  periodiMuta: PeriodoMuta[];
  eventiSalute: EventoSalute[];
  mutaInCorso: boolean;
  readOnly: boolean;
  onAddTrattamento: () => void;
  onAddProblema: () => void;
  onEditHH: (e: EventoSalute) => void;
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  function toggleMuta() {
    showLoadingOverlay();
    startTransition(async () => {
      const fn = mutaInCorso ? terminaMuta : avviaMuta;
      const res = await fn(animaleId);
      if (res.ok) {
        show(mutaInCorso ? "✓ Muta terminata" : "✓ Muta iniziata");
      } else {
        show("Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  function risolvi(eventoId: string) {
    showLoadingOverlay();
    startTransition(async () => {
      const res = await risolviEventoSalute(eventoId, animaleId);
      if (res.ok) show("✓ Problema risolto!");
      hideLoadingOverlay();
    });
  }

  function eliminaTratt(id: string) {
    showLoadingOverlay();
    startTransition(async () => {
      const res = await eliminaTrattamento(id, animaleId);
      if (res.ok) show("✓ Trattamento eliminato");
      hideLoadingOverlay();
    });
  }

  return (
    <div className="mt-3">
      {/* Muta */}
      <SectionTitle>Muta</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">
              {mutaInCorso ? "🪶 Attualmente in muta" : "Non in muta"}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {mutaInCorso
                ? "Segna la fine della muta quando le penne sono ricresciute"
                : "Segna l'inizio della muta quando inizia a perdere le penne"}
            </div>
          </div>
          {!readOnly && (
            <Button
              size="md"
              variant={mutaInCorso ? "secondary" : "primary"}
              onClick={toggleMuta}
              disabled={pending}
              className="whitespace-nowrap"
            >
              {mutaInCorso ? "Termina muta" : "Inizia muta"}
            </Button>
          )}
        </div>

        {periodiMuta.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-[var(--primary)] cursor-pointer font-semibold">
              Storico mute ({periodiMuta.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {periodiMuta.map((p) => (
                <div key={p.id} className="text-xs text-[var(--text-secondary)]">
                  {formatData(p.data_inizio)} →{" "}
                  {p.data_fine ? formatData(p.data_fine) : "in corso"}
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>

      {/* Eventi salute */}
      <SectionTitle
        right={
          readOnly ? undefined : (
            <button
              type="button"
              onClick={onAddProblema}
              className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1"
            >
              <IconPlus size={14} /> Registra problema
            </button>
          )
        }
      >
        Problemi di salute
      </SectionTitle>
      {eventiSalute.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] text-center py-2">
            Nessun problema di salute registrato ✓
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {eventiSalute.map((e) => {
            const hhAttivo = e.home_hospital && !e.hh_a;
            return (
              <Card key={e.id}>
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className="font-semibold text-sm">
                    {e.stato === "in_corso" ? "❤️‍🩹" : "✓"}{" "}
                    {e.descrizione ?? tipoEventoLabel(e.tipo)}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {e.home_hospital && (
                      <Badge small bg="#FFE07A55" color="#7a5d1a">
                        🏠 {hhAttivo ? "In casa" : "Casa"}
                      </Badge>
                    )}
                    <Badge
                      small
                      bg={e.stato === "in_corso" ? "#FFD6E0" : "#B5D4B533"}
                      color={e.stato === "in_corso" ? "#c0435a" : "#3d6b3d"}
                    >
                      {e.stato === "in_corso" ? "In corso" : "Risolto"}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {formatData(e.data)} · Tipo: {tipoEventoLabel(e.tipo)}
                </div>
                {e.home_hospital && (e.hh_da || e.hh_a) && (
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    🏠 {e.hh_da ? `Dal ${formatData(e.hh_da)}` : ""}
                    {e.hh_a ? ` al ${formatData(e.hh_a)}` : e.hh_da ? " — ancora a casa" : ""}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  {e.stato === "in_corso" && !readOnly && (
                    <button
                      type="button"
                      onClick={() => risolvi(e.id)}
                      disabled={pending}
                      className="text-xs text-[var(--primary)] font-semibold"
                    >
                      Segna come risolto
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onEditHH(e)}
                      className="text-xs text-[#7a5d1a] font-semibold"
                    >
                      {e.home_hospital ? "Aggiorna Home Hospital" : "🏠 Porta in casa"}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trattamenti */}
      <SectionTitle
        right={
          readOnly ? undefined : (
            <button
              type="button"
              onClick={onAddTrattamento}
              className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1"
            >
              <IconPlus size={14} /> Aggiungi
            </button>
          )
        }
      >
        Trattamenti
      </SectionTitle>
      {trattamenti.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] text-center py-2">
            Nessun trattamento registrato
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {trattamenti.map((t) => (
            <Card key={t.id}>
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-sm">💊 {t.tipo}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {formatData(t.data)}
                </div>
              </div>
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {t.applica_a_tutti && (
                  <div>
                    <Badge small bg="#A8D1FF44" color="#3a5a7a">
                      Tutto il pollaio
                    </Badge>
                  </div>
                )}
                {t.prodotto && <div>Prodotto: {t.prodotto}</div>}
                {t.dose && <div>Dose: {t.dose}</div>}
                {t.note && <div>Note: {t.note}</div>}
              </div>
              {t.prossima_data && (
                <div
                  className="mt-2 px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: "#FFE07A33" }}
                >
                  📅 Prossimo trattamento: {formatData(t.prossima_data)}
                </div>
              )}
              {/* Eliminazione possibile solo se è del singolo animale */}
              {!t.applica_a_tutti && !readOnly && (
                <button
                  type="button"
                  onClick={() => eliminaTratt(t.id)}
                  disabled={pending}
                  className="mt-2 text-xs text-[#c0435a]"
                >
                  Elimina
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function tipoEventoLabel(t: string): string {
  const found = TIPI_PROBLEMA.find((x) => x.value === t);
  return found?.label ?? t;
}

// ─── SHEETS ────────────────────────────────────────────

function AggiungiTrattamentoSheet({
  animaleId,
  onClose,
}: {
  animaleId: string;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [tipo, setTipo] = useState("");
  const [prodotto, setProdotto] = useState("");
  const [dose, setDose] = useState("");
  const [note, setNote] = useState("");
  const [applicaATutti, setApplicaATutti] = useState(false);
  const [prossimaData, setProssimaData] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    showLoadingOverlay();
    startTransition(async () => {
      const res = await aggiungiTrattamento({
        animaleId,
        applicaATutti,
        data: new Date().toISOString(),
        tipo,
        prodotto: prodotto || null,
        dose: dose || null,
        note: note || null,
        prossimaData: prossimaData ? new Date(prossimaData).toISOString() : null,
      });
      if (res.ok) {
        show("✓ Trattamento registrato!");
        onClose();
      } else {
        show("Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  return (
    <Modal title="Aggiungi trattamento" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Tipo di trattamento">
          <Input
            list="tratt-tipi"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Es. Sverminazione"
            required
            autoFocus
          />
          <datalist id="tratt-tipi">
            {SUGGERIMENTI_TRATTAMENTO.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Applicato a">
          <SegmentedControl
            options={[
              { value: "singola", label: "Solo questa" },
              { value: "tutti", label: "Tutto il pollaio" },
            ]}
            value={applicaATutti ? "tutti" : "singola"}
            onChange={(v) => setApplicaATutti(v === "tutti")}
          />
        </FormField>

        <FormField label="Prodotto usato (opzionale)">
          <Input
            value={prodotto}
            onChange={(e) => setProdotto(e.target.value)}
            placeholder="Es. Flubenvet"
          />
        </FormField>

        <FormField label="Dose (opzionale)">
          <Input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="Es. 1 misurino per 7 giorni"
          />
        </FormField>

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </FormField>

        <FormField label="Prossimo trattamento previsto (opzionale)">
          <Input
            type="date"
            value={prossimaData}
            onChange={(e) => setProssimaData(e.target.value)}
            min={todayIso()}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!tipo.trim() || pending}
          className="mt-2"
        >
          {pending ? "Sto registrando..." : "Registra trattamento"}
        </Button>
      </form>
    </Modal>
  );
}

function RegistraProblemaSheet({
  animaleId,
  onClose,
}: {
  animaleId: string;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [tipo, setTipo] =
    useState<(typeof TIPI_PROBLEMA)[number]["value"]>("ferita");
  const [descrizione, setDescrizione] = useState("");
  const today = todayIso();
  const [homeHospital, setHomeHospital] = useState(false);
  const [hhDa, setHhDa] = useState(today);
  const [hhA, setHhA] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    showLoadingOverlay();
    startTransition(async () => {
      const res = await aggiungiEventoSalute({
        animaleId,
        tipo,
        descrizione: descrizione || null,
        homeHospital,
        hhDa: homeHospital ? hhDa : null,
        hhA: homeHospital && hhA ? hhA : null,
      });
      if (res.ok) {
        show("✓ Problema registrato");
        onClose();
      } else {
        show("Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  return (
    <Modal title="Registra problema di salute" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Tipo di problema">
          <Select
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as (typeof TIPI_PROBLEMA)[number]["value"])
            }
          >
            {TIPI_PROBLEMA.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Descrizione">
          <Textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            rows={3}
            placeholder="Es. Ferita alla zampa destra, beccata dalle altre"
            required
          />
        </FormField>

        <div className="mb-4 rounded-[var(--radius)] border border-[var(--border)] p-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={homeHospital}
              onChange={(ev) => setHomeHospital(ev.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                🏠 Portata a casa (Home Hospital)
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tracciamo separatamente il periodo di cura a casa.
              </div>
            </div>
          </label>

          {homeHospital && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <FormField label="Da">
                <Input
                  type="date"
                  value={hhDa}
                  onChange={(ev) => setHhDa(ev.target.value)}
                  max={today}
                  required
                />
              </FormField>
              <FormField label="A (opzionale)">
                <Input
                  type="date"
                  value={hhA}
                  onChange={(ev) => setHhA(ev.target.value)}
                  min={hhDa}
                />
              </FormField>
            </div>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!descrizione.trim() || pending}
          className="mt-2"
        >
          {pending ? "Sto registrando..." : "Registra problema"}
        </Button>
      </form>
    </Modal>
  );
}

function AggiornaHomeHospitalSheet({
  evento,
  animaleId,
  onClose,
}: {
  evento: EventoSalute;
  animaleId: string;
  onClose: () => void;
}) {
  const { show } = useToast();
  const today = todayIso();
  const [homeHospital, setHomeHospital] = useState(evento.home_hospital);
  const [hhDa, setHhDa] = useState(evento.hh_da ?? today);
  const [hhA, setHhA] = useState(evento.hh_a ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    showLoadingOverlay();
    startTransition(async () => {
      const res = await aggiornaHomeHospital({
        eventoId: evento.id,
        animaleId,
        homeHospital,
        hhDa: homeHospital ? hhDa : null,
        hhA: homeHospital ? hhA || null : null,
      });
      if (res.ok) {
        show("✓ Home Hospital aggiornato");
        onClose();
      } else {
        show("Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  function chiudiOggi() {
    showLoadingOverlay();
    startTransition(async () => {
      const res = await aggiornaHomeHospital({
        eventoId: evento.id,
        animaleId,
        homeHospital: true,
        hhDa: evento.hh_da ?? today,
        hhA: today,
      });
      if (res.ok) {
        show("✓ Tornata nel pollaio");
        onClose();
      } else {
        show("Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  return (
    <Modal title="🏠 Home Hospital" onClose={onClose}>
      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        Tieni traccia del periodo in cui la gallina è in casa per cure.
      </p>

      <form onSubmit={onSubmit}>
        <div className="mb-3 rounded-[var(--radius)] border border-[var(--border)] p-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={homeHospital}
              onChange={(ev) => setHomeHospital(ev.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {homeHospital ? "🏠 Attualmente in Home Hospital" : "Non in Home Hospital"}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                Togli la spunta per disattivare il tracciamento Home Hospital.
              </div>
            </div>
          </label>

          {homeHospital && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <FormField label="Da">
                <Input
                  type="date"
                  value={hhDa}
                  onChange={(ev) => setHhDa(ev.target.value)}
                  max={today}
                  required
                />
              </FormField>
              <FormField label="A (opzionale)">
                <Input
                  type="date"
                  value={hhA}
                  onChange={(ev) => setHhA(ev.target.value)}
                  min={hhDa}
                />
              </FormField>
            </div>
          )}
        </div>

        {homeHospital && !evento.hh_a && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={chiudiOggi}
            disabled={pending}
            className="mb-2"
          >
            ✓ Tornata nel pollaio oggi
          </Button>
        )}

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Sto salvando…" : "Salva"}
        </Button>
      </form>
    </Modal>
  );
}
