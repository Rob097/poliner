import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { IconBack } from "./icons";

interface HeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  transparent?: boolean;
  className?: string;
}

export function Header({ title, subtitle, onBack, right, transparent, className }: HeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        transparent ? "bg-transparent" : "bg-(--bg) border-b border-(--border)",
        className,
      )}
    >
      {onBack && (
        <Button variant="icon" onClick={onBack} aria-label="Indietro">
          <IconBack size={22} />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-serif font-bold text-[20px] text-text leading-tight">{title}</div>
        )}
        {subtitle && (
          <div className={cn(title ? "text-[13px] text-(--text-secondary) mt-0.5" : "text-text")}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}
