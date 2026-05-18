import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { RiskBadge } from "@/components/risk-badge";
import { PageHeader, Panel } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PredictResponse, ShapItem } from "@/lib/api";
import { FEATURE_LABELS } from "@/lib/patient-defaults";
import { cn } from "@/lib/utils";

export function PredictPage() {
  const mutation = useMutation({
    mutationFn: api.predict,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Dự đoán nguy cơ GDM"
        description="Nhập thông tin bệnh nhân — mô hình trả về xác suất, mức nguy cơ và top 5 yếu tố ảnh hưởng."
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_380px]">
        <Panel
          icon={ClipboardList}
          title="Thông tin bệnh nhân"
          description="OGTT có thể bỏ trống nếu chưa đo — kết quả sẽ rơi vào tier 'Trung bình' và đề nghị làm xét nghiệm."
        >
          <PatientForm
            isSubmitting={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
          />
        </Panel>

        <ResultPanel
          data={mutation.data}
          error={mutation.error}
          isPending={mutation.isPending}
        />
      </div>
    </div>
  );
}

function ResultPanel({
  data,
  isPending,
  error,
}: {
  data?: PredictResponse;
  isPending: boolean;
  error: unknown;
}) {
  if (isPending) {
    return (
      <Panel icon={TrendingUp} title="Đang dự đoán...">
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
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
          {error instanceof Error ? error.message : "Không gọi được API"}
        </div>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel icon={TrendingUp} title="Kết quả">
        <EmptyResult />
      </Panel>
    );
  }

  return (
    <Panel
      icon={TrendingUp}
      title="Kết quả"
      description={`Ngưỡng = ${data.threshold_used.toFixed(2)}`}
      right={<RiskBadge tier={data.risk_level} />}
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-accent-soft via-accent-soft/50 to-transparent p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-accent">
            Xác suất GDM
          </div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums text-primary">
            {(data.gdm_probability * 100).toFixed(1)}%
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${Math.min(100, data.gdm_probability * 100)}%`,
              }}
            />
          </div>
        </div>

        {data.recommendation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            {data.recommendation}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" />
            Top yếu tố ảnh hưởng (SHAP)
          </div>
          <div className="space-y-1">
            {data.top5_shap
              .filter((s) => s.feature !== "MAP" && s.feature !== "BMI_category")
              .map((s, i) => (
                <ShapRow key={`${s.feature}-${i}`} item={s} />
              ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function EmptyResult() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ClipboardList className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        Kết quả sẽ hiển thị tại đây
      </div>
      <p className="max-w-[220px] text-[12px] text-muted-foreground">
        Điền form và bấm "Dự đoán" để xem xác suất, mức nguy cơ và top 5 yếu tố
        ảnh hưởng.
      </p>
    </div>
  );
}

function ShapRow({ item }: { item: ShapItem }) {
  const isIncrease = item.direction === "increase";
  const Icon = isIncrease ? ArrowUp : ArrowDown;
  const label =
    FEATURE_LABELS[item.feature as keyof typeof FEATURE_LABELS] ?? item.feature;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]",
        isIncrease
          ? "border-destructive/15 bg-destructive/5"
          : "border-emerald-200/60 bg-emerald-50/60",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          isIncrease
            ? "bg-destructive/20 text-destructive"
            : "bg-emerald-100 text-emerald-700",
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1 truncate text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground">
        {item.value === null ? "—" : item.value}
      </div>
      <div
        className={cn(
          "font-mono text-[11px] font-semibold tabular-nums",
          isIncrease ? "text-destructive" : "text-emerald-700",
        )}
      >
        {item.shap > 0 ? "+" : ""}
        {item.shap.toFixed(3)}
      </div>
    </div>
  );
}
