import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "text" | "icon";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-bold cursor-pointer transition-all active:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-(--primary) text-white rounded-sm font-bold border-none active:scale-[0.97]",
  secondary:
    "bg-white text-text border-2 border-(--border) rounded-sm font-semibold active:bg-(--border)",
  text:
    "bg-transparent text-(--primary) border-none font-semibold px-2 py-2",
  icon:
    "bg-transparent border-none p-1.5 rounded-[10px] active:bg-(--border)",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-[13px] text-[15px]",
  lg: "px-7 py-4 text-base rounded-(--radius)",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, type = "button", ...rest }, ref) => {
    const isIcon = variant === "icon";
    const isText = variant === "text";
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          base,
          variants[variant],
          !isIcon && !isText && sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      />
    );
  },
);
Button.displayName = "Button";
