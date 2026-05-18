import { cn } from "@/lib/utils";
import type { RiskTier } from "@/lib/api";

const STYLE_BY_TIER: Record<RiskTier, string> = {
  Thấp: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Trung bình": "bg-amber-50 text-amber-700 ring-amber-600/30",
  Cao: "bg-red-50 text-red-700 ring-red-600/30",
};

const DOT_BY_TIER: Record<RiskTier, string> = {
  Thấp: "bg-emerald-500",
  "Trung bình": "bg-amber-500",
  Cao: "bg-red-500",
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset",
        STYLE_BY_TIER[tier],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_BY_TIER[tier])} />
      {tier}
    </span>
  );
}
