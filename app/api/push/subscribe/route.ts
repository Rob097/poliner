import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SubscribeBody {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const body = (await request.json()) as SubscribeBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { ok: false, error: "Dati sottoscrizione incompleti" },
      { status: 400 },
    );
  }

  const nextSubscription = {
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: body.userAgent ?? null,
  };

  const { data: existing, error: selectError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_agent")
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { ok: false, error: selectError.message },
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
      .eq("endpoint", body.endpoint);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .insert(nextSubscription);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
