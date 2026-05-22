import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-6xl mb-3" aria-hidden>🐔</div>
      <h1 className="font-serif text-2xl font-bold mb-2">Pagina non disponibile</h1>
      <p className="text-sm text-(--text-secondary) leading-relaxed max-w-sm">
        Questa pagina pubblica non esiste o è stata disattivata.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-semibold text-(--primary)"
      >
        Vai su Poliner →
      </Link>
    </main>
  );
}
