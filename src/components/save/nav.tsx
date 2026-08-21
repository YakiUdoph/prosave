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
  const { connected, walletAddress, scannedAddress, portfolioMode, setPortfolioMode } = useSave();

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
          {/* Status pill & cycle toggle */}
          <div className="flex items-center gap-2">
            {portfolioMode === "WATCH_ONLY" && scannedAddress && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-2.5 py-1">
                <span className="text-[10px] text-muted-foreground uppercase label-mono">Watch</span>
                <span className="label-mono text-xs normal-case tracking-normal text-sky-500">
                  {scannedAddress.slice(0, 6)}...{scannedAddress.slice(-4)}
                </span>
              </div>
            )}
            {connected && walletAddress && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-2.5 py-1">
                <span className="text-[10px] text-muted-foreground uppercase label-mono text-emerald-500">Live</span>
                <span className="label-mono text-xs normal-case tracking-normal">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}

            <div className="relative group">
              <button
                onClick={() => {
                  if (portfolioMode === "DEMO_PORTFOLIO") {
                    if (connected) {
                      setPortfolioMode("LIVE_WALLET");
                    } else if (scannedAddress) {
                      setPortfolioMode("WATCH_ONLY");
                    }
                  } else if (portfolioMode === "LIVE_WALLET") {
                    if (scannedAddress) {
                      setPortfolioMode("WATCH_ONLY");
                    } else {
                      setPortfolioMode("DEMO_PORTFOLIO");
                    }
                  } else if (portfolioMode === "WATCH_ONLY") {
                    if (connected) {
                      setPortfolioMode("LIVE_WALLET");
                    } else {
                      setPortfolioMode("DEMO_PORTFOLIO");
                    }
                  } else {
                    setPortfolioMode("DEMO_PORTFOLIO");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition font-semibold cursor-pointer",
                  portfolioMode === "LIVE_WALLET" && "border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10",
                  portfolioMode === "WATCH_ONLY" && "border-sky-500/20 bg-sky-500/5 text-sky-500 hover:bg-sky-500/10",
                  portfolioMode === "DEMO_PORTFOLIO" && "border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10"
                )}
                title={
                  portfolioMode === "LIVE_WALLET"
                    ? "Portfolio data from connected wallet."
                    : portfolioMode === "WATCH_ONLY"
                      ? "Public address analysis. No signing permission."
                      : "Sample portfolio used for demonstration."
                }
              >
                {portfolioMode === "LIVE_WALLET" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
                {portfolioMode === "WATCH_ONLY" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </span>
                )}
                {portfolioMode === "DEMO_PORTFOLIO" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                )}
                <span>
                  {portfolioMode === "LIVE_WALLET" ? "CONNECTED" : portfolioMode === "WATCH_ONLY" ? "WATCH-ONLY" : "DEMO"}
                </span>
              </button>

              <div className="pointer-events-none absolute right-0 top-full mt-2 w-48 rounded bg-background border border-border p-2 text-xxs label-mono leading-normal text-muted-foreground opacity-0 shadow-lg transition group-hover:opacity-100 z-50">
                {portfolioMode === "LIVE_WALLET"
                  ? "Portfolio data from connected wallet."
                  : portfolioMode === "WATCH_ONLY"
                    ? "Public address analysis. No signing permission."
                    : "Sample portfolio used for demonstration."}
                <div className="mt-1 border-t border-border/40 pt-1 text-[9px]">
                  Click to switch analysis source.
                </div>
              </div>
            </div>
          </div>
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
          SAVE — your intent-driven portfolio policy engine. Demo data. Non-custodial by design.
        </p>
        <p className="label-mono">Powered by X Layer + OKX OnchainOS</p>
      </div>
    </footer>
  );
}
