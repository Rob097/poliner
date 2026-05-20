import type { ReactNode } from "react";
import type { RuoloPollaio } from "@/lib/supabase/queries";

interface PermissionGateProps {
  ruolo: RuoloPollaio;
  required: RuoloPollaio;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Mostra `children` solo se il ruolo corrente soddisfa il requisito.
 * Tipicamente `required="admin"` per nascondere CTA di scrittura ai guest.
 */
export function PermissionGate({ ruolo, required, children, fallback = null }: PermissionGateProps) {
  if (required === "admin" && ruolo !== "admin") return <>{fallback}</>;
  return <>{children}</>;
}

export function isAdmin(ruolo: RuoloPollaio | null | undefined): boolean {
  return ruolo === "admin";
}
