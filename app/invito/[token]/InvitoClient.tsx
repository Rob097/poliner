"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { accettaInvito, creaAccountDaInvito } from "@/lib/actions/inviti";

interface InvitoData {
  email: string;
  ruolo: "admin" | "guest";
  pollaioNome: string;
  invitanteNome: string;
  messaggio: string | null;
}

interface Props {
  token: string;
  invito: InvitoData;
  userEmail: string | null;
  isLoggedIn: boolean;
}

export function InvitoClient({ token, invito, userEmail, isLoggedIn }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  const ruoloLabel =
    invito.ruolo === "admin" ? "👑 Collaboratore" : "👀 Visualizzatore";
  const ruoloVerbo = invito.ruolo === "admin" ? "collaborare" : "guardare";

  const acceptAndGo = () => {
    setErrore(null);
    startTransition(async () => {
      const res = await accettaInvito(token);
      if (!res.ok) {
        setErrore(res.error ?? "Non sono riuscito ad accettare l'invito.");
        return;
      }
      router.push(`/benvenuto?pollaio=${res.pollaioId ?? ""}`);
      router.refresh();
    });
  };

  // Caso 1: utente loggato con email diversa
  if (isLoggedIn && userEmail?.toLowerCase() !== invito.email.toLowerCase()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="text-6xl">🙅</div>
        <PolinerLogo size="md" />
        <h1 className="font-serif text-2xl font-bold m-0 mt-2">
          Account sbagliato
        </h1>
        <p className="text-sm text-(--text-secondary) m-0 max-w-xs">
          {"Questo invito è stato spedito a "}
          <b>{invito.email}</b>
          {`, ma sei collegata/o come ${userEmail}.`}
        </p>
        <p className="text-sm text-(--text-secondary) m-0 max-w-xs">
          {"Esci e accedi (o registrati) con l'email giusta per accettare."}
        </p>
        <SignOutAndRetry token={token} />
      </div>
    );
  }

  // Caso 2: utente loggato con email corretta → conferma + accetta
  if (isLoggedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="text-6xl">🐔</div>
        <h1 className="font-serif text-2xl font-bold m-0 mt-2">
          {invito.invitanteNome} ti invita {ruoloVerbo}
        </h1>
        <p className="text-[22px] font-bold text-(--primary) m-0 font-serif">
          {invito.pollaioNome}
        </p>
        <div className="text-xs uppercase tracking-wide px-3 py-1 rounded-full bg-(--primary-lighter) text-(--primary) font-bold">
          {ruoloLabel}
        </div>

        {invito.messaggio && (
          <blockquote className="italic text-sm text-(--text-secondary) border-l-2 border-(--primary) pl-3 py-1 my-2 text-left max-w-xs">
            {invito.messaggio}
          </blockquote>
        )}

        {errore && <p className="text-[#c0435a] text-sm m-0">{errore}</p>}

        <Button
          size="lg"
          fullWidth
          onClick={acceptAndGo}
          disabled={isPending}
          className="mt-2 max-w-xs"
        >
          {isPending ? "Accetto…" : "Accetta invito"}
        </Button>
        <Link href="/" className="text-sm text-(--text-secondary) mt-1">
          Non ora
        </Link>
      </div>
    );
  }

  // Caso 3: utente non loggato → form signup con email pre-compilata
  return (
    <SignupForm token={token} invito={invito} />
  );
}

function SignOutAndRetry({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/invito/${token}`);
      router.refresh();
    });
  };

  return (
    <Button
      variant="secondary"
      onClick={handleSignOut}
      disabled={isPending}
      className="mt-4"
    >
      {isPending ? "Esco…" : "Esci e cambia account"}
    </Button>
  );
}

function SignupForm({ token, invito }: { token: string; invito: InvitoData }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);

  async function signInAndAccept(supabase = createClient()) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: invito.email,
      password,
    });

    if (error) {
      return {
        ok: false as const,
        error: "Non sono riuscito ad accedere con questo account. Controlla la password e riprova.",
      };
    }
    if (!data.session) {
      return {
        ok: false as const,
        error: "Account creato, ma non sono riuscito ad avviare la sessione. Riprova ad accedere.",
      };
    }

    const res = await accettaInvito(token);
    if (!res.ok) {
      return {
        ok: false as const,
        error: res.error ?? "Non sono riuscito ad accettare l'invito.",
      };
    }

    return { ok: true as const, pollaioId: res.pollaioId ?? "" };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (hasAccount) {
      const res = await signInAndAccept(supabase);
      setLoading(false);
      if (!res.ok) {
        setErrore(res.error);
        return;
      }
      router.push(`/benvenuto?pollaio=${res.pollaioId}`);
      router.refresh();
      return;
    }

    const createRes = await creaAccountDaInvito({ token, password });
    if (!createRes.ok) {
      setLoading(false);
      if (createRes.giaRegistrato) {
        setHasAccount(true);
      }
      setErrore(createRes.error ?? "Non sono riuscito a creare l'account.");
      return;
    }

    const res = await signInAndAccept(supabase);
    setLoading(false);
    if (!res.ok) {
      setErrore(res.error);
      return;
    }

    router.push(`/benvenuto?pollaio=${res.pollaioId}`);
    router.refresh();
  }

  const ruoloLabel =
    invito.ruolo === "admin" ? "👑 Collaboratore" : "👀 Visualizzatore";

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center pb-4 pt-2">
        <div className="text-5xl mb-2">🐔</div>
        <PolinerLogo size="md" />
      </div>

      <div className="text-center mb-5">
        <p className="text-[15px] m-0">
          <b>{invito.invitanteNome}</b> ti invita nel pollaio
        </p>
        <p className="text-[22px] font-bold text-(--primary) m-0 mt-1 font-serif">
          {invito.pollaioNome}
        </p>
        <div className="inline-block text-xs uppercase tracking-wide px-3 py-1 rounded-full bg-(--primary-lighter) text-(--primary) font-bold mt-2">
          {ruoloLabel}
        </div>
        {invito.messaggio && (
          <blockquote className="italic text-sm text-(--text-secondary) border-l-2 border-(--primary) pl-3 py-1 mt-3 text-left">
            {invito.messaggio}
          </blockquote>
        )}
      </div>

      <p className="text-sm text-center text-(--text-secondary) m-0 mb-4">
        {hasAccount
          ? "Accedi col tuo account per accettare l'invito."
          : "Crea il tuo account per entrare nel pollaio."}
      </p>

      <form onSubmit={onSubmit}>
        <FormField label="Email">
          <Input
            type="email"
            value={invito.email}
            disabled
            readOnly
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasAccount ? "La tua password" : "Almeno 8 caratteri"}
            minLength={hasAccount ? 1 : 8}
            required
            autoComplete={hasAccount ? "current-password" : "new-password"}
            autoFocus
          />
        </FormField>

        {errore && (
          <p className="text-sm text-[#c0435a] mb-3 text-center">{errore}</p>
        )}
        {info && (
          <p className="text-sm text-(--primary) mb-3 text-center">{info}</p>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={loading || password.length < (hasAccount ? 1 : 8)}
        >
          {loading
            ? hasAccount
              ? "Accesso…"
              : "Creo l'account…"
            : hasAccount
              ? "Accedi e accetta"
              : "Crea account e accetta"}
        </Button>
      </form>

      <div className="text-center mt-6 text-sm text-(--text-secondary)">
        {hasAccount ? "Non hai ancora un account?" : "Hai già un account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setHasAccount(!hasAccount);
            setErrore(null);
            setInfo(null);
          }}
          className="text-(--primary) font-semibold underline-offset-2 underline"
        >
          {hasAccount ? "Registrati" : "Accedi"}
        </button>
      </div>
    </div>
  );
}
