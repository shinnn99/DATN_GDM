import type { components } from "@/types/api";

export type PatientInput = components["schemas"]["PatientInput"];
export type PredictResponse = components["schemas"]["PredictResponse"];
export type ShapItem = components["schemas"]["ShapItem"];
export type ShapLocalResponse = components["schemas"]["ShapLocalResponse"];
export type ShapWaterfallItem = components["schemas"]["ShapWaterfallItem"];
export type WhatIfRequest = components["schemas"]["WhatIfRequest"];
export type WhatIfResponse = components["schemas"]["WhatIfResponse"];
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
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
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

  predict: (patient: PatientInput) =>
    request<PredictResponse>("/predict", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  shapLocal: (patient: PatientInput) =>
    request<ShapLocalResponse>("/shap-local", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  whatIf: (body: WhatIfRequest) =>
    request<WhatIfResponse>("/what-if", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  history: (limit = 50) =>
    request<{
      store_type: "supabase" | "mock";
      records: Array<{
        id?: string | null;
        patient_id?: string | null;
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
