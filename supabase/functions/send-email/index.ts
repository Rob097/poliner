// Edge Function: invia email transazionale via Resend.
// Riceve { to, subject, body } — il body è plain text, lo wrappo io in un template basic.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Poliner <noreply@poliner.app>";

interface EmailInput {
  to: string;
  subject: string;
  body: string;          // testo o html
  isHtml?: boolean;
}

function templateHtml(body: string, isHtml = false): string {
  const content = isHtml ? body : body.replace(/\n/g, "<br>");
  return `<!doctype html>
<html lang="it">
<body style="margin:0;padding:0;background:#FAF8F6;font-family:'Nunito',Arial,sans-serif;color:#2E2924">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #F0EDE8">
        <tr><td style="background:#E8678A;padding:18px 24px;color:#fff;font-size:20px;font-weight:700;font-family:'Lora',Georgia,serif">
          🐔 Poliner
        </td></tr>
        <tr><td style="padding:24px;font-size:15px;line-height:1.6">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#FFF0F3;color:#9E968C;font-size:12px;text-align:center">
          Ricevi questa mail perché hai un account su Poliner.<br>
          Puoi modificare le preferenze dalle impostazioni dell'app.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "RESEND_API_KEY non configurata" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const input = (await req.json()) as EmailInput;
    if (!input.to || !input.subject || !input.body) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campi mancanti" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const html = templateHtml(input.body, input.isHtml);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: input.to,
        subject: input.subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ ok: false, error: `Resend ${res.status}: ${errText}` }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
