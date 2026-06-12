import { z } from "zod";
import { FEATURE_RANGES } from "@/lib/patient-defaults";

// Checkbox: unchecked → undefined, checked → true. Backend cần 0 | 1.
const bin = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .optional()
  .transform((v) => (v ? 1 : 0) as 0 | 1);

function optionalRanged(min: number, max: number) {
  return z
    .union([z.number(), z.nan(), z.null(), z.undefined()])
    .transform((v) =>
      v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v,
    )
    .refine(
      (v) => v === null || (v >= min && v <= max),
      { message: `Giá trị phải trong khoảng ${min}–${max}` },
    );
}

const R = FEATURE_RANGES;

export const patientSchema = z.object({
  patient_id: z.string().optional(),
  patient_name: z.string().optional(),
  Age: z.coerce.number().int().min(R.Age.min).max(R.Age.max),
  "No of Pregnancy": z.coerce
    .number()
    .int()
    .min(R["No of Pregnancy"].min)
    .max(R["No of Pregnancy"].max),
  "Gestation in previous Pregnancy": z.coerce
    .number()
    .int()
    .min(R["Gestation in previous Pregnancy"].min)
    .max(R["Gestation in previous Pregnancy"].max),
  BMI: optionalRanged(R.BMI.min, R.BMI.max),
  HDL: optionalRanged(R.HDL.min, R.HDL.max),
  "Family History": bin,
  "unexplained prenetal loss": bin,
  "Large Child or Birth Default": bin,
  PCOS: bin,
  "Sys BP": optionalRanged(R["Sys BP"].min, R["Sys BP"].max),
  "Dia BP": z.coerce.number().min(R["Dia BP"].min).max(R["Dia BP"].max),
  OGTT: optionalRanged(R.OGTT.min, R.OGTT.max),
  Hemoglobin: z.coerce
    .number()
    .min(R.Hemoglobin.min)
    .max(R.Hemoglobin.max),
  "Sedentary Lifestyle": bin,
  Prediabetes: bin,
});

export type PatientFormInput = z.input<typeof patientSchema>;
export type PatientFormValues = z.output<typeof patientSchema>;
