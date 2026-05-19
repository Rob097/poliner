import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// text-base = 16px → previene auto-zoom su iOS Safari
const baseInput =
  "w-full px-4 py-3 rounded-[var(--radius-sm)] border-2 border-[var(--border)] font-sans text-base bg-white text-text outline-none transition-colors focus:border-[var(--primary-light)] placeholder:text-[var(--text-secondary)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...rest }, ref) => (
    <input ref={ref} type={type} className={cn(baseInput, className)} {...rest} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(baseInput, "resize-y min-h-[80px]", className)}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn(baseInput, "select-arrow", className)} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
