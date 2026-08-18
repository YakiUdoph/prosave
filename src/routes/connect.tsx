import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fingerprint, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, Panel, StatusPill } from "@/components/save/primitives";
import { WalletCard, type WalletOption } from "@/components/save/wallet-card";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect Your Wallet — SAVE" },
      {
        name: "description",
        content:
          "Connect a wallet so SAVE can analyze portfolio assets, liquidity, risk exposure and exit options. Your keys never leave your wallet.",
      },
      { property: "og:title", content: "Connect Your Wallet — SAVE" },
      {
        property: "og:description",
        content: "Non-custodial analysis of assets, liquidity, risk exposure and exit options.",
      },
    ],
  }),
  component: Connect,
});

const WALLETS: WalletOption[] = [
  { id: "okx", name: "OKX Wallet", detail: "X Layer native · fastest analysis", recommended: true },
  { id: "wc", name: "WalletConnect", detail: "Scan with any mobile wallet" },
  { id: "browser", name: "Browser Wallet", detail: "Injected EIP-1193 provider" },
];

const ANALYSES = ["Portfolio assets", "Liquidity", "Risk exposure", "Exit options"];

function Connect() {
  const navigate = useNavigate();
  const { connectWallet, connected, chainId, walletDetected } = useSave();
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "rejected">("idle");

  const handleConnect = async (walletId: string) => {
    setActive(walletId);
    setStatus("connecting");
    try {
      if (walletId === "okx" || walletId === "browser") {
        await connectWallet();
        setStatus("connected");
        toast.success("Wallet connected on X Layer Testnet!");
        setTimeout(() => {
          navigate({ to: "/scan" });
        }, 1000);
      } else {
        // Fallback simulated flow for wc / other wallets
        setTimeout(() => setStatus("connected"), 1400);
        setTimeout(() => {
          navigate({ to: "/scan" });
        }, 2400);
      }
    } catch (err: any) {
      setStatus("rejected");
      setActive(null);
      const msg = err.message || "Failed to connect wallet";
      toast.error(msg);
    }
  };

  let statusLabel = "CONNECT WALLET";
  let statusTone: "primary" | "safe" | "warn" | "critical" = "primary";

  if (connected) {
    if (chainId === 1952) {
      statusLabel = "CONNECTED";
      statusTone = "safe";
    } else {
      statusLabel = "WRONG_NETWORK";
      statusTone = "critical";
    }
  } else if (status === "connecting") {
    statusLabel = "CONNECTING";
    statusTone = "primary";
  } else if (status === "rejected") {
    statusLabel = "CONNECTION REJECTED";
    statusTone = "critical";
  } else if (walletDetected) {
    statusLabel = "WALLET DETECTED";
    statusTone = "warn";
  }

  const walletCardState = (walletId: string): "idle" | "connecting" | "connected" => {
    if (active === walletId) {
      if (status === "connecting") return "connecting";
      if (status === "connected") return "connected";
    }
    return "idle";
  };

  return (
    <PageShell
      eyebrow="Step 01 · Secure handshake"
      title="Connect your wallet"
      intro="SAVE needs read access to reason about your positions. Nothing is signed until you approve a simulated plan."
      aside={
        <StatusPill tone={statusTone}>
          <Lock className="size-3" /> {statusLabel}
        </StatusPill>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
         <div className="space-y-3">
          {WALLETS.map((w, i) => (
            <WalletCard
              key={w.id}
              wallet={w}
              delay={i * 90}
              state={walletCardState(w.id)}
              onConnect={() => handleConnect(w.id)}
            />
          ))}


          <Panel className="mt-6 p-6">
            <Eyebrow>Security indicators</Eyebrow>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { icon: KeyRound, label: "No key access" },
                { icon: Fingerprint, label: "Signature scoped" },
                { icon: ShieldCheck, label: "Simulated first" },
              ].map((s) => (
                <div key={s.label} className="glass-2 flex items-center gap-3 p-3">
                  <s.icon className="size-4 text-primary" />
                  <span className="text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="p-8">
          <Eyebrow>SAVE analyzes</Eyebrow>
          <ul className="mt-5 space-y-4">
            {ANALYSES.map((a, i) => (
              <li
                key={a}
                className="animate-rise flex items-center gap-3 border-b border-border pb-4 text-sm last:border-0"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="flex size-5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                  <ShieldCheck className="size-3" />
                </span>
                {a}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-lg border border-primary/25 bg-primary/8 p-5">
            <p className="text-sm leading-relaxed text-foreground">
              &ldquo;Your keys never leave your wallet.&rdquo;
            </p>
            <p className="label-mono mt-3 normal-case tracking-normal">
              SAVE only requests a signature for the plan you explicitly approve.
            </p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
