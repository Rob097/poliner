"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

const FRASI = [
  "Finisco di beccare…",
  "Adoro le granaglie…",
  "Solo un altro chicco…",
  "Sto facendo un giretto…",
  "Coccode…",
  "Spero ci siano vermetti…",
  "Sto solo curiosando…",
  "Razzolando…"
];
// Durata della transizione di fade per il fade-out.
const FADE_MS = 200;
// Ritardo prima di mostrare la scritta sotto la gallina. Se l'overlay
// finisce prima, la scritta non appare proprio.
const FRASE_DELAY_MS = 2000;
const NAVIGATION_FAILSAFE_MS = 10000;
const LOADING_MARKER_SELECTOR = "[data-poliner-page-skeleton]";

/**
 * Provider del NavigationOverlay.
 *
 * Strategia (Next 14 App Router):
 * - L'overlay viene "pre-mountato" nel DOM con visibility:hidden + opacity:0
 *   e mostrato via manipolazione diretta dello style (NON via setState React),
 *   in modo da bypassare il ciclo di rendering: se aspettassimo un re-render
 *   React, Next mostrerebbe lo skeleton/page prima che React abbia flushato
 *   il nostro setState.
 * - Il click listener è in **capture phase**, così scatta PRIMA dei click
 *   listener interni di Next/Link.
 * - Le navigazioni via `router.push/replace` vengono intercettate patchando
 *   `history.pushState/replaceState`, così l'overlay parte anche fuori dai
 *   `<Link>`.
 * - La chiusura non dipende più da un timer fisso: aspettiamo che la URL sia
 *   stata committata e, se compare uno skeleton di loading, che sparisca dal
 *   DOM. Per le route senza loading boundary usiamo un check al frame successivo.
 */
export function NavigationOverlayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentLocation = search ? `${pathname}?${search}` : pathname;
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const fraseRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fraseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationFailsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationCheckRafRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(false);
  const manualRequestsRef = useRef(0);
  const navigationPendingRef = useRef(false);
  const navigationCommittedRef = useRef(false);
  const lastLocationRef = useRef(currentLocation);

  useEffect(() => setMounted(true), []);

  function clearOverlayTimers() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (fraseTimerRef.current) {
      clearTimeout(fraseTimerRef.current);
      fraseTimerRef.current = null;
    }
  }

  function clearNavigationTimers() {
    if (navigationFailsafeTimerRef.current) {
      clearTimeout(navigationFailsafeTimerRef.current);
      navigationFailsafeTimerRef.current = null;
    }
    if (navigationCheckRafRef.current !== null) {
      cancelAnimationFrame(navigationCheckRafRef.current);
      navigationCheckRafRef.current = null;
    }
  }

  function showOverlay() {
    const el = overlayRef.current;
    if (!el) return;
    clearOverlayTimers();
    // Cambio frase ad ogni show per varietà.
    if (fraseRef.current) {
      fraseRef.current.textContent = FRASI[Math.floor(Math.random() * FRASI.length)];
      // La frase parte nascosta e appare solo se l'overlay dura > 2s.
      fraseRef.current.style.opacity = "0";
    }
    // Mutazione DOM sync — evita di dipendere dal React rendering.
    el.style.visibility = "visible";
    el.style.pointerEvents = "auto";
    // forza reflow per garantire che la transition di opacity venga applicata
    void el.offsetHeight;
    el.style.opacity = "1";
    isVisibleRef.current = true;

    // Dopo FRASE_DELAY_MS, se l'overlay è ancora visibile, mostra la frase.
    fraseTimerRef.current = setTimeout(() => {
      if (!isVisibleRef.current) return;
      if (fraseRef.current) fraseRef.current.style.opacity = "1";
      fraseTimerRef.current = null;
    }, FRASE_DELAY_MS);
  }

  function hideOverlay() {
    const el = overlayRef.current;
    if (!el) return;
    clearOverlayTimers();
    clearNavigationTimers();
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    isVisibleRef.current = false;
    hideTimerRef.current = setTimeout(() => {
      if (el) el.style.visibility = "hidden";
      // Resetta anche la frase per il prossimo show.
      if (fraseRef.current) fraseRef.current.style.opacity = "0";
    }, FADE_MS);
  }

  function hasLoadingMarker() {
    return document.querySelector(LOADING_MARKER_SELECTOR) !== null;
  }

  function settleOverlayVisibility() {
    if (manualRequestsRef.current > 0 || navigationPendingRef.current) return;
    hideOverlay();
  }

  function finishNavigation() {
    navigationPendingRef.current = false;
    navigationCommittedRef.current = false;
    clearNavigationTimers();
    settleOverlayVisibility();
  }

  function commitNavigation() {
    if (!navigationPendingRef.current || navigationCommittedRef.current) return;
    navigationCommittedRef.current = true;
    queueNavigationCompletionCheck();
  }

  function queueNavigationCompletionCheck() {
    if (!navigationPendingRef.current || !navigationCommittedRef.current) return;
    if (navigationCheckRafRef.current !== null) {
      cancelAnimationFrame(navigationCheckRafRef.current);
    }
    navigationCheckRafRef.current = requestAnimationFrame(() => {
      navigationCheckRafRef.current = requestAnimationFrame(() => {
        navigationCheckRafRef.current = null;
        if (!navigationPendingRef.current || !navigationCommittedRef.current) return;
        if (!hasLoadingMarker()) finishNavigation();
      });
    });
  }

  function startNavigation() {
    if (!navigationPendingRef.current) {
      navigationCommittedRef.current = false;
    }
    manualRequestsRef.current = 0;
    navigationPendingRef.current = true;
    clearNavigationTimers();
    showOverlay();
    navigationFailsafeTimerRef.current = setTimeout(() => {
      finishNavigation();
    }, NAVIGATION_FAILSAFE_MS);
  }

  function toInternalLocation(url: string | URL | null | undefined) {
    if (!url) return null;
    try {
      const nextUrl = new URL(url.toString(), window.location.href);
      if (nextUrl.origin !== window.location.origin) return null;
      return `${nextUrl.pathname}${nextUrl.search}`;
    } catch {
      return null;
    }
  }

  function maybeStartNavigation(url: string | URL | null | undefined) {
    const nextLocation = toInternalLocation(url);
    if (!nextLocation) return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (nextLocation === current) return;
    startNavigation();
  }

  useEffect(() => {
    if (lastLocationRef.current === currentLocation) return;
    lastLocationRef.current = currentLocation;
    commitNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const nextLocation = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (nextLocation === current) return;

      // Capture phase + DOM diretto: si vede prima che Next inizi la transition.
      startNavigation();
    }

    // useCapture = true: scattiamo prima dei listener bubble di Next/<Link>.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!navigationPendingRef.current || !navigationCommittedRef.current) return;
      if (!hasLoadingMarker()) finishNavigation();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(data, unused, url) {
      maybeStartNavigation(url);
      return originalPushState.apply(window.history, [data, unused, url]);
    };

    window.history.replaceState = function replaceState(data, unused, url) {
      maybeStartNavigation(url);
      return originalReplaceState.apply(window.history, [data, unused, url]);
    };

    function onPopState() {
      const nextLocation = `${window.location.pathname}${window.location.search}`;
      if (nextLocation === lastLocationRef.current) return;

      startNavigation();

      // Con browser back / edge-swipe su mobile la URL è già cambiata quando
      // arriva il popstate, ma `usePathname()` può aggiornarsi più tardi.
      // Segniamo quindi subito la navigation come committata, così il provider
      // può chiudersi appena non vede più loading markers invece di attendere
      // il failsafe da 10s.
      commitNavigation();
    }

    window.addEventListener("popstate", onPopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Espone funzioni globali per mostrare/nascondere l'overlay durante
  // operazioni async esplicite. Se nel frattempo parte una navigazione,
  // la request manuale viene "promossa" e l'overlay resta aperto fino al
  // route-ready.
  useEffect(() => {
    type W = Window & {
      __polinerShowOverlay?: () => void;
      __polinerHideOverlay?: () => void;
    };
    (window as W).__polinerShowOverlay = () => {
      manualRequestsRef.current += 1;
      showOverlay();
    };
    (window as W).__polinerHideOverlay = () => {
      manualRequestsRef.current = Math.max(0, manualRequestsRef.current - 1);
      settleOverlayVisibility();
    };
    return () => {
      (window as W).__polinerShowOverlay = undefined;
      (window as W).__polinerHideOverlay = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children}
      {mounted ? <OverlayPortal overlayRef={overlayRef} fraseRef={fraseRef} /> : null}
    </>
  );
}

/**
 * Mostra l'overlay per operazioni esplicite lato client.
 * Se subito dopo parte anche una navigazione, il provider la prende in carico
 * e chiuderà l'overlay solo quando la route sarà pronta.
 */
export function showLoadingOverlay() {
  type W = Window & { __polinerShowOverlay?: () => void };
  if (typeof window === "undefined") return;
  (window as W).__polinerShowOverlay?.();
}

/**
 * Chiude una richiesta overlay esplicita.
 * Utile per operazioni async che non causano cambio di route, oppure come
 * chiusura del ramo "save" quando una successiva navigazione ha già preso il
 * controllo della visibilità.
 */
export function hideLoadingOverlay() {
  type W = Window & { __polinerHideOverlay?: () => void };
  if (typeof window === "undefined") return;
  (window as W).__polinerHideOverlay?.();
}

/**
 * Esegue una promise mostrando l'overlay durante l'attesa.
 * Restituisce il risultato della promise (o la propaga in caso di errore).
 */
export async function withLoadingOverlay<T>(promise: Promise<T>): Promise<T> {
  showLoadingOverlay();
  try {
    return await promise;
  } finally {
    hideLoadingOverlay();
  }
}

function OverlayPortal({
  overlayRef,
  fraseRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement>;
  fraseRef: React.RefObject<HTMLDivElement>;
}) {
  const fraseIniziale = useMemo(
    () => FRASI[Math.floor(Math.random() * FRASI.length)],
    [],
  );

  return createPortal(
    <div
      ref={overlayRef}
      aria-busy="true"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: 0,
        visibility: "hidden",
        pointerEvents: "none",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <ChickenSvg />
        <div
          ref={fraseRef}
          className="font-serif text-base font-bold text-[var(--text)]"
          style={{
            opacity: 0,
            transition: "opacity 350ms ease",
          }}
        >
          {fraseIniziale}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChickenSvg() {
  return (
    <svg
      viewBox="0 0 120 110"
      width={120}
      height={110}
      aria-hidden="true"
      className="animate-wobble drop-shadow-[0_6px_8px_rgba(0,0,0,0.08)]"
    >
      {/* Zampe */}
      <line x1="48" y1="92" x2="48" y2="104" stroke="#b87333" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="64" y1="92" x2="64" y2="104" stroke="#b87333" strokeWidth="2.5" strokeLinecap="round" />
      {/* Briciole a terra */}
      <circle cx="22" cy="103" r="2" fill="#b87333" opacity="0.55" />
      <circle cx="30" cy="106" r="1.6" fill="#b87333" opacity="0.45" />
      <circle cx="14" cy="106" r="1.4" fill="#b87333" opacity="0.4" />
      {/* Corpo */}
      <ellipse cx="58" cy="72" rx="32" ry="22" fill="#FFE4D0" stroke="#E8C9A8" strokeWidth="1.5" />
      {/* Ala */}
      <path
        d="M44 70 Q 58 56 76 68 Q 70 80 50 80 Z"
        fill="#F8C9A0"
        stroke="#E8B07A"
        strokeWidth="1.2"
      />
      {/* Coda */}
      <path
        d="M88 65 Q 100 56 102 70 Q 100 78 92 78 Z"
        fill="#F4B07A"
        stroke="#D8965E"
        strokeWidth="1.2"
      />
      {/* Gruppo testa: ruota per il "beccare" */}
      <g
        className="origin-[36px_70px] animate-peck"
        style={{ transformOrigin: "36px 70px", transformBox: "fill-box" as never }}
      >
        {/* Collo */}
        <ellipse cx="36" cy="62" rx="8" ry="10" fill="#FFE4D0" stroke="#E8C9A8" strokeWidth="1.2" />
        {/* Testa */}
        <circle cx="34" cy="50" r="11" fill="#FFE4D0" stroke="#E8C9A8" strokeWidth="1.4" />
        {/* Cresta */}
        <path
          d="M30 41 Q 32 33 36 41 Q 40 33 42 41 Z"
          fill="#E8678A"
          stroke="#C04A6E"
          strokeWidth="1"
        />
        {/* Bargigli */}
        <ellipse cx="32" cy="58" rx="2.4" ry="3.2" fill="#E8678A" stroke="#C04A6E" strokeWidth="0.8" />
        {/* Occhio */}
        <circle cx="32" cy="48" r="1.6" fill="#2e2924" />
        {/* Becco */}
        <polygon points="22,50 14,52 22,54" fill="#FFA94D" stroke="#D88928" strokeWidth="0.8" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
