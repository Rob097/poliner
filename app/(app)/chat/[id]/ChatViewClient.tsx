"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { IconBack, IconTrash, IconEdit } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Composer, type AllegatoLocale } from "@/components/chat/Composer";
import { MessageBubble, type BubbleMessage } from "@/components/chat/MessageBubble";
import { ToolCallChip } from "@/components/chat/ToolCallChip";
import {
  deleteConversation,
  renameConversation,
  type ChatMessage,
  type ConversationSummary,
} from "../actions";

interface Props {
  conversation: ConversationSummary;
  initialMessages: ChatMessage[];
  userId: string;
}

interface PendingAssistant {
  text: string;
  toolCall: string | null;
}

export function ChatViewClient({ conversation, initialMessages, userId }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [, startTransition] = useTransition();

  const initialBubbles: BubbleMessage[] = initialMessages
    .filter((m) => m.ruolo === "user" || m.ruolo === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.ruolo as "user" | "assistant",
      content: m.contenuto,
      allegati: m.allegati,
    }));

  const [messages, setMessages] = useState<BubbleMessage[]>(initialBubbles);
  const [pending, setPending] = useState<PendingAssistant | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [titolo, setTitolo] = useState(conversation.titolo);
  const [showMenu, setShowMenu] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(titolo);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const inviaMessaggio = useCallback(
    async (text: string, allegati: AllegatoLocale[]) => {
      setErrore(null);
      const localUserId = `u-${Date.now()}`;
      setMessages((cur) => [
        ...cur,
        { id: localUserId, role: "user", content: text, allegati },
      ]);
      setPending({ text: "", toolCall: null });

      let res: Response;
      try {
        res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            userMessage: text,
            allegati,
          }),
        });
      } catch {
        setPending(null);
        setErrore("Non riesco a contattare l'assistente. Controlla la connessione e riprova.");
        return;
      }

      if (res.status === 429) {
        setPending(null);
        const body = await res.json().catch(() => null);
        setErrore(body?.error ?? "Hai raggiunto il limite di messaggi di oggi.");
        return;
      }
      if (!res.ok || !res.body) {
        setPending(null);
        const body = await res.json().catch(() => null);
        setErrore(body?.error ?? "C'è stato un intoppo nel parlare con l'assistente. Riprova tra poco.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let streamError: string | null = null;
      let nuovoTitolo: string | null = null;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const raw of events) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload) as Record<string, unknown>;
              const t = evt.type as string;
              if (t === "token" && typeof evt.delta === "string") {
                finalText += evt.delta;
                setPending({ text: finalText, toolCall: null });
              } else if (t === "tool_call" && typeof evt.name === "string") {
                setPending((p) => ({ text: p?.text ?? finalText, toolCall: evt.name as string }));
              } else if (t === "title" && typeof evt.titolo === "string") {
                nuovoTitolo = evt.titolo;
              } else if (t === "error") {
                streamError = (evt.message as string) ?? "Errore inatteso.";
              }
            } catch {
              /* ignora payload malformati */
            }
          }
        }
      } catch {
        streamError = "La connessione si è interrotta. Riprova.";
      }

      setPending(null);
      if (streamError) {
        setErrore(streamError);
        return;
      }
      const localId = `a-${Date.now()}`;
      setMessages((cur) => [
        ...cur,
        { id: localId, role: "assistant", content: finalText },
      ]);
      if (nuovoTitolo) setTitolo(nuovoTitolo);
    },
    [conversation.id],
  );

  function onElimina() {
    if (!confirm("Eliminare questa conversazione?")) return;
    startTransition(async () => {
      const res = await deleteConversation(conversation.id);
      if (!res.ok) {
        show(res.error ?? "Non riesco a eliminare.");
        return;
      }
      router.push("/chat");
      router.refresh();
    });
  }

  function onRinomina() {
    setRenameValue(titolo);
    setRenameOpen(true);
    setShowMenu(false);
  }

  function confermaRinomina() {
    const nuovo = renameValue.trim();
    if (!nuovo) return;
    startTransition(async () => {
      const res = await renameConversation(conversation.id, nuovo);
      if (!res.ok) {
        show(res.error ?? "Non riesco a rinominare.");
        return;
      }
      setTitolo(nuovo);
      setRenameOpen(false);
    });
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ paddingBottom: "var(--tab-bar-height, 0px)" }}
    >
      <Header
        title={titolo}
        onBack={() => router.push("/chat")}
        right={
          <div className="relative">
            <Button
              variant="icon"
              onClick={() => setShowMenu((v) => !v)}
              aria-label="Menu conversazione"
            >
              <span className="text-xl leading-none">⋯</span>
            </Button>
            {showMenu && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setShowMenu(false)}
                  aria-label="Chiudi menu"
                />
                <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-(--border) rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                  <button
                    type="button"
                    onClick={onRinomina}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-(--surface-alt) text-[14px]"
                  >
                    <IconEdit size={16} /> Rinomina
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onElimina();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-(--surface-alt) text-[14px] text-(--danger, #C0392B)"
                  >
                    <IconTrash size={16} /> Elimina
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {messages.length === 0 && !pending && (
          <div className="text-center text-[14px] text-(--text-secondary) py-8">
            Scrivi un messaggio per iniziare. Posso aiutarti con il tuo pollaio,
            domande sulle galline e sulle funzioni dell'app.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && (
          <div className="flex flex-col gap-2">
            {pending.toolCall && (
              <div className="flex justify-start ml-10">
                <ToolCallChip toolName={pending.toolCall} />
              </div>
            )}
            <MessageBubble
              message={{
                id: "pending",
                role: "assistant",
                content: pending.text,
                isStreaming: true,
              }}
            />
          </div>
        )}
        {errore && (
          <div className="bg-(--surface-alt) border border-(--border) rounded-2xl px-4 py-3 text-[14px] text-text">
            {errore}
            <button
              type="button"
              onClick={() => setErrore(null)}
              className="ml-2 underline text-(--text-secondary)"
            >
              ok
            </button>
          </div>
        )}
      </div>

      <Composer
        conversationId={conversation.id}
        userId={userId}
        disabled={pending !== null}
        onSend={inviaMessaggio}
      />

      {renameOpen && (
        <Modal title="Rinomina conversazione" onClose={() => setRenameOpen(false)}>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={80}
            className="w-full bg-white border border-(--border) rounded-xl px-3 py-2.5 text-[15px] outline-none focus:border-(--primary)"
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" fullWidth onClick={() => setRenameOpen(false)}>
              Annulla
            </Button>
            <Button fullWidth onClick={confermaRinomina} disabled={!renameValue.trim()}>
              Salva
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
