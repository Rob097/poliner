"use client";

import { useState, type ReactNode } from "react";
import { TabBar } from "./TabBar";
import { FABMenu } from "./FABMenu";
import { InstallPrompt } from "./InstallPrompt";
import { ToastProvider, useToast } from "@/components/ui/Toast";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToastProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);
  const { show } = useToast();

  return (
    <>
      {children}
      <InstallPrompt />
      <TabBar onFab={() => setFabOpen(true)} />
      <FABMenu
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onAddCleaning={(ok) =>
          show(ok ? "✓ Pulizia casetta registrata!" : "Ops, riprova!")
        }
      />
    </>
  );
}
