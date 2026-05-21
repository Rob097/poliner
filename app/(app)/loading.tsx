import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function HomeLoading() {
  return <PageSkeleton title="Poliner" rows={5} withStats />;
}
