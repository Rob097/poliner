"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconChicken, IconEgg, IconMenu, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type TabId = "home" | "galline" | "uova" | "menu";

interface Tab {
  id: TabId;
  label: string;
  href: string;
  Icon: typeof IconHome;
}

const TABS: Tab[] = [
  { id: "home", label: "Home", href: "/", Icon: IconHome },
  { id: "galline", label: "Galline", href: "/galline", Icon: IconChicken },
  { id: "uova", label: "Uova", href: "/uova", Icon: IconEgg },
  { id: "menu", label: "Menu", href: "/menu", Icon: IconMenu },
];

interface TabBarProps {
  onFab: () => void;
}

export function TabBar({ onFab }: TabBarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const rootStyle = document.documentElement.style;
    let rafId = 0;

    const syncHeight = () => {
      const navHeight = Math.ceil(nav.getBoundingClientRect().height);

      // Ignora misure transitorie troppo basse durante resize/keyboard animation.
      if (navHeight < 56) return;

      rootStyle.setProperty("--tab-bar-height", `${navHeight}px`);
    };

    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(syncHeight);
      });
    };

    scheduleSync();

    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(nav);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };

    window.addEventListener("resize", scheduleSync);
    window.addEventListener("pageshow", scheduleSync);
    window.visualViewport?.addEventListener("resize", scheduleSync);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("pageshow", scheduleSync);
      window.visualViewport?.removeEventListener("resize", scheduleSync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      rootStyle.removeProperty("--tab-bar-height");
    };
  }, []);

  // Match attivo: home solo per "/", altri prefisso
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-white border-t border-(--border) px-2 min-[500px]:absolute"
      style={{ paddingTop: 6, paddingBottom: "calc(env(safe-area-inset-bottom, 4px) + 6px)" }}
    >
      {TABS.slice(0, 2).map((tab) => (
        <TabItem key={tab.id} tab={tab} active={isActive(tab.href)} />
      ))}

      {/* FAB */}
      <button
        type="button"
        onClick={onFab}
        aria-label="Azione rapida"
        className="w-[52px] h-[52px] rounded-full bg-(--primary) border-none cursor-pointer flex items-center justify-center shadow-fab transition-transform active:scale-90 -mt-4 relative z-2"
      >
        <IconPlus size={26} color="#fff" />
      </button>

      {TABS.slice(2).map((tab) => (
        <TabItem key={tab.id} tab={tab} active={isActive(tab.href)} />
      ))}
    </nav>
  );
}

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const { Icon, label, href } = tab;
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-[2px] py-1 px-3 text-[11px] font-semibold transition-colors no-underline",
        active ? "text-(--primary)" : "text-(--text-secondary)",
      )}
    >
      <Icon size={22} color={active ? "var(--primary)" : "var(--text-secondary)"} />
      <span>{label}</span>
    </Link>
  );
}
