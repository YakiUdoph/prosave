import { useState } from "react";
import { Check, Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "./primitives";

export type WalletOption = {
  id: string;
  name: string;
  detail: string;
  recommended?: boolean;
};

export function WalletCard({
  wallet,
  state,
  onConnect,
  delay = 0,
}: {
  wallet: WalletOption;
  state: "idle" | "connecting" | "connected";
  onConnect: () => void;
  delay?: number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <Panel className="p-0">
        <button
          type="button"
          onClick={onConnect}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          disabled={state !== "idle"}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <span className="flex items-center gap-4">
            <span
              className={cn(
                "glass-2 flex size-11 items-center justify-center transition-colors duration-500",
                (hover || state !== "idle") && "border-primary/40",
              )}
            >
              <Wallet className="size-5 text-primary" />
            </span>
            <span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold">{wallet.name}</span>
                {wallet.recommended && (
                  <span className="label-mono rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                    Recommended
                  </span>
                )}
              </span>
              <span className="label-mono mt-1 block normal-case tracking-normal">
                {wallet.detail}
              </span>
            </span>
          </span>
          <span className="num text-xs text-muted-foreground">
            {state === "idle" && (hover ? "Connect →" : "Connect")}
            {state === "connecting" && (
              <span className="flex items-center gap-2 text-primary">
                <Loader2 className="size-3.5 animate-spin" /> Handshake
              </span>
            )}
            {state === "connected" && (
              <span className="flex items-center gap-2 text-safe">
                <Check className="size-3.5" /> Connected
              </span>
            )}
          </span>
        </button>
        {state !== "idle" && (
          <div className="h-0.5 w-full overflow-hidden bg-secondary">
            <div
              className={cn(
                "h-full bg-primary transition-[width] duration-[1400ms] ease-out",
                state === "connected" ? "w-full" : "w-2/3",
              )}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
