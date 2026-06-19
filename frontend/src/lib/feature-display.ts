export const FEATURE_LABELS: Record<string, string> = {
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

export const FEATURE_ORDER = [
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

export const BINARY_FEATURES = new Set([
  "Family History",
  "unexplained prenetal loss",
  "Large Child or Birth Default",
  "PCOS",
  "Sedentary Lifestyle",
  "Prediabetes",
]);

export function formatFeatureValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (BINARY_FEATURES.has(key))
    return value === 1 || value === "1" ? "Có" : "Không";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}
