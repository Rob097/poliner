import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInvitoPublic } from "@/lib/actions/inviti";
import { Button } from "@/components/ui/Button";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { InvitoClient } from "./InvitoClient";

export const dynamic = "force-dynamic";

interface Params {
  token: string;
}

export default async function InvitoTokenPage({ params }: { params: Params }) {
  const invito = await getInvitoPublic(params.token);

  if (!invito.ok) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="text-6xl">😕</div>
        <PolinerLogo size="md" />
        <h1 className="font-serif text-2xl font-bold m-0 mt-2">
          {invito.scaduto
            ? "Invito scaduto"
            : invito.gia_accettato
              ? "Invito già accettato"
              : "Invito non valido"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] m-0 max-w-xs">
          {invito.error} Chiedi a chi ti ha invitata/o di mandartene uno nuovo.
        </p>
        <Link href="/" className="mt-4">
          <Button>Vai a Poliner</Button>
        </Link>
      </div>
    );
  }

  // Stato login attuale
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InvitoClient
      token={params.token}
      invito={{
        email: invito.email,
        ruolo: invito.ruolo,
        pollaioNome: invito.pollaioNome,
        invitanteNome: invito.invitanteNome,
        messaggio: invito.messaggio,
      }}
      userEmail={user?.email ?? null}
      isLoggedIn={Boolean(user)}
    />
  );
}
