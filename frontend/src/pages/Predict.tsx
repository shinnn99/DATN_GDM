import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { RiskBadge } from "@/components/risk-badge";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Patient, PredictResponse, ShapItem } from "@/lib/api";
import { FEATURE_LABELS } from "@/lib/patient-defaults";
import { cn } from "@/lib/utils";
import { CreatePatientDialog } from "./Patients";

export function PredictPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient");
  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const selectedPatient = useQuery({
    queryKey: ["patient", patientIdParam],
    queryFn: () => api.getPatient(patientIdParam!),
    enabled: !!patientIdParam,
  });

  const mutation = useMutation({
    mutationFn: ({
      patient,
      meta,
    }: {
      patient: Parameters<typeof api.predict>[0];
      meta?: Parameters<typeof api.predict>[1];
    }) => api.predict(patient, meta),
  });

  const linkedPatient = selectedPatient.data;
  const useSnapshot = !patientIdParam;

  const clearPatient = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("patient");
    setSearchParams(next, { replace: true });
  };

  const setPatient = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("patient", id);
    setSearchParams(next, { replace: true });
    setShowPicker(false);
  };

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
          <div className="mb-3">
            {linkedPatient ? (
              <LinkedPatientBanner
                patient={linkedPatient}
                onClear={clearPatient}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">
                  Chưa gắn vào bệnh nhân nào — kết quả sẽ lưu vào lịch sử nhưng
                  không gắn vào hồ sơ.
                </span>
                <div className="ml-auto flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPicker(true)}
                  >
                    <User className="h-3.5 w-3.5" />
                    Chọn bệnh nhân
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreate(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Tạo mới
                  </Button>
                </div>
              </div>
            )}
          </div>

          <PatientForm
            isSubmitting={mutation.isPending}
            showMeta={useSnapshot}
            onSubmit={(values, meta) => {
              const apiMeta: Parameters<typeof api.predict>[1] = patientIdParam
                ? { patient_id: patientIdParam }
                : {
                    patient_code: meta.patient_id,
                    patient_name: meta.patient_name,
                  };
              mutation.mutate({ patient: values, meta: apiMeta });
            }}
          />
        </Panel>

        <ResultPanel
          data={mutation.data}
          error={mutation.error}
          isPending={mutation.isPending}
          patient={linkedPatient}
        />
      </div>

      {showCreate && (
        <CreatePatientDialog
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setShowCreate(false);
            setPatient(p.id);
          }}
        />
      )}

      {showPicker && (
        <PatientPicker
          onClose={() => setShowPicker(false)}
          onPick={(p) => setPatient(p.id)}
        />
      )}
    </div>
  );
}

function LinkedPatientBanner({
  patient,
  onClear,
}: {
  patient: Patient;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft/60 px-3 py-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-primary">
          {patient.full_name}
          {patient.code && (
            <span className="ml-2 font-mono text-[10.5px] font-normal text-muted-foreground">
              {patient.code}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Kết quả khám sẽ được lưu vào hồ sơ này.
        </div>
      </div>
      <div className="ml-auto flex gap-1.5">
        <Link to={`/patients/${patient.id}`}>
          <Button variant="outline" size="sm">
            Xem hồ sơ
          </Button>
        </Link>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Bỏ chọn"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PatientPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (p: Patient) => void;
}) {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["patients", search],
    queryFn: () => api.listPatients({ search: search || undefined, limit: 30 }),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="surface-card flex max-h-[80vh] w-full max-w-md flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">
            Chọn bệnh nhân
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input
          placeholder="Tìm theo tên / mã / SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-[13px]"
          autoFocus
        />
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60">
          {q.isLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (q.data?.items ?? []).length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-muted-foreground">
              Không tìm thấy bệnh nhân nào
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {q.data!.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] hover:bg-accent-soft/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-primary">
                        {p.full_name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {p.code ?? "—"}
                        {p.phone ? ` • ${p.phone}` : ""}
                      </div>
                    </div>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      {p.prediction_count ?? 0} lần khám
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  data,
  isPending,
  error,
  patient,
}: {
  data?: PredictResponse;
  isPending: boolean;
  error: unknown;
  patient?: Patient;
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

        {patient && (
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-[12px] text-emerald-900">
            ✓ Đã lưu kết quả vào hồ sơ <strong>{patient.full_name}</strong>.{" "}
            <Link
              to={`/patients/${patient.id}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              Xem lịch sử khám
            </Link>
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
