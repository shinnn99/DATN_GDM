import { useMutation } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ClipboardList, Info } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { RiskBadge } from "@/components/risk-badge";
import { PageHeader, Panel } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { ShapLocalResponse } from "@/lib/api";
import { FEATURE_LABELS } from "@/lib/patient-defaults";

export function ShapPage() {
  const mutation = useMutation({
    mutationFn: api.shapLocal,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Giải thích SHAP"
        description="Mỗi feature đóng góp bao nhiêu vào dự đoán — sắp xếp theo |SHAP| giảm dần. Đỏ = đẩy nguy cơ lên, xanh = kéo nguy cơ xuống."
      />

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_minmax(0,560px)]">
        <Panel icon={ClipboardList} title="Thông tin bệnh nhân">
          <PatientForm
            submitLabel="Tính SHAP"
            isSubmitting={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
          />
        </Panel>

        <ShapResult
          data={mutation.data}
          error={mutation.error}
          isPending={mutation.isPending}
        />
      </div>
    </div>
  );
}

function ShapResult({
  data,
  isPending,
  error,
}: {
  data?: ShapLocalResponse;
  isPending: boolean;
  error: unknown;
}) {
  if (isPending) {
    return (
      <Panel icon={BarChart3} title="Đang tính SHAP...">
        <Skeleton className="h-full min-h-[280px] w-full" />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel
        icon={BarChart3}
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
      <Panel
        icon={BarChart3}
        title="Waterfall SHAP"
        description="Điền form và bấm 'Tính SHAP' để xem biểu đồ."
      >
        <EmptyChart />
      </Panel>
    );
  }

  const ENGINEERED = new Set(["MAP", "BMI_category"]);
  const chartData = data.features
    .filter((f) => !ENGINEERED.has(f.feature))
    .map((f) => ({
      feature:
        FEATURE_LABELS[f.feature as keyof typeof FEATURE_LABELS] ?? f.feature,
      shap: f.shap,
      value: f.value,
    }));

  return (
    <Panel
      icon={BarChart3}
      title="Waterfall SHAP"
      description={`Base = ${data.base_value.toFixed(3)} → Predicted = ${(data.predicted_probability * 100).toFixed(1)}%`}
      right={<RiskBadge tier={data.risk_level} />}
      bodyClassName="flex flex-col gap-2"
    >
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="feature"
              width={170}
              tick={{ fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="hsl(222 60% 18%)" />
            <Tooltip
              cursor={{ fill: "hsl(168 70% 95% / 0.5)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(214 32% 91%)",
                fontSize: 12,
              }}
              formatter={(v: number) => v.toFixed(4)}
              labelFormatter={(label, payload) => {
                const value = payload?.[0]?.payload?.value;
                return `${label}${value === null ? " (chưa có)" : ` = ${value}`}`;
              }}
            />
            <Bar dataKey="shap" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.shap >= 0 ? "#dc2626" : "#059669"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
        <span>
          Đã loại 2 feature dẫn xuất (MAP, BMI_category) khỏi biểu đồ — backend
          tự tính từ Sys/Dia BP và BMI.
        </span>
      </div>
    </Panel>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <BarChart3 className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        Biểu đồ SHAP sẽ hiển thị tại đây
      </div>
      <p className="max-w-[280px] text-[12px] text-muted-foreground">
        Điền thông tin bệnh nhân ở bên trái và bấm "Tính SHAP" để xem đóng góp
        của từng feature.
      </p>
    </div>
  );
}
