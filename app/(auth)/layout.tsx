import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="screen-scroll h-full">
      <div className="flex min-h-full flex-col px-6 py-8">{children}</div>
    </div>
  );
}
