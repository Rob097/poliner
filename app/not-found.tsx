import Link from "next/link";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 h-dvh">
      <div className="text-7xl mb-4">🐔</div>
      <PolinerLogo size="md" />
      <h1 className="font-serif text-2xl font-bold text-text mt-6 mb-2">
        Pagina non trovata
      </h1>
      <p className="text-[15px] text-(--text-secondary) max-w-sm">
        Ops, questa pagina è volata via dal pollaio. Torniamo alla home?
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button size="lg">Torna al pollaio</Button>
        </Link>
      </div>
    </div>
  );
}
