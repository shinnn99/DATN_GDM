import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Play,
  RotateCcw,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { RiskBadge } from "@/components/risk-badge";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PatientInput, WhatIfResponse } from "@/lib/api";
import { FEATURE_LABELS } from "@/lib/patient-defaults";
import { cn } from "@/lib/utils";

type ChangeKey = "OGTT" | "BMI" | "Sys BP" | "HDL";

const CHANGEABLE: { key: ChangeKey; min: number; max: number; step: number }[] =
  [
    { key: "OGTT", min: 70, max: 250, step: 1 },
    { key: "BMI", min: 16, max: 45, step: 0.5 },
    { key: "Sys BP", min: 90, max: 180, step: 1 },
    { key: "HDL", min: 25, max: 90, step: 1 },
  ];

export function WhatIfPage() {
  const [original, setOriginal] = useState<PatientInput | null>(null);
  const [changes, setChanges] = useState<Partial<Record<ChangeKey, number>>>(
    {},
  );

  const mutation = useMutation({
    mutationFn: api.whatIf,
  });

  useEffect(() => {
    setChanges({});
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original]);

  const merged = useMemo<PatientInput | null>(
    () => (original ? ({ ...original, ...changes } as PatientInput) : null),
    [original, changes],
  );

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Kịch bản What-If"
        description='Bước 1: nhập ca gốc rồi bấm "Chốt ca gốc". Bước 2: dùng slider để thử thay đổi và xem nguy cơ biến đổi.'
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_400px]">
        <Panel
          icon={ClipboardList}
          title="Ca gốc"
          description='Nhập đầy đủ rồi bấm "Chốt ca gốc" — sau đó dùng panel bên phải để chạy what-if.'
          right={
            original && (
              <span className="pill bg-accent-soft text-accent">
                Đã chốt
              </span>
            )
          }
        >
          <PatientForm
            submitLabel="Chốt ca gốc"
            onSubmit={(values) => setOriginal(values)}
          />
        </Panel>

        <div className="flex min-h-0 flex-col gap-3">
          <Panel
            icon={Sliders}
            title="Thay đổi"
            description={
              original
                ? "Slider thay đổi giá trị; bỏ trống = giữ nguyên ca gốc."
                : "Chốt ca gốc trước khi dùng slider."
            }
            bodyClassName="flex flex-col gap-3"
          >
            <div
              className={cn(
                "space-y-3",
                !original && "opacity-50 pointer-events-none",
              )}
            >
              {CHANGEABLE.map((cfg) => {
                const orig = original?.[cfg.key] ?? null;
                const current = changes[cfg.key];
                const display = current ?? orig ?? cfg.min;
                const pct =
                  ((Number(display) - cfg.min) / (cfg.max - cfg.min)) * 100;
                return (
                  <div key={cfg.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[12px] font-medium text-foreground">
                        {FEATURE_LABELS[cfg.key]}
                      </Label>
                      <div className="text-[12px] tabular-nums">
                        {orig !== null && current !== undefined && (
                          <span className="text-muted-foreground">
                            {orig}
                            <ArrowRight className="mx-1 inline h-3 w-3" />
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-semibold",
                            current !== undefined
                              ? "text-accent"
                              : "text-primary",
                          )}
                        >
                          {display}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={cfg.min}
                        max={cfg.max}
                        step={cfg.step}
                        value={display}
                        disabled={!original}
                        onChange={(e) =>
                          setChanges((c) => ({
                            ...c,
                            [cfg.key]: Number(e.target.value),
                          }))
                        }
                        className="slider-accent w-full"
                        style={
                          {
                            "--pct": `${pct}%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{cfg.min}</span>
                      {current !== undefined ? (
                        <button
                          type="button"
                          onClick={() =>
                            setChanges((c) => {
                              const cp = { ...c };
                              delete cp[cfg.key];
                              return cp;
                            })
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Bỏ thay đổi
                        </button>
                      ) : (
                        <span className="invisible">.</span>
                      )}
                      <span>{cfg.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="accent"
                className="flex-1"
                disabled={!original || !hasChanges || mutation.isPending}
                onClick={() => {
                  if (!original) return;
                  mutation.mutate({
                    original,
                    changes: changes as Record<string, unknown>,
                  });
                }}
              >
                <Play className="h-4 w-4" />
                {mutation.isPending ? "Đang chạy..." : "Chạy What-If"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChanges({});
                  mutation.reset();
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {merged && (
              <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                Áp dụng lên: {merged.Age} tuổi, BMI {merged.BMI ?? "—"}, OGTT{" "}
                {merged.OGTT ?? "—"}
              </div>
            )}
          </Panel>

          <WhatIfResultPanel
            data={mutation.data}
            error={mutation.error}
            isPending={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}

function WhatIfResultPanel({
  data,
  error,
  isPending,
}: {
  data?: WhatIfResponse;
  error: unknown;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <Panel icon={TrendingUp} title="Đang tính...">
        <Skeleton className="h-20 w-full" />
      </Panel>
    );
  }
  if (error) {
    return (
      <Panel
        icon={TrendingUp}
        title={<span className="text-destructive">Lỗi</span>}
        className="border-destructive/40"
      >
        <div className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Lỗi không xác định"}
        </div>
      </Panel>
    );
  }
  if (!data) return null;

  const deltaPct = data.delta * 100;

  return (
    <Panel
      icon={TrendingUp}
      title="Kết quả What-If"
      bodyClassName="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Ca gốc
          </div>
          <div className="text-lg font-bold tabular-nums text-primary">
            {(data.original_prob * 100).toFixed(1)}%
          </div>
          <RiskBadge tier={data.original_tier} />
        </div>
        <div className="rounded-xl border border-accent/40 bg-accent-soft/60 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-accent">
            Sau thay đổi
          </div>
          <div className="text-lg font-bold tabular-nums text-primary">
            {(data.new_prob * 100).toFixed(1)}%
          </div>
          <RiskBadge tier={data.new_tier} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Δ xác suất</span>
        <span
          className={cn(
            "font-mono font-bold",
            deltaPct > 0 && "text-destructive",
            deltaPct < 0 && "text-emerald-700",
          )}
        >
          {deltaPct > 0 ? "+" : ""}
          {deltaPct.toFixed(2)}%
        </span>
      </div>

      {data.tier_changed && (
        <div className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-[12.5px]">
          <strong>Mức nguy cơ thay đổi:</strong> {data.original_tier} →{" "}
          {data.new_tier}
        </div>
      )}
    </Panel>
  );
}
