"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface LoadMoreButtonProps {
  onClick: () => void;
  remaining: number;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  remaining,
  className,
}: LoadMoreButtonProps) {
  return (
    <Button
      variant="secondary"
      fullWidth
      onClick={onClick}
      className={cn("mt-3", className)}
    >
      Mostra altri ({remaining} rimanenti)
    </Button>
  );
}
