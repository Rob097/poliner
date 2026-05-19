import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  bg?: string;
  small?: boolean;
  className?: string;
}

export function Badge({ children, color, bg, small, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full whitespace-nowrap font-semibold",
        small ? "px-2 py-[2px] text-[11px]" : "px-2.5 py-[3px] text-xs",
        className,
      )}
      style={{
        background: bg ?? "var(--primary-light)",
        color: color ?? "var(--primary)",
      }}
    >
      {children}
    </span>
  );
}
