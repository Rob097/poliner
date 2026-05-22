import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ clickable, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-(--radius) px-4 py-[14px] border border-(--border) transition-transform",
        clickable && "cursor-pointer active:scale-[0.985]",
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = "Card";
