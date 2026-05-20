"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/queries";

export async function segnaNotificaComeLetta(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from("notifiche_inviate")
    .update({ letta_il: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id)
    .is("letta_il", null);

  revalidatePath("/");
  revalidatePath("/notifiche");
}

export async function segnaTutteComeLette() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifiche_inviate")
    .update({ letta_il: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("letta_il", null);

  revalidatePath("/");
  revalidatePath("/notifiche");
}