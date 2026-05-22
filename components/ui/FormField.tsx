import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface FormFieldProps {
  label?: string;
  children: ReactNode;
  className?: string;
  error?: string;
}

export function FormField({ label, children, className, error }: FormFieldProps) {
  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label className="block text-[13px] font-semibold text-(--text-secondary) mb-1.5">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-[#c0435a]">{error}</p>}
    </div>
  );
}
