import type { ReactNode } from "react";

// Layout minimale per le pagine pubbliche (/p/<slug>): nessun TabBar/FAB.
// Resta dentro app-frame perché il root layout già lo applica.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="screen-scroll min-h-0">{children}</div>;
}
