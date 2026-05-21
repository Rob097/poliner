import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function MeteoLoading() {
  return <PageSkeleton title="Meteo" rows={4} withStats />;
}
