import { NextResponse } from "next/server";
import { requireAdminPollaio } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

// TEMPORANEO: route di debug per ispezionare l'oggetto pollaio che
// l'app riceve in produzione. RIMUOVERE dopo aver risolto il bug
// del meteo "Posizione non impostata".
export async function GET() {
  try {
    const { supabase, user, pollaio, ruolo } = await requireAdminPollaio();

    // Anche una query raw per confronto
    const { data: rawPollai } = await supabase
      .from("pollai")
      .select("*")
      .eq("id", pollaio.id);

    const { data: rawMembership } = await supabase
      .from("pollaio_members")
      .select("ruolo, pollai:pollaio_id(*)")
      .eq("user_id", user.id);

    return NextResponse.json(
      {
        ts: new Date().toISOString(),
        user_id: user.id,
        ruolo,
        pollaio_from_require: pollaio,
        pollaio_lat_type: typeof pollaio.posizione_lat,
        pollaio_lng_type: typeof pollaio.posizione_lng,
        raw_select_star: rawPollai,
        raw_select_star_lat_type: rawPollai?.[0]
          ? typeof rawPollai[0].posizione_lat
          : null,
        raw_join: rawMembership,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
