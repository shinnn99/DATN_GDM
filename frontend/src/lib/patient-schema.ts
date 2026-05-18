import { z } from "zod";

// Checkbox: unchecked → undefined, checked → true. Backend cần 0 | 1.
const bin = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .optional()
  .transform((v) => (v ? 1 : 0) as 0 | 1);

const optionalNumber = z
  .union([z.number(), z.nan(), z.null(), z.undefined()])
  .transform((v) => (v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v));

export const patientSchema = z.object({
  Age: z.coerce.number().min(15).max(50),
  "No of Pregnancy": z.coerce.number().int().min(0).max(15),
  "Gestation in previous Pregnancy": z.coerce.number().int().min(0).max(15),
  BMI: optionalNumber,
  HDL: optionalNumber,
  "Family History": bin,
  "unexplained prenetal loss": bin,
  "Large Child or Birth Default": bin,
  PCOS: bin,
  "Sys BP": optionalNumber,
  "Dia BP": z.coerce.number().min(40).max(150),
  OGTT: optionalNumber,
  Hemoglobin: z.coerce.number().min(5).max(20),
  "Sedentary Lifestyle": bin,
  Prediabetes: bin,
});

export type PatientFormInput = z.input<typeof patientSchema>;
export type PatientFormValues = z.output<typeof patientSchema>;
