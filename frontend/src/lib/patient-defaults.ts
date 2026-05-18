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
