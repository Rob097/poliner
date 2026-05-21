import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";

export default function GallinaDetailLoading() {
  return (
    <>
      <Header title="…" />
      <div className="screen-scroll pad-tab px-4 pt-2">
        <Card className="text-center py-6">
          <div className="h-20 w-20 rounded-full bg-[var(--border)] animate-pulse mx-auto" />
          <div className="h-6 bg-[var(--border)] rounded animate-pulse mt-3 mx-auto w-32" />
          <div className="h-3 bg-[var(--border)] rounded animate-pulse mt-2 mx-auto w-44" />
          <div className="flex justify-center gap-6 mt-5 pt-4 border-t border-[var(--border)]">
            <div className="h-8 w-12 bg-[var(--border)] rounded animate-pulse" />
            <div className="h-8 w-12 bg-[var(--border)] rounded animate-pulse" />
            <div className="h-8 w-12 bg-[var(--border)] rounded animate-pulse" />
          </div>
        </Card>
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="h-4 bg-[var(--border)] rounded animate-pulse w-1/2" />
              <div className="h-3 bg-[var(--border)] rounded animate-pulse w-2/3 mt-2" />
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
