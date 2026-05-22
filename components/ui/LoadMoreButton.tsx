"use client";

import { Button } from "@/components/ui/Button";

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
      className={`mt-3 ${className ?? ""}`}
    >
      Mostra altri ({remaining} rimanenti)
    </Button>
  );
}
