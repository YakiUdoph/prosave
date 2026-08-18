import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-command-center.jpg";
import { AnimatedNumber, Eyebrow, MagneticButton, Panel, StatusPill } from "@/components/save/primitives";
import { RiskMeter } from "@/components/save/risk-meter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAVE — Your AI Portfolio Protection Agent" },
      {
        name: "description",
        content:
          "SAVE uses AI to understand your portfolio goals and find safer on-chain actions when markets move against you.",
      },
      { property: "og:title", content: "SAVE — Your AI Portfolio Protection Agent" },
      {
        property: "og:description",
        content: "Markets move in seconds. Your exit shouldn't. AI-optimized portfolio rescue plans.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-field relative overflow-hidden">
        <div aria-hidden className="grid-field pointer-events-none absolute inset-0 opacity-60" />
        
        {/* Large restrained background logo */}
        <div aria-hidden className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.09] size-[350px] md:size-[550px] lg:size-[650px]">
          <img
            src="/brand/save-mark-transparent.png"
            alt="SAVE Brandmark"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <StatusPill tone="primary">
                <Sparkles className="size-3" /> AI portfolio protection agent
              </StatusPill>
              <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
                Markets move in seconds.
                <br />
                <span className="text-primary">Your exit shouldn&apos;t.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                SAVE uses AI to understand your portfolio goals and find safer on-chain actions when
                you need them most.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/connect">
                  <MagneticButton size="lg">
                    Protect My Portfolio <ArrowRight className="size-4" />
                  </MagneticButton>
                </Link>
                <Link to="/scan">
                  <MagneticButton size="lg" variant="ghost">
                    See How SAVE Works
                  </MagneticButton>
                </Link>
              </div>

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
                {[
                  { label: "Avg. SAVE score", value: 94, suffix: "" },
                  { label: "Routes evaluated", value: 1284, suffix: "" },
                  { label: "Median slippage", value: 0.24, suffix: "%" },
                ].map((s) => (
                  <div key={s.label}>
                    <dd className="text-2xl font-semibold tracking-tight">
                      <AnimatedNumber
                        value={s.value}
                        suffix={s.suffix}
                        decimals={s.suffix === "%" ? 2 : 0}
                      />
                    </dd>
                    <dt className="label-mono mt-1">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative animate-rise">
              <div className="glass elevated relative overflow-hidden">
                <img
                  src={heroImage}
                  alt="SAVE command center visualising a portfolio under AI analysis"
                  width={1600}
                  height={1008}
                  className="h-[320px] w-full object-cover opacity-90 md:h-[420px]"
                />
                <div
                  aria-hidden
                  className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-24"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--primary) 22%, transparent), transparent)",
                  }}
                />
                <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 backdrop-blur-xl">
                  <div>
                    <Eyebrow>Portfolio value</Eyebrow>
                    <p className="num mt-1 text-lg font-semibold">
                      <AnimatedNumber value={4832} prefix="$" />
                    </p>
                  </div>
                  <div className="w-40">
                    <RiskMeter level={74} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="p-8">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Crypto decisions become stressful during volatility.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Prices gap, liquidity thins, and every interface asks the same useless question:
              <span className="text-foreground"> &ldquo;What token do you want to swap?&rdquo;</span>{" "}
              Under pressure, people sell the wrong asset at the worst moment.
            </p>
            <ul className="mt-6 space-y-3">
              {["Unclear exposure", "No route visibility", "Irreversible mistakes"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-danger" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-8">
            <Eyebrow>The solution</Eyebrow>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              SAVE converts goals into optimized portfolio actions.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              SAVE asks a different question:{" "}
              <span className="text-primary">&ldquo;What outcome do you need?&rdquo;</span> Then it
              analyses your holdings, respects your constraints, and simulates every step before you
              sign.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Activity, label: "Analyze" },
                { icon: Gauge, label: "Optimize" },
                { icon: ShieldCheck, label: "Execute safely" },
              ].map((s) => (
                <div key={s.label} className="glass-2 p-4">
                  <s.icon className="size-4 text-primary" />
                  <p className="mt-3 text-sm font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Intent examples ticker */}
        <div className="mt-6 overflow-hidden">
          <div className="glass flex items-center gap-4 overflow-hidden px-6 py-4">
            <Eyebrow className="shrink-0">Intents SAVE understands</Eyebrow>
            <div className="relative flex-1 overflow-hidden">
              <div className="animate-ticker flex w-max gap-8">
                {[...Array(2)].map((_, dup) => (
                  <div key={dup} className="flex gap-8">
                    {[
                      "Get me $700 USDC without selling ETH.",
                      "Reduce my portfolio risk by 50%.",
                      "Exit my meme coin exposure.",
                      "Protect my long-term holdings.",
                    ].map((t) => (
                      <span key={t} className="num text-xs whitespace-nowrap text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trust */}
        <Panel className="mt-6 p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <Eyebrow>Trust</Eyebrow>
              <h2 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
                Powered by X Layer + OKX OnchainOS.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Non-custodial by design. SAVE reads, reasons, and simulates — your keys never leave
                your wallet.
              </p>
            </div>
            <Link to="/connect">
              <MagneticButton size="lg">
                Protect My Portfolio <ArrowRight className="size-4" />
              </MagneticButton>
            </Link>
          </div>
        </Panel>
      </section>
    </div>
  );
}
