import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./primitives";

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className="hero-field relative">
      <div aria-hidden className="grid-field pointer-events-none absolute inset-0 opacity-70" />
      <div className={cn("relative mx-auto max-w-7xl px-6 py-16 md:py-24", className)}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
              {title}
            </h1>
            {intro && (
              <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
                {intro}
              </p>
            )}
          </div>
          {aside}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </div>
  );
}
