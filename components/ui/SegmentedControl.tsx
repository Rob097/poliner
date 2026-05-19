import { cn } from "@/lib/utils/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "flex bg-[var(--border)] rounded-xl p-[3px] gap-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 px-3 py-2 rounded-[10px] border-none text-[13px] font-semibold cursor-pointer font-sans transition-all",
              active
                ? "bg-white text-[var(--primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "bg-transparent text-[var(--text-secondary)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
