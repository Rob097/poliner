"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { TabBar } from "./TabBar";
import { FABMenu } from "./FABMenu";
import { InstallPrompt } from "./InstallPrompt";
import { PwaInstallProvider } from "./PwaInstallProvider";
import { NavigationOverlayProvider } from "./NavigationOverlay";
import { ToastProvider } from "@/components/ui/Toast";
import {
  isPushSupported,
  isSubscribed,
  migratePushSubscriptionToAppWorker,
} from "@/lib/push/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <PwaInstallProvider>
        <Suspense fallback={<AppShellInner>{children}</AppShellInner>}>
          <NavigationOverlayProvider>
            <AppShellInner>{children}</AppShellInner>
          </NavigationOverlayProvider>
        </Suspense>
      </PwaInstallProvider>
    </ToastProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !isPushSupported()) return;
    if (Notification.permission !== "granted") return;

    void (async () => {
      if (!(await isSubscribed())) return;

      await migratePushSubscriptionToAppWorker(VAPID_PUBLIC_KEY);
    })();
  }, []);

  return (
    <>
      {children}
      <InstallPrompt />
      <TabBar onFab={() => setFabOpen(true)} />
      <FABMenu open={fabOpen} onClose={() => setFabOpen(false)} />
    </>
  );
}
