"use client";

import { useState, type ReactNode } from "react";
import { TabBar } from "./TabBar";
import { FABMenu } from "./FABMenu";
import { InstallPrompt } from "./InstallPrompt";
import { ToastProvider } from "@/components/ui/Toast";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToastProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      {children}
      <InstallPrompt />
      <TabBar onFab={() => setFabOpen(true)} />
      <FABMenu open={fabOpen} onClose={() => setFabOpen(false)} />
    </>
  );
}
