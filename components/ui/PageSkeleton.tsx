import { Header } from "./Header";
import { ScreenContainer } from "./ScreenContainer";
import { Card } from "./Card";

interface PageSkeletonProps {
  title: string;
  rows?: number;
  withStats?: boolean;
}

/**
 * Skeleton riutilizzabile per le pagine principali: Header + N card
 * con barre pulse. Volutamente generico — match approssimativo della
 * pagina reale, l'overlay di navigazione copre il resto.
 */
export function PageSkeleton({ title, rows = 4, withStats = false }: PageSkeletonProps) {
  return (
    <>
      <div data-poliner-page-skeleton hidden aria-hidden="true" />
      <Header title={title} />
      <ScreenContainer>
        {withStats && (
          <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="py-4 px-2">
                <div className="h-6 bg-[var(--border)] rounded animate-pulse mx-auto w-12" />
                <div className="h-3 bg-[var(--border)] rounded animate-pulse mt-2 mx-auto w-16" />
              </Card>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--border)] animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-[var(--border)] rounded animate-pulse w-2/3" />
                <div className="h-3 bg-[var(--border)] rounded animate-pulse w-1/3 mt-2" />
              </div>
            </Card>
          ))}
        </div>
      </ScreenContainer>
    </>
  );
}
