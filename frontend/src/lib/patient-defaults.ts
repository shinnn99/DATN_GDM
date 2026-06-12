import type { PatientInput } from "@/lib/api";

export const FEATURE_LABELS: Record<keyof PatientInput, string> = {
  Age: "Tuổi",
  "No of Pregnancy": "Số lần mang thai",
  "Gestation in previous Pregnancy": "Số lần thai trước (tuần thai)",
  BMI: "BMI (kg/m²)",
  HDL: "HDL-cholesterol (mg/dL)",
  "Family History": "Tiền sử gia đình ĐTĐ",
  "unexplained prenetal loss": "Sảy thai không rõ nguyên nhân",
  "Large Child or Birth Default": "Tiền sử thai to / dị tật",
  PCOS: "Hội chứng buồng trứng đa nang",
  "Sys BP": "Huyết áp tâm thu (mmHg)",
  "Dia BP": "Huyết áp tâm trương (mmHg)",
  OGTT: "OGTT 2h (mg/dL)",
  Hemoglobin: "Hemoglobin (g/dL)",
  "Sedentary Lifestyle": "Lối sống ít vận động",
  Prediabetes: "Tiền tiểu đường",
};

export type NumericRange = {
  min: number;
  max: number;
  integer?: boolean;
  /** Tên ngắn dùng trong placeholder (vd "Tuổi" thay vì "Huyết áp tâm trương (mmHg)") */
  shortLabel: string;
};

/** Range hợp lệ — phải khớp với backend Pydantic schema (xem app/schemas.py). */
export const FEATURE_RANGES = {
  Age: { min: 15, max: 50, integer: true, shortLabel: "Tuổi" },
  "No of Pregnancy": { min: 0, max: 20, integer: true, shortLabel: "Số thai" },
  "Gestation in previous Pregnancy": {
    min: 0,
    max: 20,
    integer: true,
    shortLabel: "Thai trước",
  },
  BMI: { min: 15, max: 50, shortLabel: "BMI" },
  HDL: { min: 20, max: 100, shortLabel: "HDL" },
  "Sys BP": { min: 70, max: 200, shortLabel: "Sys BP" },
  "Dia BP": { min: 40, max: 130, shortLabel: "Dia BP" },
  OGTT: { min: 75, max: 300, shortLabel: "OGTT" },
  Hemoglobin: { min: 7, max: 18, shortLabel: "Hb" },
} satisfies Record<string, NumericRange>;

export type RangedKey = keyof typeof FEATURE_RANGES;
