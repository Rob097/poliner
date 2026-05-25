import { getOpenAI } from "./openai";
import { MODELS, TITLE_PARAMS } from "./config";

/**
 * Genera un titolo breve (max ~5 parole) per una conversazione
 * a partire dal primo scambio. Best-effort: in caso di errore
 * ritorna un fallback generico.
 */
export async function generateTitleFor(
  firstUserMessage: string,
  firstAssistantMessage: string,
): Promise<string> {
  const fallback = "Conversazione";
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: MODELS.title,
      ...TITLE_PARAMS,
      messages: [
        {
          role: "system",
          content:
            "Genera un titolo brevissimo (max 5 parole, italiano, senza virgolette e senza punteggiatura finale) che riassuma l'argomento di questa conversazione. Rispondi SOLO con il titolo.",
        },
        {
          role: "user",
          content: `UTENTE: ${firstUserMessage.slice(0, 300)}\n\nASSISTENTE: ${firstAssistantMessage.slice(0, 400)}`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return fallback;
    // Tieni solo la prima riga, rimuovi virgolette agli estremi
    const cleaned = raw.split("\n")[0]!.replace(/^["'`]+|["'`.!?]+$/g, "").trim();
    if (!cleaned) return fallback;
    return cleaned.length > 60 ? cleaned.slice(0, 60).trim() : cleaned;
  } catch (err) {
    console.error("[ai-title] generazione fallita", err);
    return fallback;
  }
}
