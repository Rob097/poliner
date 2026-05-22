import { Button } from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-8">
      <div className="text-[56px] mb-4">{icon}</div>
      <div className="font-serif text-lg font-bold text-text mb-2">{title}</div>
      {subtitle && (
        <p className="text-sm text-(--text-secondary) leading-relaxed mb-5">{subtitle}</p>
      )}
      {action && (
        <Button onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}
