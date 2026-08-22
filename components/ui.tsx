"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/* Fade-only reveal. The atmospheric genre forbids slide and bounce —
   the canvas does the moving, the content just arrives. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.52, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "quiet";
  loading?: boolean;
};

export function Button({
  variant = "solid",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] " +
    "px-5 py-2.5 text-[var(--text-base)] font-medium tracking-tight " +
    "transition-[transform,background-color,box-shadow,color] duration-[var(--dur-fast)] " +
    "ease-[var(--ease-out)] disabled:cursor-not-allowed disabled:opacity-45 " +
    "active:translate-y-px whitespace-nowrap";

  const variants = {
    solid:
      "bg-[var(--color-accent)] text-[var(--on-accent)] hover:bg-[var(--color-accent-hot)] " +
      "hover:shadow-[var(--glow)] font-semibold",
    ghost:
      "bg-[var(--color-paper-3)] text-[var(--color-ink)] hover:bg-[var(--color-paper-4)]",
    quiet:
      "bg-transparent text-[var(--color-ink-2)] hover:text-[var(--color-ink)] px-3",
  } as const;

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[var(--text-base)] font-medium text-[var(--color-ink)] mb-2">
        {label}
      </span>
      <input
        {...rest}
        className={
          "w-full rounded-[var(--radius-md)] bg-[var(--color-paper-2)] " +
          "border border-[var(--color-paper-4)] px-4 py-3 text-[var(--text-lg)] " +
          "text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)] " +
          "outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] " +
          "focus:border-[var(--color-accent)] focus:shadow-[var(--glow)] " +
          className
        }
      />
      {hint && (
        <span className="block mt-2 text-[var(--text-sm)] text-[var(--color-ink-3)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block font-[family-name:var(--font-mono)] text-[var(--text-xs)] uppercase tracking-[0.2em] text-[var(--color-accent)]">
      {children}
    </span>
  );
}

/**
 * Errors carry a reason, not a shrug. A refusal is shown as a settled outcome
 * with an explanation; only genuinely retryable failures invite a retry.
 */
export function ErrorNote({
  children,
  tone = "error",
  onRetry,
}: {
  children: ReactNode;
  tone?: "error" | "declined";
  onRetry?: () => void;
}) {
  if (!children) return null;
  const declined = tone === "declined";
  return (
    <div
      role="alert"
      className={
        "rounded-[var(--radius-md)] border px-4 py-3 " +
        (declined
          ? "border-[var(--color-paper-4)] bg-[var(--color-paper-3)]/60"
          : "border-[color:var(--color-urgent-ghost)] bg-[var(--color-urgent-ghost)]")
      }
    >
      <div className="flex gap-2.5">
        {declined ? (
          <Info
            size={15}
            className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
          />
        ) : (
          <AlertTriangle
            size={15}
            className="mt-0.5 shrink-0 text-[var(--color-urgent)]"
          />
        )}
        <div className="min-w-0">
          {declined && (
            <span className="block text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)] mb-1">
              Not something we can teach
            </span>
          )}
          <p className="text-[var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
            {children}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-[var(--text-sm)] text-[var(--color-accent)] hover:text-[var(--color-accent-hot)] transition-colors duration-[var(--dur-fast)]"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
