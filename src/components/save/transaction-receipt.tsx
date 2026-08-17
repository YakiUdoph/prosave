import { Receipt } from "lucide-react";
import { RECEIPT } from "@/lib/save-data";
import { Eyebrow, Panel } from "./primitives";

export function TransactionReceipt() {
  return (
    <Panel className="p-0">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Receipt className="size-3.5 text-primary" />
        <Eyebrow>Transaction receipt</Eyebrow>
      </div>
      <dl className="divide-y divide-border">
        {RECEIPT.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 px-6 py-3.5">
            <dt className="label-mono">{row.label}</dt>
            <dd className="num text-sm text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
