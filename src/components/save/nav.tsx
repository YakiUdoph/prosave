import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PanicModeToggle } from "./panic-toggle";
import { useSave } from "@/lib/save-context";

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
  const { connected, walletAddress, portfolioMode, setPortfolioMode } = useSave();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src="/brand/save-mark-transparent.png"
            alt="SAVE Logo"
            className="size-7 object-contain group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-sm font-semibold tracking-[0.22em] text-foreground group-hover:text-primary transition-colors duration-300">SAVE</span>
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
          {connected && (
            <div className="flex items-center gap-2">
              {portfolioMode === "LIVE_WALLET" ? (
                <button
                  onClick={() => setPortfolioMode("DEMO_PORTFOLIO")}
                  className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition"
                  title="Click to explore the demo portfolio"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live Wallet
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPortfolioMode("LIVE_WALLET")}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-500 hover:bg-amber-500/10 transition"
                    title="Click to return to your live wallet data"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    Demo Portfolio
                  </button>
                  <button
                    onClick={() => setPortfolioMode("LIVE_WALLET")}
                    className="hidden sm:inline-flex text-[10px] text-muted-foreground hover:text-foreground underline decoration-dashed transition"
                  >
                    Return to Live Wallet
                  </button>
                </div>
              )}
            </div>
          )}
          {connected && walletAddress && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-2.5 py-1">
              <img
                src="/brand/save-mark-transparent.png"
                alt="SAVE User Avatar"
                className="size-5 rounded-full object-contain"
              />
              <span className="label-mono text-xs normal-case tracking-normal">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
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
