import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SubscribeBody {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
}

interface ValidSubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 512;

function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSubscribeBody(body: unknown): ValidSubscribeBody | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as SubscribeBody;
  const endpoint = typeof raw.endpoint === "string" ? raw.endpoint.trim() : "";
  const p256dh =
    typeof raw.keys?.p256dh === "string" ? raw.keys.p256dh.trim() : "";
  const auth = typeof raw.keys?.auth === "string" ? raw.keys.auth.trim() : "";
  const userAgent =
    typeof raw.userAgent === "string"
      ? raw.userAgent.trim().slice(0, MAX_USER_AGENT_LENGTH)
      : undefined;

  if (!endpoint || !p256dh || !auth) return null;
  if (endpoint.length > MAX_ENDPOINT_LENGTH) return null;
  if (p256dh.length > MAX_KEY_LENGTH || auth.length > MAX_KEY_LENGTH) return null;
  if (!isValidPushEndpoint(endpoint)) return null;

  return {
    endpoint,
    keys: { p256dh, auth },
    userAgent,
  };
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
    return NextResponse.json(
      { ok: false, error: "Payload non valido" },
      { status: 400 },
    );
  }

  const body = normalizeSubscribeBody(rawBody);
  if (!body || !body.keys) {
    return NextResponse.json(
      { ok: false, error: "Dati sottoscrizione non validi" },
      { status: 400 },
    );
  }

  const { endpoint, keys, userAgent } = body;

  const nextSubscription = {
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: userAgent ?? null,
  };

  const { data: existing, error: selectError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_agent")
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (selectError) {
    console.error("push subscribe select failed", selectError);
    return NextResponse.json(
      { ok: false, error: "Non sono riuscito a salvare la sottoscrizione push." },
      { status: 500 },
    );
  }

  if (
    existing &&
    existing.p256dh === nextSubscription.p256dh &&
    existing.auth === nextSubscription.auth &&
    existing.user_agent === nextSubscription.user_agent
  ) {
    return NextResponse.json({ ok: true });
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (deleteError) {
      console.error("push subscribe delete failed", deleteError);
      return NextResponse.json(
        { ok: false, error: "Non sono riuscito a salvare la sottoscrizione push." },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .insert(nextSubscription);

  if (error) {
    console.error("push subscribe insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Non sono riuscito a salvare la sottoscrizione push." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
