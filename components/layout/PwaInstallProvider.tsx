"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallAvailability = "native" | "ios-manual" | "unavailable";

interface PwaInstallContextValue {
  availability: InstallAvailability;
  isInstalled: boolean;
  isIos: boolean;
  isSafari: boolean;
  requestInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function isInstalledMode() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;
  const isTouchMac =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(userAgent) || isTouchMac;
}

function isSafariBrowser() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;

  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(userAgent);
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [nativePrompt, setNativePrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(isInstalledMode());
    setIsIos(isIosDevice());
    setIsSafari(isSafariBrowser());

    const displayMode = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setNativePrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setNativePrompt(null);
    };

    const handleDisplayModeChange = (event?: MediaQueryListEvent) => {
      if (event?.matches ?? displayMode.matches) {
        setIsInstalled(true);
        setNativePrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (typeof displayMode.addEventListener === "function") {
      displayMode.addEventListener("change", handleDisplayModeChange);
    } else {
      displayMode.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);

      if (typeof displayMode.removeEventListener === "function") {
        displayMode.removeEventListener("change", handleDisplayModeChange);
      } else {
        displayMode.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const availability: InstallAvailability = isInstalled
    ? "unavailable"
    : nativePrompt
      ? "native"
      : isIos
        ? "ios-manual"
        : "unavailable";

  async function requestInstall() {
    if (!nativePrompt) return "unavailable";

    await nativePrompt.prompt();
    const result = await nativePrompt.userChoice;

    setNativePrompt(null);

    return result.outcome;
  }

  return (
    <PwaInstallContext.Provider
      value={{
        availability,
        isInstalled,
        isIos,
        isSafari,
        requestInstall,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }

  return context;
}