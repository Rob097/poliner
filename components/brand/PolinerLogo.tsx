interface PolinerLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: { font: 18, egg: 16 },
  md: { font: 28, egg: 24 },
  lg: { font: 42, egg: 36 },
  xl: { font: 56, egg: 48 },
} as const;

export function PolinerLogo({ size = "md" }: PolinerLogoProps) {
  const s = SIZES[size];
  return (
    <div className="flex items-center" style={{ gap: s.egg * 0.3 }}>
      <svg width={s.egg} height={s.egg * 1.2} viewBox="0 0 40 48">
        <ellipse cx="20" cy="26" rx="16" ry="20" fill="#E8678A" />
        <ellipse cx="20" cy="24" rx="12" ry="15" fill="#FFD6E0" opacity="0.5" />
        <circle cx="15" cy="20" r="2" fill="#2E2924" />
        <path d="M18 26 Q20 29 22 26" stroke="#E8678A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M16 10 Q20 2 24 10" stroke="#E8678A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <span
        className="font-serif font-bold text-text"
        style={{ fontSize: s.font, letterSpacing: "-0.02em" }}
      >
        Poliner
      </span>
    </div>
  );
}
