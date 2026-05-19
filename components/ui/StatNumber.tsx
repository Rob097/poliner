interface StatNumberProps {
  value: number | string;
  label: string;
  color?: string;
  small?: boolean;
}

export function StatNumber({ value, label, color, small }: StatNumberProps) {
  return (
    <div className="text-center">
      <div
        className="font-extrabold font-sans leading-none"
        style={{
          fontSize: small ? 24 : 32,
          color: color ?? "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        className="text-[var(--text-secondary)] mt-1"
        style={{ fontSize: small ? 11 : 12 }}
      >
        {label}
      </div>
    </div>
  );
}
