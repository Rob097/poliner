import { requirePollaio } from "@/lib/supabase/queries";
import { NuovaGallinaForm } from "./NuovaGallinaForm";

export const dynamic = "force-dynamic";

export default async function NuovaGallinaPage() {
  // Auth + pollaio enforcement (redirects se manca)
  await requirePollaio();
  return <NuovaGallinaForm />;
}
