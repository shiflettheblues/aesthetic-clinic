"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-lg border px-3 py-2 text-sm transition-colors",
            "border-[var(--border)] bg-white focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]",
            error && "border-[var(--destructive)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
