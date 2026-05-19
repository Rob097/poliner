import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pollaio } = await supabase
    .from("pollai")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (pollaio) redirect("/");

  return <OnboardingFlow />;
}
