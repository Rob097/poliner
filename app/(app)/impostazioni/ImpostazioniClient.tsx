"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { IconEdit, IconMap } from "@/components/ui/icons";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { reverseGeocode, searchPlaces, type PlaceSuggestion } from "@/lib/utils/geocoding";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIE_NOTIFICHE,
  categorieDefault,
  type CategoriaNotificaId,
} from "@/lib/constants/notifiche";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
  isSubscribed,
} from "@/lib/push/client";
import {
  aggiornaPollaio,
  aggiornaPreferenzeNotifiche,
  aggiornaProfilo,
} from "./actions";

interface Profilo {
  id: string;
  email: string | null;
  displayName: string | null;
}

interface Pollaio {
  id: string;
  nome: string;
  posizioneNome: string | null;
  posizioneLat: number | null;
  posizioneLng: number | null;
  conservazioneAmbienteGiorni: number;
  conservazioneFrigoGiorni: number;
}

interface Preferenze {
  pushAttivo: boolean;
  emailAttivo: boolean;
  oraMeteo: string;
  nonDisturbareInizio: string | null;
  nonDisturbareFine: string | null;
  categorie: Record<string, boolean>;
}

interface Props {
  profilo: Profilo;
  pollaio: Pollaio;
  preferenze: Preferenze;
  hasPushSubscription: boolean;
  vapidPublicKey: string;
  ruolo: "admin" | "guest";
}

export function ImpostazioniClient({
  profilo,
  pollaio,
  preferenze,
  hasPushSubscription,
  vapidPublicKey,
  ruolo,
}: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [editProfilo, setEditProfilo] = useState(false);
  const [editPollaio, setEditPollaio] = useState(false);
  const [editConservazione, setEditConservazione] = useState(false);

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = profilo.displayName ?? profilo.email?.split("@")[0] ?? "Tu";

  return (
    <>
      {/* Profilo */}
      <Card className="flex items-center gap-3.5">
        <Avatar emoji="👩‍🌾" bg="#FFD6E0" size={56} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[17px] truncate">{displayName}</div>
          <div className="text-[13px] text-[var(--text-secondary)] truncate">
            {profilo.email}
          </div>
        </div>
        <Button
          variant="icon"
          onClick={() => setEditProfilo(true)}
          aria-label="Modifica profilo"
        >
          <IconEdit size={18} color="var(--text-secondary)" />
        </Button>
      </Card>

      {/* Pollaio */}
      <SectionTitle>Il pollaio</SectionTitle>
      <Card>
        <KeyValueRow
          label="Nome pollaio"
          value={pollaio.nome}
          onEdit={ruolo === "admin" ? () => setEditPollaio(true) : undefined}
        />
        <KeyValueRow
          label="Posizione"
          value={pollaio.posizioneNome ?? "Non impostata"}
          onEdit={ruolo === "admin" ? () => setEditPollaio(true) : undefined}
        />
      </Card>

      {/* Membri */}
      <SectionTitle>Membri</SectionTitle>
      <Card>
        <Link
          href="/impostazioni/membri"
          className="flex items-center justify-between py-2 -my-2"
        >
          <div>
            <div className="font-semibold text-[15px]">Chi può vedere questo pollaio</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              {ruolo === "admin" ? "Gestisci membri e inviti" : "Vedi chi fa parte del pollaio"}
            </div>
          </div>
          <span className="text-[var(--text-secondary)] text-lg">›</span>
        </Link>
      </Card>

      {/* Conservazione */}
      <SectionTitle>Conservazione uova</SectionTitle>
      <Card>
        <KeyValueRow
          label="A temperatura ambiente"
          value={`${pollaio.conservazioneAmbienteGiorni} giorni`}
          onEdit={ruolo === "admin" ? () => setEditConservazione(true) : undefined}
        />
        <KeyValueRow
          label="In frigorifero"
          value={`${pollaio.conservazioneFrigoGiorni} giorni`}
          onEdit={ruolo === "admin" ? () => setEditConservazione(true) : undefined}
        />
      </Card>

      {/* Notifiche */}
      <SectionTitle>Notifiche</SectionTitle>
      <NotificheSection
        preferenze={preferenze}
        hasPushSubscription={hasPushSubscription}
        vapidPublicKey={vapidPublicKey}
      />

      {/* Altro */}
      <SectionTitle>Altro</SectionTitle>
      <Card className="flex flex-col gap-3.5">
        <p className="text-xs text-[var(--text-secondary)] m-0">
          Esporta dati, assistenza e altre opzioni avanzate arriveranno con i prossimi aggiornamenti.
        </p>
      </Card>

      <Button
        variant="secondary"
        fullWidth
        onClick={onLogout}
        className="text-[#c0435a] mt-5"
      >
        {"Esci dall'account"}
      </Button>

      <div className="text-center mt-4 text-xs text-[var(--text-secondary)]">
        Poliner v0.8 · Made with 🐔 by Roberto
      </div>

      {editProfilo && (
        <ModalProfilo
          profilo={profilo}
          onClose={() => setEditProfilo(false)}
          onSaved={() => {
            show("✓ Profilo aggiornato");
            router.refresh();
          }}
        />
      )}
      {editPollaio && (
        <ModalPollaio
          pollaio={pollaio}
          onClose={() => setEditPollaio(false)}
          onSaved={() => {
            show("✓ Pollaio aggiornato");
            router.refresh();
          }}
        />
      )}
      {editConservazione && (
        <ModalConservazione
          pollaio={pollaio}
          onClose={() => setEditConservazione(false)}
          onSaved={() => {
            show("✓ Conservazione aggiornata");
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function KeyValueRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Modifica"
            className="text-[var(--text-secondary)]"
          >
            <IconEdit size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── NOTIFICHE SECTION ───────────────────────────────────
function NotificheSection({
  preferenze,
  hasPushSubscription,
  vapidPublicKey,
}: {
  preferenze: Preferenze;
  hasPushSubscription: boolean;
  vapidPublicKey: string;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [browserPushAttivo, setBrowserPushAttivo] = useState(hasPushSubscription);
  const [supported, setSupported] = useState(false);
  const pushSyncVersion = useRef(0);

  const [pushAttivo, setPushAttivo] = useState(preferenze.pushAttivo);
  const [emailAttivo, setEmailAttivo] = useState(preferenze.emailAttivo);
  const [categorie, setCategorie] = useState<Record<string, boolean>>(() => {
    const def = categorieDefault();
    return { ...def, ...preferenze.categorie } as Record<string, boolean>;
  });

  useEffect(() => {
    const supportedNow = isPushSupported();
    setSupported(supportedNow);
    if (!supportedNow) return;

    const syncVersion = ++pushSyncVersion.current;

    isSubscribed()
      .then((subscribed) => {
        if (pushSyncVersion.current !== syncVersion) return;
        setBrowserPushAttivo(subscribed || hasPushSubscription);
      })
      .catch(() => {
        if (pushSyncVersion.current !== syncVersion) return;
        setBrowserPushAttivo(hasPushSubscription);
      });
  }, [hasPushSubscription]);

  function persistChanges(next: {
    pushAttivo?: boolean;
    emailAttivo?: boolean;
    categorie?: Record<string, boolean>;
  }) {
    startTransition(async () => {
      const res = await aggiornaPreferenzeNotifiche({
        pushAttivo: next.pushAttivo ?? pushAttivo,
        emailAttivo: next.emailAttivo ?? emailAttivo,
        oraMeteo: preferenze.oraMeteo,
        nonDisturbareInizio: preferenze.nonDisturbareInizio,
        nonDisturbareFine: preferenze.nonDisturbareFine,
        categorie: next.categorie ?? categorie,
      });
      if (!res.ok) show("Ops, riprova!");
    });
  }

  async function onTogglePushBrowser() {
    pushSyncVersion.current += 1;

    if (browserPushAttivo) {
      const res = await disablePushNotifications();
      if (res.ok) {
        setBrowserPushAttivo(false);
        show("Push disattivate");
        router.refresh();
      } else show(res.error ?? "Ops, riprova!");
    } else {
      if (!vapidPublicKey) {
        show("VAPID keys non configurate sul server");
        return;
      }
      const res = await enablePushNotifications(vapidPublicKey);
      if (res.ok) {
        setBrowserPushAttivo(true);
        show("✓ Push notifiche attive!");
        router.refresh();
      } else show(res.error ?? "Ops, riprova!");
    }
  }

  async function onTestPush() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = await res.json();
    if (data.ok) show(`✓ Test inviato (${data.inviate}/${data.totali})`);
    else show(data.error ?? "Ops, riprova!");
  }

  function toggleCategoria(id: CategoriaNotificaId) {
    const next = { ...categorie, [id]: !categorie[id] };
    setCategorie(next);
    persistChanges({ categorie: next });
  }

  return (
    <Card className="flex flex-col gap-4">
      {/* Browser push subscription */}
      <div className="flex justify-between items-center gap-3">
        <div>
          <div className="font-semibold text-sm">📱 Notifiche push (questo dispositivo)</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {!supported
              ? "Il tuo browser non supporta le push"
              : browserPushAttivo
                ? "Riceverai gli avvisi sul telefono/desktop"
                : "Tap per attivarle"}
          </div>
        </div>
        <SwitchToggle
          on={browserPushAttivo}
          disabled={!supported}
          onChange={onTogglePushBrowser}
        />
      </div>
      {browserPushAttivo && (
        <Button
          variant="secondary"
          size="md"
          onClick={onTestPush}
          className="text-xs px-3 py-2 self-start"
        >
          🧪 Invia notifica di test
        </Button>
      )}

      <hr className="border-[var(--border)] m-0" />

      {/* Master switches */}
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-sm">Push (server-side)</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            Master switch per le notifiche programmate
          </div>
        </div>
        <SwitchToggle
          on={pushAttivo}
          onChange={() => {
            const next = !pushAttivo;
            setPushAttivo(next);
            persistChanges({ pushAttivo: next });
          }}
        />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-sm">📧 Email</div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            Promemoria importanti via email
          </div>
        </div>
        <SwitchToggle
          on={emailAttivo}
          onChange={() => {
            const next = !emailAttivo;
            setEmailAttivo(next);
            persistChanges({ emailAttivo: next });
          }}
        />
      </div>

      <hr className="border-[var(--border)] m-0" />

      <div className="text-[13px] font-semibold text-[var(--text-secondary)]">
        Categorie
      </div>

      {CATEGORIE_NOTIFICHE.map((cat) => (
        <div key={cat.id} className="flex justify-between items-center gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{cat.icona}</span>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{cat.label}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate">
                {cat.desc}
              </div>
            </div>
          </div>
          <SwitchToggle
            on={categorie[cat.id] ?? cat.defaultOn}
            onChange={() => toggleCategoria(cat.id)}
            disabled={pending}
          />
        </div>
      ))}
    </Card>
  );
}

function SwitchToggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className="flex-shrink-0 transition-all disabled:opacity-40"
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 3,
        background: on ? "var(--primary)" : "var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#fff",
          transform: on ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

// ── MODALS ──────────────────────────────────────────────
function ModalProfilo({
  profilo,
  onClose,
  onSaved,
}: {
  profilo: Profilo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [name, setName] = useState(profilo.displayName ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await aggiornaProfilo({ displayName: name });
      if (res.ok) {
        onSaved();
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  return (
    <Modal title="Profilo" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Nome (mostrato in app)">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Francesca"
            autoFocus
          />
        </FormField>
        <FormField label="Email">
          <Input value={profilo.email ?? ""} disabled />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Modal>
  );
}

function ModalPollaio({
  pollaio,
  onClose,
  onSaved,
}: {
  pollaio: Pollaio;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const geo = useGeolocation();
  const initialLocation =
    pollaio.posizioneNome && pollaio.posizioneLat !== null && pollaio.posizioneLng !== null
      ? {
          nome: pollaio.posizioneNome,
          lat: pollaio.posizioneLat,
          lng: pollaio.posizioneLng,
        }
      : null;
  const [nome, setNome] = useState(pollaio.nome);
  const [posizione, setPosizione] = useState(pollaio.posizioneNome ?? "");
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const query = posizione.trim();

    if ((selectedLocation && query === selectedLocation.nome) || query.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setSearchingPlaces(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingPlaces(true);
      setSearchError(null);

      try {
        const results = await searchPlaces(query, { count: 6, signal: controller.signal });
        if (cancelled) return;
        setSuggestions(results);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        setSuggestions([]);
        setSearchError("Non riesco a cercare le località adesso.");
      } finally {
        if (!cancelled) setSearchingPlaces(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [posizione, selectedLocation]);

  useEffect(() => {
    const coords = geo.coords;
    if (!coords) return;

    let active = true;
    setGeocoding(true);

    reverseGeocode(coords.lat, coords.lng)
      .then((place) => {
        if (!active) return;
        if (!place?.display) {
          show("Posizione rilevata, ma non sono riuscita a trovare la località.");
          return;
        }

        setPosizione(place.display);
        setSelectedLocation({
          nome: place.display,
          lat: coords.lat,
          lng: coords.lng,
        });
        setSuggestions([]);
        setSearchError(null);
      })
      .finally(() => {
        if (active) setGeocoding(false);
      });

    return () => {
      active = false;
    };
  }, [geo.coords, show]);

  function onPosizioneChange(value: string) {
    setPosizione(value);
    setSearchError(null);

    if (initialLocation && value.trim() === initialLocation.nome) {
      setSelectedLocation(initialLocation);
      return;
    }

    if (selectedLocation?.nome !== value) {
      setSelectedLocation(null);
    }
  }

  function onSelectSuggestion(suggestion: PlaceSuggestion) {
    setPosizione(suggestion.display);
    setSelectedLocation({
      nome: suggestion.display,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setSuggestions([]);
    setSearchError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const posizioneTrimmed = posizione.trim();
    const keepingLegacyTextOnly =
      !selectedLocation &&
      posizioneTrimmed.length > 0 &&
      posizioneTrimmed === (pollaio.posizioneNome ?? "").trim() &&
      pollaio.posizioneLat === null &&
      pollaio.posizioneLng === null;

    if (posizioneTrimmed && !selectedLocation && !keepingLegacyTextOnly) {
      show("Scegli una località dai suggerimenti o usa il GPS.");
      return;
    }

    startTransition(async () => {
      const res = await aggiornaPollaio({
        pollaioId: pollaio.id,
        nome,
        posizioneNome: posizioneTrimmed || null,
        posizioneLat: posizioneTrimmed
          ? (selectedLocation?.lat ?? pollaio.posizioneLat)
          : null,
        posizioneLng: posizioneTrimmed
          ? (selectedLocation?.lng ?? pollaio.posizioneLng)
          : null,
        conservazioneAmbienteGiorni: pollaio.conservazioneAmbienteGiorni,
        conservazioneFrigoGiorni: pollaio.conservazioneFrigoGiorni,
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  return (
    <Modal title="Pollaio" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Nome pollaio">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
          />
        </FormField>
        <FormField label="Posizione (città, regione)">
          <div className="flex flex-col gap-2">
            <Input
              value={posizione}
              onChange={(e) => onPosizioneChange(e.target.value)}
              placeholder="Es. Firenze, Toscana"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={geo.request}
              disabled={geo.loading || geocoding}
              className="self-start"
            >
              <IconMap size={16} />
              {geo.loading
                ? "Sto cercando..."
                : geocoding
                  ? "Trovo la città..."
                  : "Usa la mia posizione"}
            </Button>
          </div>
          {geo.error && (
            <p className="mt-2 text-xs text-[#c0435a]">{geo.error}</p>
          )}
          {searchError && (
            <p className="mt-2 text-xs text-[#c0435a]">{searchError}</p>
          )}
          {searchingPlaces && posizione.trim().length >= 2 && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Cerco località disponibili...
            </p>
          )}
          {!searchingPlaces &&
            !searchError &&
            suggestions.length === 0 &&
            posizione.trim().length >= 2 &&
            (!selectedLocation || posizione.trim() !== selectedLocation.nome) && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Nessuna località trovata per questa ricerca.
              </p>
            )}
          {suggestions.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-[var(--radius-sm)] border-2 border-[var(--border)] bg-white">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.id}-${suggestion.lat}-${suggestion.lng}`}
                  type="button"
                  className="w-full border-b border-[var(--border)] px-4 py-3 text-left text-[15px] font-semibold text-text transition-colors last:border-b-0 hover:bg-[var(--border)]"
                  onClick={() => onSelectSuggestion(suggestion)}
                >
                  {suggestion.display}
                </button>
              ))}
            </div>
          )}
        </FormField>
        <p className="text-xs text-[var(--text-secondary)] italic mb-3">
          Scegli una località dai suggerimenti o usa il GPS per aggiornare meteo e tramonto.
        </p>
        <Button type="submit" fullWidth size="lg" disabled={!nome.trim() || pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Modal>
  );
}

function ModalConservazione({
  pollaio,
  onClose,
  onSaved,
}: {
  pollaio: Pollaio;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [ambiente, setAmbiente] = useState(pollaio.conservazioneAmbienteGiorni);
  const [frigo, setFrigo] = useState(pollaio.conservazioneFrigoGiorni);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await aggiornaPollaio({
        pollaioId: pollaio.id,
        nome: pollaio.nome,
        posizioneNome: pollaio.posizioneNome,
        posizioneLat: pollaio.posizioneLat,
        posizioneLng: pollaio.posizioneLng,
        conservazioneAmbienteGiorni: ambiente,
        conservazioneFrigoGiorni: frigo,
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  return (
    <Modal title="Conservazione uova" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Dopo quanti giorni considerare un uovo &quot;scaduto&quot; in base a dove è conservato.
        </p>
        <FormField label="A temperatura ambiente (giorni)">
          <Input
            type="number"
            min={1}
            max={60}
            value={ambiente}
            onChange={(e) => setAmbiente(parseInt(e.target.value, 10) || 1)}
            required
          />
        </FormField>
        <FormField label="In frigorifero (giorni)">
          <Input
            type="number"
            min={1}
            max={90}
            value={frigo}
            onChange={(e) => setFrigo(parseInt(e.target.value, 10) || 1)}
            required
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
      </form>
    </Modal>
  );
}
