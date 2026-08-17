import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrainCircuit } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, Panel, StatusPill } from "@/components/save/primitives";
import { AIIntentBox } from "@/components/save/intent-box";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/intent")({
  head: () => ({
    meta: [
      { title: "Tell SAVE What You Need — Intent Console" },
      {
        name: "description",
        content:
          "Describe the outcome you need in plain language. SAVE extracts your goal, protected assets, risk preference and priority.",
      },
      { property: "og:title", content: "Tell SAVE What You Need — Intent Console" },
      {
        property: "og:description",
        content: "Outcome-first portfolio actions: goals in, optimized plan out.",
      },
    ],
  }),
  component: Intent,
});

function Intent() {
  const navigate = useNavigate();
  const { intent, setIntent, parsedIntent } = useSave();
  const [parsed, setParsed] = useState(false);

  const formattedIntent = [
    {
      label: "Target",
      value: parsedIntent.targetAmount
        ? `${parsedIntent.targetAmount.toLocaleString("en-US")} ${parsedIntent.targetAsset || "USDC"}`
        : "None",
    },
    {
      label: "Protected",
      value: parsedIntent.protectedAssets.length > 0 ? parsedIntent.protectedAssets.join(", ") : "None",
    },
    {
      label: "Objective",
      value:
        parsedIntent.objective === "MINIMIZE_DAMAGE"
          ? "Minimum portfolio damage"
          : parsedIntent.objective === "REDUCE_RISK"
            ? "Reduce risk"
            : parsedIntent.objective === "EXIT_EXPOSURE"
              ? "Exit exposure"
              : "Maximize liquidity",
    },
    {
      label: "Policy",
      value:
        parsedIntent.protectedAssetPolicy === "LAST_RESORT"
          ? parsedIntent.protectedAssets.includes("ETH")
            ? "Sell ETH only as last resort"
            : "Sell protected only as last resort"
          : "Never sell protected assets",
    },
  ];

  return (
    <PageShell
      eyebrow="Step 04 · Intent"
      title="What do you need your portfolio to do?"
      intro="No tickers, no routes, no guessing. Describe the outcome and the constraints that matter to you."
      aside={
        <StatusPill tone="primary">
          <BrainCircuit className="size-3" /> Intent parser online
        </StatusPill>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AIIntentBox
          value={intent}
          onChange={setIntent}
          onSubmit={() => {
            setParsed(true);
            setTimeout(() => navigate({ to: "/plan" }), 1400);
          }}
        />

        <Panel className="p-6">
          <Eyebrow>Extracted constraints</Eyebrow>
          <dl className="mt-5 divide-y divide-border">
            {formattedIntent.map((row, i) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-6 py-4 transition-opacity duration-700"
                style={{ opacity: parsed ? 1 : 0.35, transitionDelay: `${i * 180}ms` }}
              >
                <dt className="label-mono">{row.label}</dt>
                <dd className="num text-sm font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {parsed
              ? "Constraints locked. Building candidate routes across OKX DEX Aggregator…"
              : "Submit an intent to see how SAVE structures it before planning."}
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}

