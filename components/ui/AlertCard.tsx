"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTransition } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { IconChevron } from "./icons";
import { segnaAvvisoComeLetto } from "@/lib/actions/avvisi";

interface AlertCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
  href: string;
  avvisoKey?: string;
}

export function AlertCard({
  icon,
  title,
  subtitle,
  color,
  href,
  avvisoKey,
}: AlertCardProps) {
  const [pending, startTransition] = useTransition();

  function onMarkRead(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!avvisoKey) return;
    startTransition(async () => {
      await segnaAvvisoComeLetto(avvisoKey);
    });
  }

  return (
    <Card
      className="flex items-center gap-3 p-0"
      style={{ borderLeft: `4px solid ${color ?? "var(--primary)"}` }}
    >
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0 p-3.5">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text">{title}</div>
          {subtitle && (
            <div className="text-xs text-(--text-secondary) mt-0.5">{subtitle}</div>
          )}
        </div>
      </Link>
      {avvisoKey && (
        <Button
          type="button"
          variant="icon"
          onClick={onMarkRead}
          disabled={pending}
          aria-label="Segna come letto"
          className="text-(--primary) text-lg mr-1 shrink-0"
        >
          ✓
        </Button>
      )}
      <IconChevron size={18} color="var(--text-secondary)" />
    </Card>
  );
}
