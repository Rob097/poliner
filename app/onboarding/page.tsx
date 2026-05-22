import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se l'utente è già membro di un pollaio (anche per invito), salta l'onboarding.
  const { data: membership } = await supabase
    .from("pollaio_members")
    .select("pollaio_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/");

  // Se ha un invito pending al suo indirizzo email, vai direttamente alla pagina invito.
  if (user.email) {
    const { data: invito } = await supabase
      .from("pollaio_inviti")
      .select("token")
      .ilike("email", user.email)
      .is("accettato_il", null)
      .gt("scadenza", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invito?.token) redirect(`/invito/${invito.token}`);
  }

  return <OnboardingFlow />;
}
