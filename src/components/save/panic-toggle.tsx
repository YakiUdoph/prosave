import { AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSave } from "@/lib/save-context";

export function PanicModeToggle({ className }: { className?: string }) {
  const { panic, setPanic } = useSave();

  return (
    <button
      type="button"
      aria-pressed={panic}
      onClick={() => setPanic(!panic)}
      className={cn(
        "glass-2 group flex items-center gap-3 px-3 py-2 transition-colors duration-500",
        panic ? "border-danger/40" : "hover:border-primary/30",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex h-5 w-9 items-center rounded-full transition-colors duration-500",
          panic ? "bg-danger" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute size-4 rounded-full bg-foreground transition-[left] duration-500",
            panic ? "left-[1.15rem]" : "left-0.5",
          )}
        />
      </span>
      <span className="flex items-center gap-1.5">
        {panic ? (
          <AlertTriangle className="size-3.5 text-danger" />
        ) : (
          <ShieldCheck className="size-3.5 text-primary" />
        )}
        <span className="label-mono text-foreground">Panic Mode</span>
      </span>
    </button>
  );
}
