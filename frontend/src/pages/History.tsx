import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileClock, RefreshCw } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/risk-badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const FEATURE_LABELS: Record<string, string> = {
  Age: "Tuổi",
  "No of Pregnancy": "Số lần mang thai",
  "Gestation in previous Pregnancy": "Số lần thai kỳ trước",
  BMI: "BMI",
  HDL: "HDL (mg/dL)",
  "Family History": "Tiền sử gia đình",
  "unexplained prenetal loss": "Sảy thai không rõ nguyên nhân",
  "Large Child or Birth Default": "Con to / dị tật",
  PCOS: "PCOS (buồng trứng đa nang)",
  "Sys BP": "Huyết áp tâm thu (mmHg)",
  "Dia BP": "Huyết áp tâm trương (mmHg)",
  OGTT: "OGTT 2h (mg/dL)",
  Hemoglobin: "Hemoglobin (g/dL)",
  "Sedentary Lifestyle": "Lối sống ít vận động",
  Prediabetes: "Tiền tiểu đường",
};

const FEATURE_ORDER = [
  "Age",
  "No of Pregnancy",
  "Gestation in previous Pregnancy",
  "BMI",
  "HDL",
  "Sys BP",
  "Dia BP",
  "OGTT",
  "Hemoglobin",
  "Family History",
  "unexplained prenetal loss",
  "Large Child or Birth Default",
  "PCOS",
  "Sedentary Lifestyle",
  "Prediabetes",
];

const BINARY_FEATURES = new Set([
  "Family History",
  "unexplained prenetal loss",
  "Large Child or Birth Default",
  "PCOS",
  "Sedentary Lifestyle",
  "Prediabetes",
]);

function formatFeatureValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (BINARY_FEATURES.has(key)) return value === 1 || value === "1" ? "Có" : "Không";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

export function HistoryPage() {
  const query = useQuery({
    queryKey: ["history"],
    queryFn: () => api.history(50),
  });

  const records = query.data?.records ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Lịch sử dự đoán"
        description="Các ca đã chạy gần đây — dùng cho kiểm tra và demo."
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        }
      />

      <Panel
        icon={FileClock}
        title={`${records.length} bản ghi`}
        description="Sắp xếp mới nhất → cũ nhất"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 border-b border-border/60 px-2 pb-2" />
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Thời gian
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Mã BN
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Tên BN
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Mức nguy cơ
                </th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td colSpan={5} className="px-2 py-2">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : query.error ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-sm text-destructive">
                    {query.error instanceof Error
                      ? query.error.message
                      : "Không tải được lịch sử"}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6">
                    <EmptyHistory />
                  </td>
                </tr>
              ) : (
                records.map((r, i) => {
                  const key = r.id ?? String(i);
                  const isOpen = expanded.has(key);
                  const features = r.input_features;
                  const hasFeatures =
                    features && Object.keys(features).length > 0;
                  return (
                    <FragmentRow
                      key={key}
                      open={isOpen}
                      hasFeatures={!!hasFeatures}
                      onToggle={() => hasFeatures && toggle(key)}
                      record={r}
                      features={features as Record<string, unknown> | undefined}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FragmentRow({
  open,
  hasFeatures,
  onToggle,
  record,
  features,
}: {
  open: boolean;
  hasFeatures: boolean;
  onToggle: () => void;
  record: {
    id?: string | null;
    patient_id?: string | null;
    patient_name?: string | null;
    created_at?: string | null;
    gdm_probability: number;
    risk_level: "Thấp" | "Trung bình" | "Cao";
  };
  features?: Record<string, unknown>;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border/40 transition-colors last:border-0",
          hasFeatures && "cursor-pointer hover:bg-accent-soft/40",
          open && "bg-accent-soft/30",
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-2 text-muted-foreground">
          {hasFeatures && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </td>
        <td className="px-2 py-2 text-muted-foreground">
          {record.created_at
            ? new Date(record.created_at).toLocaleString("vi-VN")
            : "—"}
        </td>
        <td className="px-2 py-2 font-mono text-[11px]">
          {record.patient_id ?? "—"}
        </td>
        <td className="px-2 py-2">
          {record.patient_name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-2 py-2">
          <RiskBadge tier={record.risk_level} />
        </td>
      </tr>
      {open && features && (
        <tr className="border-b border-border/40 bg-muted/30">
          <td />
          <td colSpan={4} className="px-2 py-3">
            <PatientFeatures features={features} />
          </td>
        </tr>
      )}
    </>
  );
}

function PatientFeatures({ features }: { features: Record<string, unknown> }) {
  const ordered = FEATURE_ORDER.filter((k) => k in features);
  const extras = Object.keys(features).filter(
    (k) => !FEATURE_ORDER.includes(k),
  );
  const keys = [...ordered, ...extras];

  return (
    <div>
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Thông tin bệnh nhân đã nhập
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {keys.map((k) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-2 border-b border-dashed border-border/40 py-0.5"
          >
            <span className="text-[11px] text-muted-foreground">
              {FEATURE_LABELS[k] ?? k}
            </span>
            <span className="text-[12px] font-medium tabular-nums text-primary">
              {formatFeatureValue(k, features[k])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <FileClock className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        Chưa có bản ghi nào
      </div>
      <p className="max-w-[260px] text-[12px] text-muted-foreground">
        Hãy chạy thử dự đoán ở trang "Dự đoán" để bắt đầu xây dựng lịch sử.
      </p>
    </div>
  );
}
