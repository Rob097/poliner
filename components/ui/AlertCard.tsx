import type { ReactNode } from "react";
import { Card } from "./Card";
import { IconChevron } from "./icons";

interface AlertCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
  onClick?: () => void;
}

export function AlertCard({ icon, title, subtitle, color, onClick }: AlertCardProps) {
  return (
    <Card
      clickable={!!onClick}
      onClick={onClick}
      className="flex items-center gap-3"
      style={{ borderLeft: `4px solid ${color ?? "var(--primary)"}` }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-text">{title}</div>
        {subtitle && <div className="text-xs text-(--text-secondary) mt-0.5">{subtitle}</div>}
      </div>
      <IconChevron size={18} color="var(--text-secondary)" />
    </Card>
  );
}
