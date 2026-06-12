"""FastAPI application — 3 endpoints chính cho ĐATN GDM.

Routes:
- GET  /              — health check
- GET  /info          — model metadata
- POST /predict       — predict + tier + top5 SHAP
- POST /shap-local    — full SHAP waterfall
- GET  /history       — list recent predictions (Supabase or mock)
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
    """Startup: load model + explainer + warm DB.

    ⚠️ Plan task 4.2: KHÔNG load model trong mỗi request — load 1 lần ở startup.
    """
    logger.info("=" * 60)
    logger.info("ĐATN GDM Backend — startup")
    logger.info("=" * 60)
    load_registry()
    get_store()  # warm singleton
    logger.info("Backend sẵn sàng phục vụ request.")
    yield
    logger.info("Backend shutting down.")


app = FastAPI(
    title="GDM Diagnosis API",
    description="Backend cho ĐATN — chẩn đoán Tiểu đường thai kỳ với LightGBM + XAI",
    version="1.0.0",
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
# /predict — task 4.3
# ──────────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
def predict(
    payload: PatientInput,
    patient_id: Optional[str] = Query(None, description="Optional ID để lưu DB"),
    patient_name: Optional[str] = Query(None, description="Optional tên bệnh nhân"),
):
    """Predict GDM probability + risk tier + top 5 SHAP contributions.

    Tier rules (Option D — match Phase 2):
    - **Thấp**: có OGTT + prob < threshold
    - **Cao**: có OGTT + prob ≥ threshold
    - **Trung bình**: OGTT missing → recommend làm OGTT
    """
    try:
        row = payload.to_feature_dict()
        result = predict_with_explanation(row)
    except Exception as e:
        logger.exception("Predict failed")
        raise HTTPException(status_code=500, detail=str(e))

    # Persist
    try:
        get_store().save(
            patient_id=patient_id,
            patient_name=patient_name,
            input_features=row,
            gdm_probability=result["gdm_probability"],
            risk_level=result["risk_level"],
            threshold_used=result["threshold_used"],
            shap_values=result["top5_shap"],
        )
    except Exception:
        # Don't fail request nếu DB save lỗi
        logger.exception("DB save failed — continue anyway")

    return result


# ──────────────────────────────────────────────────────────────────────
# /shap-local — task 4.4
# ──────────────────────────────────────────────────────────────────────

@app.post("/shap-local", response_model=ShapLocalResponse)
def shap_local(payload: PatientInput):
    """Full SHAP waterfall data — frontend dùng để render chart.

    ⚠️ SHAP computation ~200-500ms/request. Cân nhắc cache nếu demo cùng lúc nhiều người.
    """
    try:
        row = payload.to_feature_dict()
        return compute_shap_waterfall(row)
    except Exception as e:
        logger.exception("SHAP local failed")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# /history — list predictions (Supabase or mock)
# ──────────────────────────────────────────────────────────────────────

@app.get("/history")
def history(limit: int = Query(50, ge=1, le=500)):
    """List recent predictions. Source = Supabase nếu config, không thì mock."""
    return {
        "store_type": "supabase" if settings.supabase_enabled else "mock",
        "records": get_store().list_recent(limit),
    }
