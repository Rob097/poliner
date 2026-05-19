import type { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  right?: ReactNode;
}

export function SectionTitle({ children, right }: SectionTitleProps) {
  return (
    <div className="flex justify-between items-center mt-5 mb-2.5">
      <h3 className="font-serif text-[17px] font-bold text-text m-0">{children}</h3>
      {right}
    </div>
  );
}
