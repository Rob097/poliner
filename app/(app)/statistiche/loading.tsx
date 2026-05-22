import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";

// Skeleton mostrato mentre Recharts carica.
export default function StatisticheLoading() {
  return (
    <ScreenContainer header={<Header title="Statistiche" />}>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="py-4 px-2">
              <div className="h-6 bg-[var(--border)] rounded animate-pulse mx-auto w-12" />
              <div className="h-3 bg-[var(--border)] rounded animate-pulse mt-2 mx-auto w-16" />
            </Card>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-[var(--border)] rounded animate-pulse w-32 mb-2" />
              <Card>
                <div className="h-40 bg-[var(--border)] rounded animate-pulse" />
              </Card>
            </div>
          ))}
        </div>
    </ScreenContainer>
  );
}
