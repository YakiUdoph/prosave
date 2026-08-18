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

const ANALYSES = ["Portfolio assets", "Liquidity", "Risk exposure", "Exit options"];

function Connect() {
  const navigate = useNavigate();
  const {
    connectWallet,
    connectWalletConnect,
    connected,
    chainId,
    walletDetected,
    detectedWallets,
    isOkxWalletInstalled,
  } = useSave();

  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "rejected">("idle");
  const [showDiscovered, setShowDiscovered] = useState(false);

  const WALLETS: WalletOption[] = [
    {
      id: "okx",
      name: "OKX Wallet",
      detail: isOkxWalletInstalled
        ? "X Layer native · fastest analysis"
        : "NOT INSTALLED — click to install",
      recommended: true,
    },
    { id: "wc", name: "WalletConnect", detail: "Scan with any mobile wallet" },
    { id: "browser", name: "Browser Wallet", detail: "Injected EIP-6963 discovery" },
  ];

  const handleConnect = async (walletId: string, customProvider?: any) => {
    setActive(walletId);
    setStatus("connecting");
    try {
      if (walletId === "okx") {
        if (!isOkxWalletInstalled) {
          window.open("https://www.okx.com/web3", "_blank");
          setStatus("idle");
          setActive(null);
          toast.info("OKX Wallet is not installed. Redirected to download page.");
          return;
        }
        const okxProvider = (window as any).okxwallet || detectedWallets.find(w => w.info.rdns === "com.okex.wallet")?.provider;
        await connectWallet(okxProvider);
      } else if (walletId === "wc") {
        await connectWalletConnect();
      } else if (walletId === "browser") {
        if (customProvider) {
          await connectWallet(customProvider);
        } else {
          setShowDiscovered(true);
          setStatus("idle");
          setActive(null);
          return;
        }
      }
      
      setStatus("connected");
      toast.success("Wallet connected on X Layer Testnet!");
      setTimeout(() => {
        navigate({ to: "/scan" });
      }, 1000);
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

      {showDiscovered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <Panel className="w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowDiscovered(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm label-mono"
            >
              [CLOSE]
            </button>
            <Eyebrow>Detected Browser Wallets</Eyebrow>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Select an announced EIP-6963 provider installed in your browser.
            </p>
            {detectedWallets.length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">No injected browser wallets announced.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Ensure MetaMask, Rainbow, or other wallet extensions are active.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {detectedWallets.map((w) => (
                  <button
                    key={w.info.uuid}
                    onClick={() => {
                      setShowDiscovered(false);
                      handleConnect("browser", w.provider);
                    }}
                    className="flex w-full items-center gap-4 border border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 transition-all p-3 rounded-lg text-left"
                  >
                    {w.info.icon ? (
                      <img src={w.info.icon} alt={w.info.name} className="size-6 shrink-0" />
                    ) : (
                      <span className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">W</span>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{w.info.name}</p>
                      <p className="text-xxs label-mono text-muted-foreground tracking-normal">{w.info.rdns}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
