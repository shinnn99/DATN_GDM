import type { components } from "@/types/api";

export type PatientInput = components["schemas"]["PatientInput"];
export type PredictResponse = components["schemas"]["PredictResponse"];
export type ShapItem = components["schemas"]["ShapItem"];
export type ShapLocalResponse = components["schemas"]["ShapLocalResponse"];
export type ShapWaterfallItem = components["schemas"]["ShapWaterfallItem"];
export type RiskTier = "Thấp" | "Trung bình" | "Cao";

const BASE = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
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
      // keep raw text
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
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
    meta?: { patient_id?: string; patient_name?: string },
  ) => {
    const qs = new URLSearchParams();
    if (meta?.patient_id) qs.set("patient_id", meta.patient_id);
    if (meta?.patient_name) qs.set("patient_name", meta.patient_name);
    const q = qs.toString();
    return request<PredictResponse>(`/predict${q ? `?${q}` : ""}`, {
      method: "POST",
      body: JSON.stringify(patient),
    });
  },

  shapLocal: (patient: PatientInput) =>
    request<ShapLocalResponse>("/shap-local", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  history: (limit = 50) =>
    request<{
      store_type: "supabase" | "mock";
      records: Array<{
        id?: string | null;
        patient_id?: string | null;
        patient_name?: string | null;
        created_at?: string | null;
        gdm_probability: number;
        risk_level: RiskTier;
        threshold_used: number;
        input_features?: Record<string, unknown>;
        shap_values?: ShapItem[];
      }>;
    }>(`/history?limit=${limit}`),
};

export { ApiError };
