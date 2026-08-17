import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Panel: glass surface with cursor-following highlight ---------------- */

export function Panel({
  children,
  className,
  interactive = true,
  alert = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  alert?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (!interactive || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group/panel glass relative overflow-hidden p-6 transition-[transform,border-color] duration-500",
        interactive && "hover:-translate-y-0.5 hover:border-primary/25",
        alert && "animate-risk-pulse border-danger/30",
        className,
      )}
    >
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/panel:opacity-100"
          style={{
            background:
              "radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------------- Magnetic button ---------------- */

type MagneticProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
};

export function MagneticButton({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: MagneticProps) {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width;
        const y = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate3d(${x * 10}px, ${y * 6}px, 0)`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (el) el.style.transform = "translate3d(0,0,0)";
      }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[transform,box-shadow,background-color] duration-300 will-change-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        size === "lg" ? "px-7 py-3.5 text-[0.95rem]" : "px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)]",
        variant === "danger" &&
          "bg-danger text-primary-foreground hover:shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--danger)_70%,transparent)]",
        variant === "ghost" &&
          "glass-2 text-foreground hover:border-primary/30 hover:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Animated number ---------------- */

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1200,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={cn("num", className)}>
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ---------------- Small helpers ---------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-mono", className)}>{children}</p>;
}

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "safe" | "warn" | "danger" | "primary";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-border text-muted-foreground",
    safe: "border-safe/30 text-safe bg-safe/10",
    warn: "border-warn/30 text-warn bg-warn/10",
    danger: "border-danger/35 text-danger bg-danger/10",
    primary: "border-primary/30 text-primary bg-primary/10",
  };
  return (
    <span
      className={cn(
        "label-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

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
    <div className={cn("animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "safe" | "warn" | "danger";
  className?: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  const tones: Record<string, string> = {
    primary: "bg-primary",
    safe: "bg-safe",
    warn: "bg-warn",
    danger: "bg-danger",
  };
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-[1400ms] ease-out", tones[tone])}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}
