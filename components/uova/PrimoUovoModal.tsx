"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { defaultEmojiFor } from "@/lib/utils/avatar";
import type { PrimoUovo } from "@/app/(app)/uova/actions";

interface Props {
  prime: PrimoUovo[];
  onClose: () => void;
}

export function PrimoUovoModal({ prime, onClose }: Props) {
  return (
    <Modal title="" onClose={onClose}>
      <div
        className="rounded-2xl px-4 py-5 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--primary-lighter), #FFE07A22)",
        }}
      >
        <div className="text-6xl animate-bounce" aria-hidden>
          🎉
        </div>
        <h2 className="font-serif text-2xl font-bold mt-3 mb-0">
          Che giornata speciale!
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {prime.map((p) => (
          <div key={p.animaleId} className="flex items-center gap-3">
            <Avatar
              src={p.fotoUrl ?? undefined}
              emoji={!p.fotoUrl ? defaultEmojiFor("gallina") : undefined}
              name={p.nome}
              size={64}
            />
            <div>
              <div className="font-semibold text-base text-text">{p.nome}</div>
              <div className="text-sm text-(--text-secondary)">
                ha fatto il suo primo uovo! 🥚
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button fullWidth size="lg" className="mt-5" onClick={onClose}>
        Festeggiamo! 🎈
      </Button>
    </Modal>
  );
}
