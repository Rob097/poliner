"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { ConversationCard } from "@/components/chat/ConversationCard";
import { createConversation, type ConversationSummary } from "./actions";

interface Props {
  conversations: ConversationSummary[];
}

export function ChatListClient({ conversations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { visible, hasMore, remaining, loadMore } = usePagination(conversations);

  function onNuova() {
    startTransition(async () => {
      const res = await createConversation();
      if (res.ok) {
        router.push(`/chat/${res.id}`);
      }
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
              <ConversationCard key={c.id} item={c} />
            ))}
          </div>
          {hasMore && (
            <LoadMoreButton onClick={loadMore} remaining={remaining} />
          )}
        </>
      )}
    </div>
  );
}
