import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fingerprint, KeyRound, Lock, ShieldCheck } from "lucide-react";
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
  const { setConnected } = useSave();
  const [active, setActive] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const a = setTimeout(() => setDone(true), 1400);
    const b = setTimeout(() => {
      setConnected(true);
      navigate({ to: "/scan" });
    }, 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [active, navigate, setConnected]);

  return (
    <PageShell
      eyebrow="Step 01 · Secure handshake"
      title="Connect your wallet"
      intro="SAVE needs read access to reason about your positions. Nothing is signed until you approve a simulated plan."
      aside={
        <StatusPill tone="safe">
          <Lock className="size-3" /> Read-only session
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
              state={active === w.id ? (done ? "connected" : "connecting") : "idle"}
              onConnect={() => setActive(w.id)}
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
