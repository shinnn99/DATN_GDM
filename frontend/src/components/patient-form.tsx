import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, IdCard, RotateCcw, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  patientSchema,
  type PatientFormInput,
  type PatientFormValues,
} from "@/lib/patient-schema";
import { FEATURE_LABELS, FEATURE_RANGES } from "@/lib/patient-defaults";
import type { PatientInput } from "@/lib/api";
import { cn } from "@/lib/utils";

export type PatientMeta = {
  patient_id?: string;
  patient_name?: string;
};

type NumericKey =
  | "Age"
  | "No of Pregnancy"
  | "Gestation in previous Pregnancy"
  | "BMI"
  | "HDL"
  | "Sys BP"
  | "Dia BP"
  | "OGTT"
  | "Hemoglobin";

type BinaryKey =
  | "Family History"
  | "unexplained prenetal loss"
  | "Large Child or Birth Default"
  | "PCOS"
  | "Sedentary Lifestyle"
  | "Prediabetes";

const NUMERIC_GROUPS: { title: string; keys: NumericKey[] }[] = [
  {
    title: "Nhân khẩu — sản khoa",
    keys: ["Age", "No of Pregnancy", "Gestation in previous Pregnancy"],
  },
  {
    title: "Đo lường lâm sàng",
    keys: ["BMI", "HDL", "Sys BP", "Dia BP", "Hemoglobin", "OGTT"],
  },
];

const BINARY_KEYS: BinaryKey[] = [
  "Family History",
  "unexplained prenetal loss",
  "Large Child or Birth Default",
  "PCOS",
  "Sedentary Lifestyle",
  "Prediabetes",
];

const OPTIONAL_NUMERIC: ReadonlySet<NumericKey> = new Set([
  "BMI",
  "HDL",
  "Sys BP",
  "OGTT",
]);

interface Props {
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: PatientInput, meta: PatientMeta) => void;
  formId?: string;
  /** Compact bỏ tiêu đề nhóm để tiết kiệm không gian */
  dense?: boolean;
  /** Hiển thị ô nhập Mã BN / Tên BN. Mặc định: true */
  showMeta?: boolean;
}

export function PatientForm({
  submitLabel = "Dự đoán",
  isSubmitting,
  onSubmit,
  formId,
  dense,
  showMeta = true,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormInput, unknown, PatientFormValues>({
    resolver: zodResolver(patientSchema),
  });

  const submit: SubmitHandler<PatientFormValues> = (values) => {
    const { patient_id, patient_name, ...rest } = values;
    onSubmit(rest as PatientInput, {
      patient_id: patient_id?.trim() || undefined,
      patient_name: patient_name?.trim() || undefined,
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(submit, (errs) =>
        console.warn("Form validation failed:", errs),
      )}
      className={cn("space-y-4", dense && "space-y-3")}
      onReset={() => reset()}
    >
      {hasErrors && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Vui lòng kiểm tra các trường bị đánh dấu đỏ (
          {Object.keys(errors).length} lỗi).
        </div>
      )}

      {showMeta && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Định danh bệnh nhân
            </h3>
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-[10px] text-muted-foreground/70">tuỳ chọn</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label
                htmlFor="patient_id"
                className="text-[11.5px] font-medium text-muted-foreground"
              >
                Mã bệnh nhân
              </Label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="patient_id"
                  type="text"
                  autoComplete="off"
                  placeholder="VD: BN-001"
                  {...register("patient_id")}
                  className="h-8 pl-8 text-[13px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="patient_name"
                className="text-[11.5px] font-medium text-muted-foreground"
              >
                Tên bệnh nhân
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="patient_name"
                  type="text"
                  autoComplete="off"
                  placeholder="VD: Nguyễn Thị A"
                  {...register("patient_name")}
                  className="h-8 pl-8 text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {NUMERIC_GROUPS.map((group, gi) => (
        <div key={group.title} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h3>
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-[10px] text-muted-foreground/70">
              {gi === 0 ? "bắt buộc" : "có thể bỏ trống một số trường"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {group.keys.map((k) => {
              const optional = OPTIONAL_NUMERIC.has(k);
              const err = errors[k];
              const range = FEATURE_RANGES[k];
              const rangeText = `${range.min} ≤ ${range.shortLabel} ≤ ${range.max}`;
              return (
                <div key={k} className="space-y-1">
                  <Label
                    htmlFor={k}
                    className="text-[11.5px] font-medium text-muted-foreground"
                  >
                    {FEATURE_LABELS[k]}
                    {optional && (
                      <span className="ml-1 text-[10px] text-muted-foreground/70">
                        (tuỳ chọn)
                      </span>
                    )}
                  </Label>
                  <Input
                    id={k}
                    type="number"
                    step={range.integer ? 1 : "any"}
                    min={range.min}
                    max={range.max}
                    inputMode={range.integer ? "numeric" : "decimal"}
                    placeholder={rangeText}
                    {...register(k, {
                      setValueAs: (v) =>
                        v === "" || v == null
                          ? optional
                            ? null
                            : undefined
                          : Number(v),
                    })}
                    className={cn(
                      "h-8 text-[13px]",
                      err && "border-destructive focus-visible:ring-destructive/30",
                    )}
                  />
                  {err && (
                    <p className="text-[10.5px] text-destructive">
                      {err.message as string}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Yếu tố nguy cơ
          </h3>
          <span className="h-px flex-1 bg-border/70" />
          <span className="text-[10px] text-muted-foreground/70">
            tích = có
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {BINARY_KEYS.map((k) => (
            <CheckboxRow key={k} register={register} name={k} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
          {isSubmitting ? (
            "Đang xử lý..."
          ) : (
            <>
              <Check className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
        <Button type="reset" variant="outline">
          <RotateCcw className="h-4 w-4" />
          Đặt lại
        </Button>
      </div>
    </form>
  );
}

function CheckboxRow({
  register,
  name,
}: {
  register: ReturnType<typeof useForm<PatientFormInput, unknown, PatientFormValues>>["register"];
  name: BinaryKey;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-2 text-[12.5px] transition-colors hover:border-accent/50 hover:bg-accent-soft/40 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
      <input type="checkbox" className="peer sr-only" {...register(name)} />
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-border bg-card text-transparent transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="leading-tight">{FEATURE_LABELS[name]}</span>
    </label>
  );
}
