import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/save-data";
import { Panel, ProgressBar, StatusPill } from "./primitives";

const RISK_LABEL = {
  protected: "Protected",
  medium: "Medium Risk",
  high: "High Risk",
} as const;

const RISK_TONE = {
  protected: "safe",
  medium: "warn",
  high: "danger",
} as const;

export function PortfolioAssetCard({
  asset,
  delay = 0,
  scanning = false,
}: {
  asset: Asset;
  delay?: number;
  scanning?: boolean;
}) {
  return (
    <div className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <Panel className="p-5" alert={asset.risk === "high"}>
        {scanning && (
          <div
            aria-hidden
            className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-16"
            style={{
              background:
                "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--primary) 18%, transparent), transparent)",
            }}
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="glass-2 flex size-10 items-center justify-center rounded-full">
              <span className="num text-xs font-semibold">{asset.symbol.slice(0, 3)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">{asset.symbol}</p>
              <p className="label-mono mt-0.5">{asset.chain}</p>
            </div>
          </div>
          <StatusPill tone={RISK_TONE[asset.risk]}>{RISK_LABEL[asset.risk]}</StatusPill>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="num text-xl font-semibold tracking-tight">
              ${asset.value.toLocaleString("en-US")}
            </p>
            <p className="num mt-1 text-xs text-muted-foreground">
              {asset.balance} {asset.symbol}
            </p>
          </div>
          <span
            className={cn(
              "num text-sm",
              asset.change24h < 0 ? "text-danger" : asset.change24h > 0 ? "text-safe" : "text-muted-foreground",
            )}
          >
            {asset.change24h > 0 ? "+" : ""}
            {asset.change24h.toFixed(1)}%
          </span>
        </div>

        <div className="mt-5 space-y-2">
          <div className="label-mono flex justify-between">
            <span>Liquidity</span>
            <span className="num text-foreground">{asset.liquidity}</span>
          </div>
          <ProgressBar
            value={asset.liquidity}
            tone={asset.risk === "high" ? "danger" : asset.risk === "medium" ? "warn" : "primary"}
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{asset.note}</p>
      </Panel>
    </div>
  );
}
