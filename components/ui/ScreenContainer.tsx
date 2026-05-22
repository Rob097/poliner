import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ScreenContainerProps {
  children: ReactNode;
  header?: ReactNode;
  /** Aggiunge padding orizzontale + verticale di default */
  pad?: boolean;
  className?: string;
}

export function ScreenContainer({ children, header, pad = true, className }: ScreenContainerProps) {
  return (
    <div className={cn("screen-scroll pad-tab", className)}>
      {header ? <div className="sticky top-0 z-20 bg-[var(--bg)]">{header}</div> : null}
      <div
        className={cn(
          // `pt-2` evita che il primo elemento tocchi il bordo dell'Header.
          // `px-4` padding orizzontale uniforme.
          pad && "px-4 pt-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}
