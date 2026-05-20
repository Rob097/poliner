import { requirePollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ImpostazioniClient } from "./ImpostazioniClient";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const { supabase, user, pollaio, ruolo } = await requirePollaio();

  const [profileRes, prefRes, subsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("preferenze_notifiche")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id),
  ]);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <>
      <Header title="Impostazioni" />
      <ScreenContainer>
        <ImpostazioniClient
          profilo={{
            id: user.id,
            email: user.email ?? null,
            displayName: profileRes.data?.display_name ?? null,
          }}
          pollaio={{
            id: pollaio.id,
            nome: pollaio.nome,
            posizioneNome: pollaio.posizione_nome,
            posizioneLat: pollaio.posizione_lat,
            posizioneLng: pollaio.posizione_lng,
            conservazioneAmbienteGiorni: pollaio.conservazione_ambiente_giorni,
            conservazioneFrigoGiorni: pollaio.conservazione_frigo_giorni,
          }}
          preferenze={{
            pushAttivo: prefRes.data?.push_attivo ?? true,
            emailAttivo: prefRes.data?.email_attivo ?? true,
            oraMeteo: prefRes.data?.ora_notifiche_meteo ?? "20:00",
            nonDisturbareInizio: prefRes.data?.non_disturbare_inizio ?? null,
            nonDisturbareFine: prefRes.data?.non_disturbare_fine ?? null,
            categorie: (prefRes.data?.categorie as Record<string, boolean>) ?? {},
          }}
          hasPushSubscription={(subsRes.data?.length ?? 0) > 0}
          vapidPublicKey={vapidPublicKey}
          ruolo={ruolo}
        />
      </ScreenContainer>
    </>
  );
}
