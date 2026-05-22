import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_ENDPOINT_LENGTH = 2048;

function parseEndpoint(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const endpoint =
    typeof (body as { endpoint?: string }).endpoint === "string"
      ? (body as { endpoint?: string }).endpoint?.trim() ?? ""
      : "";

  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return null;

  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" ? endpoint : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload non valido" }, { status: 400 });
  }

  const endpoint = parseEndpoint(rawBody);
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "Endpoint non valido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("push unsubscribe failed", error);
    return NextResponse.json(
      { ok: false, error: "Non sono riuscito a rimuovere la sottoscrizione push." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
