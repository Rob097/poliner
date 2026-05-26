"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/lib/hooks/usePagination";
import { ConversationCard } from "@/components/chat/ConversationCard";
import {
  createConversation,
  deleteConversation,
  renameConversation,
  type ConversationSummary,
} from "./actions";

interface Props {
  conversations: ConversationSummary[];
}

export function ChatListClient({ conversations }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const { visible, hasMore, remaining, loadMore } = usePagination(conversations);

  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    titolo: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function onNuova() {
    startTransition(async () => {
      const res = await createConversation();
      if (res.ok) {
        router.push(`/chat/${res.id}`);
      }
    });
  }

  function openRename(id: string, titoloAttuale: string) {
    setRenameTarget({ id, titolo: titoloAttuale });
    setRenameValue(titoloAttuale);
  }

  function confermaRinomina() {
    if (!renameTarget) return;
    const nuovo = renameValue.trim();
    if (!nuovo) return;
    const target = renameTarget;
    startTransition(async () => {
      const res = await renameConversation(target.id, nuovo);
      if (!res.ok) {
        show(res.error ?? "Non riesco a rinominare.");
        return;
      }
      setRenameTarget(null);
      router.refresh();
    });
  }

  function eliminaConversazione(id: string) {
    if (!confirm("Eliminare questa conversazione?")) return;
    startTransition(async () => {
      const res = await deleteConversation(id);
      if (!res.ok) {
        show(res.error ?? "Non riesco a eliminare.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Button onClick={onNuova} disabled={isPending} fullWidth size="lg">
        {isPending ? "Apro la chat..." : "+ Nuova conversazione"}
      </Button>

      {conversations.length === 0 ? (
        <div className="bg-white border border-(--border) rounded-2xl px-4 py-6 text-center">
          <div className="text-4xl mb-2" aria-hidden>
            ✨
          </div>
          <div className="font-semibold text-text mb-1">Nessuna conversazione</div>
          <div className="text-[13px] text-(--text-secondary)">
            Tocca "Nuova conversazione" per iniziare. L'assistente conosce il tuo
            pollaio e può aiutarti con domande, dubbi sulle galline e funzioni
            dell'app.
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((c) => (
              <ConversationCard
                key={c.id}
                item={c}
                onRename={openRename}
                onDelete={eliminaConversazione}
              />
            ))}
          </div>
          {hasMore && (
            <LoadMoreButton onClick={loadMore} remaining={remaining} />
          )}
        </>
      )}

      {renameTarget && (
        <Modal title="Rinomina conversazione" onClose={() => setRenameTarget(null)}>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={80}
            className="w-full bg-white border border-(--border) rounded-xl px-3 py-2.5 text-[15px] outline-none focus:border-(--primary)"
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setRenameTarget(null)}
            >
              Annulla
            </Button>
            <Button
              fullWidth
              onClick={confermaRinomina}
              disabled={!renameValue.trim() || isPending}
            >
              Salva
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
