"""FastAPI app — GDM diagnosis API.

Routes:
- GET  /                          — health
- GET  /info                      — model metadata
- POST /predict                   — predict + lưu vào DB (gắn patient nếu có)
- POST /shap-local                — full SHAP waterfall (không lưu)

- GET    /patients                — list (search, paginate)
- POST   /patients                — create
- GET    /patients/{id}           — detail (+ prediction_count)
- PATCH  /patients/{id}           — update
- DELETE /patients/{id}           — delete (cascade predictions)
- GET    /patients/{id}/predictions — history của 1 bệnh nhân

- GET  /predictions               — list with filters (search/risk/ogtt/date/prob/sort/paging)
- GET  /predictions/{id}          — detail
- GET  /history                   — legacy alias → /predictions
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import get_store
from .model import load_registry, get_registry
from .schemas import (
    PatientInput,
    PredictResponse,
    ShapLocalResponse,
    PatientCreate,
    PatientUpdate,
    PatientOut,
    PatientListResponse,
    PredictionListResponse,
    PredictionRecord,
)
from .shap_utils import (
    predict_with_explanation,
    compute_shap_waterfall,
)


logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gdm-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("ĐATN GDM Backend — startup")
    logger.info("=" * 60)
    load_registry()
    get_store()
    logger.info("Backend sẵn sàng phục vụ request.")
    yield
    logger.info("Backend shutting down.")


app = FastAPI(
    title="GDM Diagnosis API",
    description="Backend cho ĐATN — chẩn đoán Tiểu đường thai kỳ với LightGBM + XAI",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────
# Health & info
# ──────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "GDM Diagnosis API"}


@app.get("/info")
def info():
    reg = get_registry()
    return {
        "n_features": len(reg.feature_names),
        "feature_names": reg.feature_names,
        "n_trees": reg.booster.num_trees(),
        "threshold": reg.threshold,
        "use_calibration": reg.use_calibration,
        "risk_tiers": reg.risk_tiers,
        "supabase_enabled": settings.supabase_enabled,
    }


# ──────────────────────────────────────────────────────────────────────
# Predict
# ──────────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
def predict(
    payload: PatientInput,
    patient_id: Optional[str] = Query(None, description="UUID bệnh nhân đã tồn tại"),
    patient_code: Optional[str] = Query(None, description="Mã BN snapshot (nếu chưa có patient_id)"),
    patient_name: Optional[str] = Query(None, description="Tên BN snapshot (nếu chưa có patient_id)"),
):
    """Predict GDM + lưu vào DB.

    - Nếu truyền `patient_id`: gắn vào hồ sơ đã có (lấy code/name từ patient nếu thiếu).
    - Nếu không: chỉ lưu snapshot code/name (không tạo patient mới — UI sẽ chủ động tạo trước).
    """
    try:
        row = payload.to_feature_dict()
        result = predict_with_explanation(row)
    except Exception as e:
        logger.exception("Predict failed")
        raise HTTPException(status_code=500, detail=str(e))

    store = get_store()
    # Nếu có patient_id, lookup để snapshot code/name
    snap_code = patient_code
    snap_name = patient_name
    if patient_id:
        patient = store.get_patient(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        snap_code = snap_code or patient.get("code")
        snap_name = snap_name or patient.get("full_name")

    try:
        store.save_prediction(
            patient_id=patient_id,
            patient_code=snap_code,
            patient_name=snap_name,
            input_features=row,
            gdm_probability=result["gdm_probability"],
            risk_level=result["risk_level"],
            threshold_used=result["threshold_used"],
            has_ogtt=result["has_ogtt"],
            shap_values=result["top5_shap"],
            recommendation=result.get("recommendation"),
        )
    except Exception:
        logger.exception("DB save failed — continue anyway")

    return result


# ──────────────────────────────────────────────────────────────────────
# /shap-local
# ──────────────────────────────────────────────────────────────────────

@app.post("/shap-local", response_model=ShapLocalResponse)
def shap_local(payload: PatientInput):
    try:
        row = payload.to_feature_dict()
        return compute_shap_waterfall(row)
    except Exception as e:
        logger.exception("SHAP local failed")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# Patients CRUD
# ──────────────────────────────────────────────────────────────────────

@app.get("/patients", response_model=PatientListResponse)
def list_patients(
    search: Optional[str] = Query(None, description="Tìm theo tên / mã / SĐT"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return get_store().list_patients(search=search, limit=limit, offset=offset)


@app.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate):
    try:
        return get_store().create_patient(**payload.model_dump())
    except Exception as e:
        msg = str(e)
        if "duplicate" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=409, detail="Mã bệnh nhân đã tồn tại")
        logger.exception("Create patient failed")
        raise HTTPException(status_code=500, detail=msg)


@app.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str):
    p = get_store().get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@app.patch("/patients/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: str, payload: PatientUpdate):
    p = get_store().update_patient(patient_id, **payload.model_dump(exclude_unset=True))
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@app.delete("/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: str):
    if not get_store().delete_patient(patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return None


@app.get("/patients/{patient_id}/predictions", response_model=PredictionListResponse)
def patient_predictions(
    patient_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort: str = Query("created_at_desc"),
):
    return get_store().list_predictions(
        patient_id=patient_id, limit=limit, offset=offset, sort=sort,
    )


# ──────────────────────────────────────────────────────────────────────
# Predictions list (with filters)
# ──────────────────────────────────────────────────────────────────────

@app.get("/predictions", response_model=PredictionListResponse)
def list_predictions(
    search: Optional[str] = Query(None, description="Tìm theo tên / mã BN snapshot"),
    risk: Optional[list[str]] = Query(None, description="Mức nguy cơ: Thấp / Trung bình / Cao (multi)"),
    has_ogtt: Optional[bool] = Query(None),
    date_from: Optional[str] = Query(None, description="ISO date/datetime — created_at ≥ ..."),
    date_to: Optional[str] = Query(None, description="ISO date/datetime — created_at ≤ ..."),
    prob_min: Optional[float] = Query(None, ge=0, le=1),
    prob_max: Optional[float] = Query(None, ge=0, le=1),
    sort: str = Query("created_at_desc", pattern="^(created_at_desc|created_at_asc|prob_desc|prob_asc)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    # Validate risk levels
    valid_risks = {"Thấp", "Trung bình", "Cao"}
    if risk:
        for r in risk:
            if r not in valid_risks:
                raise HTTPException(status_code=400, detail=f"Invalid risk: {r}")
    return get_store().list_predictions(
        search=search,
        risk_levels=risk,
        has_ogtt=has_ogtt,
        date_from=date_from,
        date_to=date_to,
        prob_min=prob_min,
        prob_max=prob_max,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@app.get("/predictions/{prediction_id}", response_model=PredictionRecord)
def get_prediction(prediction_id: str):
    p = get_store().get_prediction(prediction_id)
    if not p:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return p


# ──────────────────────────────────────────────────────────────────────
# Legacy alias /history (giữ tương thích frontend cũ)
# ──────────────────────────────────────────────────────────────────────

@app.get("/history")
def history(limit: int = Query(50, ge=1, le=500)):
    res = get_store().list_predictions(limit=limit)
    return {
        "store_type": "supabase" if settings.supabase_enabled else "mock",
        "records": res["items"],
    }
