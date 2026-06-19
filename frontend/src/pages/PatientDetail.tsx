import type * as React from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  IdCard,
  Phone,
  Plus,
  Stethoscope,
  User,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/risk-badge";
import { api } from "@/lib/api";
import type { PredictionRecord } from "@/lib/api";
import {
  FEATURE_LABELS,
  FEATURE_ORDER,
  formatFeatureValue,
} from "@/lib/feature-display";
import { cn } from "@/lib/utils";

export function PatientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.getPatient(id),
    enabled: !!id,
  });
  const visits = useQuery({
    queryKey: ["patient-visits", id],
    queryFn: () => api.patientPredictions(id, { limit: 100 }),
    enabled: !!id,
  });

  const items = visits.data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/patients")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Danh sách
        </Button>
      </div>

      <PageHeader
        title={patient.data?.full_name ?? "Bệnh nhân"}
        description={
          patient.data
            ? `Mã: ${patient.data.code ?? "—"} • ${patient.data.prediction_count ?? 0} lần khám`
            : "Đang tải..."
        }
        right={
          <Link to={`/predict?patient=${id}`}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Khám mới
            </Button>
          </Link>
        }
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[320px_1fr]">
        <Panel icon={User} title="Hồ sơ">
          {patient.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : patient.error || !patient.data ? (
            <div className="text-sm text-destructive">
              Không tìm thấy bệnh nhân
            </div>
          ) : (
            <div className="space-y-2 text-[13px]">
              <Row icon={IdCard} label="Mã BN" value={patient.data.code} />
              <Row
                icon={CalendarDays}
                label="Ngày sinh"
                value={patient.data.date_of_birth}
              />
              <Row icon={Phone} label="SĐT" value={patient.data.phone} />
              {patient.data.note && (
                <div className="space-y-1 border-t border-border/60 pt-2">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Ghi chú
                  </div>
                  <p className="text-[12.5px] leading-snug text-foreground">
                    {patient.data.note}
                  </p>
                </div>
              )}
              <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                Tạo:{" "}
                {patient.data.created_at
                  ? new Date(patient.data.created_at).toLocaleString("vi-VN")
                  : "—"}
              </div>
            </div>
          )}
        </Panel>

        <Panel
          icon={Stethoscope}
          title={`Lịch sử khám (${items.length})`}
          description="Mỗi dòng là một lần chạy mô hình. Bấm để xem chi tiết input."
        >
          {visits.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyVisits patientId={id} />
          ) : (
            <VisitsTable items={items} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/40 py-1">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-primary">
        {value || "—"}
      </span>
    </div>
  );
}

function VisitsTable({ items }: { items: PredictionRecord[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <th className="w-8 border-b border-border/60 px-2 pb-2" />
            <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
              Thời gian
            </th>
            <th className="border-b border-border/60 px-2 pb-2 text-right font-semibold">
              Xác suất
            </th>
            <th className="border-b border-border/60 px-2 pb-2 text-center font-semibold">
              OGTT
            </th>
            <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
              Mức nguy cơ
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <VisitRow
                key={r.id}
                record={r}
                open={isOpen}
                onToggle={() => toggle(r.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VisitRow({
  record,
  open,
  onToggle,
}: {
  record: PredictionRecord;
  open: boolean;
  onToggle: () => void;
}) {
  const features = record.input_features;
  const hasFeatures = features && Object.keys(features).length > 0;
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
        <td className="px-2 py-2 text-right font-mono tabular-nums">
          {(record.gdm_probability * 100).toFixed(1)}%
        </td>
        <td className="px-2 py-2 text-center text-[11px]">
          {record.has_ogtt ? (
            <span className="text-emerald-600">Có</span>
          ) : (
            <span className="text-muted-foreground">Không</span>
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
  const extras = Object.keys(features).filter((k) => !FEATURE_ORDER.includes(k));
  const keys = [...ordered, ...extras];
  return (
    <div>
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Thông tin đã nhập
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

function EmptyVisits({ patientId }: { patientId: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Stethoscope className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        Chưa có lần khám nào
      </div>
      <Link to={`/predict?patient=${patientId}`}>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" />
          Thực hiện khám đầu tiên
        </Button>
      </Link>
    </div>
  );
}
