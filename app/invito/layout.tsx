import type { ReactNode } from "react";

export default function InvitoLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col min-h-full px-6 py-8">{children}</div>;
}
