import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill } from "@/components/save/primitives";
import { SuccessSummary } from "@/components/save/success-summary";
import { TransactionReceipt } from "@/components/save/transaction-receipt";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { HISTORY, TIMELINE } from "@/lib/save-data";

export const Route = createFileRoute("/protected")({
  head: () => ({
    meta: [
      { title: "Portfolio Protected — SAVE" },
      {
        name: "description",
        content:
          "$704 USDC secured, ETH preserved and $84 of estimated loss avoided — with a full transaction receipt and protection history.",
      },
      { property: "og:title", content: "Portfolio Protected — SAVE" },
      {
        property: "og:description",
        content: "Mission complete: goal reached, long-term holdings untouched.",
      },
    ],
  }),
  component: Success,
});

function Success() {
  return (
    <PageShell
      eyebrow="Step 07 · Mission complete"
      title="Portfolio protected"
      intro="Your goal was met without touching the assets you asked SAVE to preserve."
      aside={
        <StatusPill tone="safe">
          <ShieldCheck className="size-3" /> Executed on X Layer
        </StatusPill>
      }
    >
      <div className="relative">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--safe) 14%, transparent)" }}
        />
        <SuccessSummary />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <TransactionReceipt />

        <div className="space-y-6">
          <Panel className="p-6">
            <Eyebrow>Execution trace</Eyebrow>
            <div className="mt-6">
              <SimulationTimeline steps={[...TIMELINE, "Transaction confirmed"]} autoRun={false} />
            </div>
          </Panel>

          <Panel className="p-6">
            <Eyebrow>Protection history</Eyebrow>
            <ul className="mt-5 divide-y divide-border">
              {HISTORY.map((h) => (
                <li key={h.date} className="flex items-center justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-sm">{h.action}</p>
                    <p className="label-mono mt-1">{h.date}</p>
                  </div>
                  <span className="num text-sm font-semibold text-primary">{h.score}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Your portfolio is now safer.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              SAVE keeps monitoring exposure and will surface a new plan the moment risk changes.
            </p>
          </div>
          <Link to="/command">
            <MagneticButton size="lg" variant="ghost">
              Back to command center <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>
      </Panel>
    </PageShell>
  );
}
