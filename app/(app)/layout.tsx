import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { requirePollaio } from "@/lib/supabase/queries";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { ruolo } = await requirePollaio();
  return <AppShell ruolo={ruolo}>{children}</AppShell>;
}
