interface AvatarProps {
  emoji?: string;
  name?: string;
  bg?: string;
  size?: number;
  src?: string;
  alt?: string;
}

export function Avatar({ emoji, name, bg, size = 48, src, alt }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? name ?? "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  if (emoji) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          background: bg ?? "#FFD6E0",
          fontSize: size * 0.5,
        }}
      >
        {emoji}
      </div>
    );
  }
  const initial = (name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-(--primary)"
      style={{
        width: size,
        height: size,
        background: bg ?? "var(--primary-light)",
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
}
