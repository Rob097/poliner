import type { ReactNode } from "react";
import { Card } from "./Card";
import { IconChevron } from "./icons";

interface ListItemProps {
  left?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}

export function ListItem({ left, title, subtitle, badge, right, onClick }: ListItemProps) {
  return (
    <Card clickable={!!onClick} onClick={onClick} className="flex items-center gap-3">
      {left}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[15px] text-text">{title}</span>
          {badge}
        </div>
        {subtitle && (
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">{subtitle}</div>
        )}
      </div>
      {right ?? <IconChevron size={18} color="var(--text-secondary)" />}
    </Card>
  );
}
