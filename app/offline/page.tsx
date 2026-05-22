import { PolinerLogo } from "@/components/brand/PolinerLogo";

// Pagina servita dal service worker quando l'utente è offline e la pagina
// richiesta non è in cache. Mantienila piccola (cached al primo load).
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 h-dvh">
      <div className="text-7xl mb-4">🌐</div>
      <PolinerLogo size="md" />
      <h1 className="font-serif text-2xl font-bold text-text mt-6 mb-2">
        Sei offline
      </h1>
      <p className="text-[15px] text-(--text-secondary) max-w-sm leading-relaxed">
        Non riesco a connettermi al pollaio digitale.
        <br />
        Controlla la connessione e riprova.
      </p>
      <p className="text-xs text-(--text-secondary) mt-6 italic">
        Le pagine che hai già visitato continueranno a funzionare offline.
      </p>
    </div>
  );
}
