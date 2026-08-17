import { useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTENT_SUGGESTIONS } from "@/lib/save-data";
import { Eyebrow, MagneticButton } from "./primitives";

export function AIIntentBox({
  value,
  onChange,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={cn("space-y-5", className)}>
      <div
        className={cn(
          "glass relative overflow-hidden p-6 transition-[border-color,box-shadow] duration-500",
          focused && "elevated border-primary/35",
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <Eyebrow>Intent console</Eyebrow>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          placeholder="What do you need your portfolio to do?"
          className="mt-4 w-full resize-none bg-transparent text-xl leading-relaxed tracking-tight text-foreground placeholder:text-muted-foreground/70 focus:outline-none md:text-2xl"
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="label-mono normal-case tracking-normal">
            SAVE reads goals, not tickers. Constraints are respected.
          </p>
          <MagneticButton onClick={onSubmit}>
            Build rescue plan <ArrowRight className="size-4" />
          </MagneticButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {INTENT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onChange(s);
              ref.current?.focus();
            }}
            className="glass-2 px-3.5 py-2 text-xs text-muted-foreground transition-colors duration-300 hover:border-primary/30 hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
