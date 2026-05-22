"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  bg: string;
  desc: string;
  href: string;
}

export function MenuClient({ items }: { items: MenuItem[] }) {
  const router = useRouter();

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Header title="Menu" />
      <ScreenContainer>
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item) => (
            <Card
              key={item.id}
              clickable
              onClick={() => router.push(item.href)}
              className="text-center px-3 py-5"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2.5"
                style={{ background: `${item.bg}44` }}
              >
                {item.icon}
              </div>
              <div className="font-bold text-sm text-text">{item.label}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.desc}</div>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Button variant="secondary" fullWidth onClick={onLogout} className="text-[#c0435a]">
            {"Esci dall'account"}
          </Button>
        </div>
      </ScreenContainer>
    </>
  );
}
