import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PanicModeToggle } from "./panic-toggle";

const FLOW = [
  { to: "/", label: "Overview" },
  { to: "/connect", label: "Connect" },
  { to: "/scan", label: "Scan" },
  { to: "/command", label: "Command" },
  { to: "/intent", label: "Intent" },
  { to: "/plan", label: "Plan" },
  { to: "/simulate", label: "Simulate" },
  { to: "/protected", label: "Result" },
] as const;

export function SaveNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex size-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
            <span className="size-2 rounded-full bg-primary transition-transform duration-500 group-hover:scale-125" />
          </span>
          <span className="text-sm font-semibold tracking-[0.22em]">SAVE</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {FLOW.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "label-mono rounded-md px-2.5 py-1.5 transition-colors duration-300 hover:text-foreground",
                pathname === item.to && "bg-secondary text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <PanicModeToggle />
        </div>
      </div>
    </header>
  );
}

export function SaveFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="label-mono normal-case tracking-normal">
          SAVE — your AI portfolio protection agent. Demo data. Non-custodial by design.
        </p>
        <p className="label-mono">Powered by X Layer + OKX OnchainOS</p>
      </div>
    </footer>
  );
}
