import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  VoceManutenzione,
  StatoVoce,
} from "@/lib/utils/manutenzione";
import { calcolaStatiManutenzione } from "@/lib/utils/manutenzione";
import { calcolaScadenza } from "@/lib/utils/uova";
import { dateIsoInTimeZone, startOfTodayIso } from "@/lib/utils/date";
import type { Conservazione } from "@/lib/types";

type Supa = SupabaseClient<Database>;

export interface HomeCounters {
  uovaDisponibili: number;
  uovaOggi: number;
  galline: number;
  galli: number;
  notificheDaLeggere: number;
}

export interface UscitaOggi {
  id: string;
  ora_uscita: string | null;
  ora_rientro: string | null;
}

export interface HHGallina {
  animaleId: string;
  nome: string;
  fotoUrl: string | null;
  hhDa: string | null;
  giorni: number;
}

export interface SalutateAttiva {
  id: string;
  animale_id: string;
  nome: string;
  descrizione: string | null;
  tipo: string;
}

export interface ScortaBassa {
  id: string;
  nome: string;
  ultimoRifornimento: string | null; // ISO date della riga più recente in scorte_rifornimenti, oppure null
}

export interface PromemoriaImminente {
  id: string;
  testo: string;
  promemoria_data: string;
}

export interface UovoScadenza {
  data_deposizione: string;
  conservazione: Conservazione;
}

export interface HomeData {
  counters: HomeCounters;
  uscitaOggi: UscitaOggi | null;
  hhList: HHGallina[];
  manutenzioneStati: StatoVoce[];
  saluteAttivi: SalutateAttiva[];
  uovaInScadenzaIds: string[];
  scorteBasse: ScortaBassa[];
  promemoriaImminenti: PromemoriaImminente[];
  avvisiLetti: Set<string>;
}

/**
 * Esegue in parallelo tutte le query necessarie alla home page del pollaio
 * attivo. Per ogni risultato, gli errori vengono loggati ma non rilanciati:
 * la home preferisce mostrare contatori a 0 piuttosto che crashare.
 */
export async function loadHomeData(
  supabase: Supa,
  pollaioId: string,
  userId: string,
  conservazione: { ambiente: number; frigo: number },
): Promise<HomeData> {
  const oggiIso = dateIsoInTimeZone();
  const inizioOggiIso = startOfTodayIso();
  const fra24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
    homeHospitalRes,
    avvisiLettiRes,
  ] = await Promise.all([
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("stato", "disponibile"),
    supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .gte("data_deposizione", inizioOggiIso),
    supabase
      .from("animali")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("tipo", "gallina")
      .eq("attivo", true),
    supabase
      .from("animali")
      .select("id", { count: "exact", head: true })
      .eq("pollaio_id", pollaioId)
      .eq("tipo", "gallo")
      .eq("attivo", true),
    supabase
      .from("manutenzioni_voci")
      .select("id, nome, dove, icona, frequenza_giorni, consiglio_id, attivo")
      .eq("pollaio_id", pollaioId)
      .eq("attivo", true),
    supabase
      .from("manutenzioni")
      .select("id, voce_id, data")
      .eq("pollaio_id", pollaioId)
      .order("data", { ascending: false }),
    supabase
      .from("eventi_salute")
      .select("id, animale_id, descrizione, tipo, animali(nome)")
      .eq("pollaio_id", pollaioId)
      .eq("stato", "in_corso")
      .limit(5),
    supabase
      .from("uova")
      .select("id, data_deposizione, conservazione")
      .eq("pollaio_id", pollaioId)
      .eq("stato", "disponibile"),
    supabase
      .from("scorte_cibo")
      .select("id, nome, quantita, soglia_avviso")
      .eq("pollaio_id", pollaioId),
    supabase
      .from("note")
      .select("id, testo, promemoria_data")
      .eq("pollaio_id", pollaioId)
      .eq("archiviata", false)
      .not("promemoria_data", "is", null)
      .lte("promemoria_data", fra24hIso)
      .order("promemoria_data", { ascending: true })
      .limit(3),
    supabase
      .from("log_uscite")
      .select("id, ora_uscita, ora_rientro")
      .eq("pollaio_id", pollaioId)
      .eq("data", oggiIso)
      .maybeSingle(),
    supabase
      .from("notifiche_inviate")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("letta_il", null),
    supabase
      .from("eventi_salute")
      .select("id, animale_id, hh_da, animali(nome, foto_url)")
      .eq("pollaio_id", pollaioId)
      .eq("home_hospital", true)
      .is("hh_a", null)
      .order("hh_da", { ascending: true }),
    supabase
      .from("avvisi_letti")
      .select("avviso_key")
      .eq("user_id", userId)
      .eq("pollaio_id", pollaioId),
  ]);

  logQueryErrors("home", {
    uovaDisp: uovaDispRes.error,
    uovaOggi: uovaOggiRes.error,
    gallineCount: gallineCountRes.error,
    galloCount: galloCountRes.error,
    vociAttive: vociAttiveRes.error,
    manut: manutRes.error,
    saluteAttivi: saluteAttiviRes.error,
    uovaTutte: uovaTutte.error,
    scorte: scorteRes.error,
    promemoria: promemoriaRes.error,
    uscitaOggi: uscitaOggiRes.error,
    notificheNonLette: notificheNonLetteRes.error,
    homeHospital: homeHospitalRes.error,
    avvisiLetti: avvisiLettiRes.error,
  });

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
  const voci: VoceManutenzione[] = ((vociAttiveRes.data ?? []) as unknown as VoceRow[]).map(
    (v) => ({
      id: v.id,
      nome: v.nome,
      dove: v.dove,
      icona: v.icona,
      frequenza_giorni: v.frequenza_giorni,
      consiglio_id: v.consiglio_id,
      attivo: v.attivo,
    }),
  );
  const ultimoPerVoce = new Map<string, string>();
  for (const m of (manutRes.data ?? []) as unknown as LogRow[]) {
    if (!ultimoPerVoce.has(m.voce_id)) ultimoPerVoce.set(m.voce_id, m.data);
  }
  const manutenzioneStati = calcolaStatiManutenzione(voci, ultimoPerVoce);

  const saluteAttivi: SalutateAttiva[] = (saluteAttiviRes.data ?? []).map((e) => {
    const animale = e.animali as unknown as
      | { nome: string }
      | { nome: string }[]
      | null;
    const nome = Array.isArray(animale)
      ? animale[0]?.nome ?? "Una gallina"
      : animale?.nome ?? "Una gallina";
    return {
      id: e.id,
      animale_id: e.animale_id,
      nome,
      descrizione: e.descrizione,
      tipo: e.tipo,
    };
  });

  const uovaInScadenzaIds = (uovaTutte.data ?? [])
    .filter((u) => {
      const s = calcolaScadenza(
        u.data_deposizione,
        u.conservazione as Conservazione,
        conservazione,
      );
      return s.livello === "in_scadenza" || s.livello === "urgente";
    })
    .map((u) => u.id);

  const scorteBasseRaw = (scorteRes.data ?? []).filter(
    (s) =>
      s.quantita !== null &&
      s.soglia_avviso !== null &&
      Number(s.quantita) <= Number(s.soglia_avviso),
  );

  const ultimoRifornimentoMap = new Map<string, string>();
  if (scorteBasseRaw.length > 0) {
    const ids = scorteBasseRaw.map((s) => s.id);
    const { data: rifornimentiData, error: rifornimentiErr } = await supabase
      .from("scorte_rifornimenti")
      .select("scorta_id, data")
      .in("scorta_id", ids)
      .order("data", { ascending: false });
    if (rifornimentiErr) {
      console.error("[home] rifornimenti:", rifornimentiErr.message);
    }
    for (const r of rifornimentiData ?? []) {
      if (!ultimoRifornimentoMap.has(r.scorta_id)) {
        ultimoRifornimentoMap.set(r.scorta_id, r.data);
      }
    }
  }

  const scorteBasse: ScortaBassa[] = scorteBasseRaw.map((s) => ({
    id: s.id,
    nome: s.nome,
    ultimoRifornimento: ultimoRifornimentoMap.get(s.id) ?? null,
  }));

  const promemoriaImminenti: PromemoriaImminente[] = (promemoriaRes.data ?? [])
    .filter((p): p is { id: string; testo: string; promemoria_data: string } =>
      Boolean(p.promemoria_data),
    )
    .map((p) => ({
      id: p.id,
      testo: p.testo,
      promemoria_data: p.promemoria_data,
    }));

  const avvisiLetti = new Set<string>(
    (avvisiLettiRes.data ?? []).map((r) => r.avviso_key),
  );

  type HHRow = {
    id: string;
    animale_id: string;
    hh_da: string | null;
    animali:
      | { nome: string; foto_url: string | null }
      | { nome: string; foto_url: string | null }[]
      | null;
  };
  const hhByAnimale = new Map<
    string,
    { nome: string; fotoUrl: string | null; hhDa: string | null }
  >();
  for (const r of (homeHospitalRes.data ?? []) as unknown as HHRow[]) {
    if (hhByAnimale.has(r.animale_id)) continue;
    const a = Array.isArray(r.animali) ? r.animali[0] : r.animali;
    hhByAnimale.set(r.animale_id, {
      nome: a?.nome ?? "Una gallina",
      fotoUrl: a?.foto_url ?? null,
      hhDa: r.hh_da,
    });
  }
  const MS_DAY = 1000 * 60 * 60 * 24;
  const hhList: HHGallina[] = Array.from(hhByAnimale.entries()).map(([animaleId, v]) => ({
    animaleId,
    ...v,
    giorni: v.hhDa
      ? Math.max(0, Math.floor((Date.now() - new Date(v.hhDa).getTime()) / MS_DAY))
      : 0,
  }));

  type UscitaRow = {
    id: string;
    ora_uscita: string | null;
    ora_rientro: string | null;
  };
  const uscitaOggi = (uscitaOggiRes.data ?? null) as UscitaRow | null;

  return {
    counters: {
      uovaDisponibili: uovaDispRes.count ?? 0,
      uovaOggi: uovaOggiRes.count ?? 0,
      galline: gallineCountRes.count ?? 0,
      galli: galloCountRes.count ?? 0,
      notificheDaLeggere: notificheNonLetteRes.count ?? 0,
    },
    uscitaOggi,
    hhList,
    manutenzioneStati,
    saluteAttivi,
    uovaInScadenzaIds,
    scorteBasse,
    promemoriaImminenti,
    avvisiLetti,
  };
}

function logQueryErrors(
  scope: string,
  errors: Record<string, { message: string } | null | undefined>,
): void {
  for (const [name, err] of Object.entries(errors)) {
    if (err) console.error(`[${scope}] ${name}:`, err.message);
  }
}
