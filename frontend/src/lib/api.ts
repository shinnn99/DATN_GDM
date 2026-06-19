import type { components } from "@/types/api";

export type PatientInput = components["schemas"]["PatientInput"];
export type PredictResponse = components["schemas"]["PredictResponse"];
export type ShapItem = components["schemas"]["ShapItem"];
export type ShapLocalResponse = components["schemas"]["ShapLocalResponse"];
export type ShapWaterfallItem = components["schemas"]["ShapWaterfallItem"];
export type RiskTier = "Thấp" | "Trung bình" | "Cao";

export type Patient = {
  id: string;
  code?: string | null;
  full_name: string;
  date_of_birth?: string | null;
  phone?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  prediction_count?: number | null;
};

export type PatientPayload = {
  full_name: string;
  code?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  note?: string | null;
};

export type PredictionRecord = {
  id: string;
  patient_id?: string | null;
  patient_code?: string | null;
  patient_name?: string | null;
  input_features?: Record<string, unknown> | null;
  gdm_probability: number;
  risk_level: RiskTier;
  threshold_used: number;
  has_ogtt?: boolean | null;
  shap_values?: ShapItem[] | null;
  recommendation?: string | null;
  created_at?: string | null;
};

export type PredictionFilters = {
  search?: string;
  risk?: RiskTier[];
  has_ogtt?: boolean;
  date_from?: string;
  date_to?: string;
  prob_min?: number;
  prob_max?: number;
  sort?:
    | "created_at_desc"
    | "created_at_asc"
    | "prob_desc"
    | "prob_asc";
  limit?: number;
  offset?: number;
};

const BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : `HTTP ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail: unknown = text;
    try {
      detail = JSON.parse(text);
    } catch {
      // raw text
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      v.forEach((vv) => qs.append(k, String(vv)));
    } else {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  info: () =>
    request<{
      n_features: number;
      feature_names: string[];
      n_trees: number;
      threshold: number;
      risk_tiers: unknown;
      supabase_enabled: boolean;
    }>("/info"),

  predict: (
    patient: PatientInput,
    meta?: {
      patient_id?: string;
      patient_code?: string;
      patient_name?: string;
    },
  ) =>
    request<PredictResponse>(`/predict${buildQuery(meta ?? {})}`, {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  shapLocal: (patient: PatientInput) =>
    request<ShapLocalResponse>("/shap-local", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  // Patients ---------------------------------------------------------
  listPatients: (opts?: { search?: string; limit?: number; offset?: number }) =>
    request<{ items: Patient[]; total: number }>(
      `/patients${buildQuery(opts ?? {})}`,
    ),

  createPatient: (payload: PatientPayload) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPatient: (id: string) => request<Patient>(`/patients/${id}`),

  updatePatient: (id: string, payload: Partial<PatientPayload>) =>
    request<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deletePatient: (id: string) =>
    request<void>(`/patients/${id}`, { method: "DELETE" }),

  patientPredictions: (
    id: string,
    opts?: { limit?: number; offset?: number; sort?: PredictionFilters["sort"] },
  ) =>
    request<{ items: PredictionRecord[]; total: number }>(
      `/patients/${id}/predictions${buildQuery(opts ?? {})}`,
    ),

  // Predictions ------------------------------------------------------
  listPredictions: (filters?: PredictionFilters) =>
    request<{ items: PredictionRecord[]; total: number }>(
      `/predictions${buildQuery(filters ?? {})}`,
    ),

  getPrediction: (id: string) =>
    request<PredictionRecord>(`/predictions/${id}`),
};

export { ApiError };
