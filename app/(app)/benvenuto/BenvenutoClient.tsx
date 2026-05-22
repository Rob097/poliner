"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  pollaioNome: string;
  ruolo: "admin" | "guest";
  isStessoCheAttivo: boolean;
  attualeRuolo: "admin" | "guest";
}

/**
 * Pagina di benvenuto mostrata dopo la creazione di un nuovo pollaio,
 * uno switch o l'accettazione di un invito. Mostra un'animazione breve
 * (~1.6s) e poi redirige alla home.
 */
export function BenvenutoClient({ pollaioNome, ruolo }: Props) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1600);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-7xl animate-bounce" aria-hidden>
        🐔
      </div>
      <h1 className="font-serif text-2xl font-bold mt-6 mb-2 animate-slide-up">
        Benvenuta/o nel pollaio
      </h1>
      <p className="text-[20px] font-bold text-(--primary) m-0 animate-slide-up">
        {pollaioNome}
      </p>
      <p className="text-sm text-(--text-secondary) mt-4 animate-fade-in max-w-xs">
        {ruolo === "admin"
          ? "Sei admin: puoi fare tutto qui dentro!"
          : "Sei guest: puoi guardare e fare richieste di uova."}
      </p>
    </div>
  );
}
