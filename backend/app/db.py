"""DB layer — Supabase nếu config có, không thì in-memory mock.

Schema bảng predictions (tạo trên Supabase trước khi dùng):
    CREATE TABLE predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id TEXT,
        patient_name TEXT,
        input_features JSONB,
        gdm_probability FLOAT,
        risk_level TEXT,
        threshold_used FLOAT,
        shap_values JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_predictions_risk_level ON predictions(risk_level);
    CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)


class PredictionStore:
    """Abstract store. Implementations: SupabaseStore hoặc MockStore."""

    def save(
        self,
        patient_id: Optional[str],
        patient_name: Optional[str],
        input_features: dict,
        gdm_probability: float,
        risk_level: str,
        threshold_used: float,
        shap_values: list[dict],
    ) -> str:
        raise NotImplementedError

    def list_recent(self, limit: int = 50) -> list[dict]:
        raise NotImplementedError


class MockStore(PredictionStore):
    """In-memory store — dùng khi chưa setup Supabase."""

    def __init__(self):
        self._records: list[dict] = []
        logger.warning(
            "Supabase chưa config → dùng MockStore (in-memory). "
            "Predictions sẽ mất khi restart server. "
            "Set SUPABASE_URL + SUPABASE_KEY trong .env để enable persistence."
        )

    def save(
        self,
        patient_id: Optional[str],
        patient_name: Optional[str],
        input_features: dict,
        gdm_probability: float,
        risk_level: str,
        threshold_used: float,
        shap_values: list[dict],
    ) -> str:
        rec_id = str(uuid.uuid4())
        record = {
            "id": rec_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "input_features": input_features,
            "gdm_probability": gdm_probability,
            "risk_level": risk_level,
            "threshold_used": threshold_used,
            "shap_values": shap_values,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._records.append(record)
        return rec_id

    def list_recent(self, limit: int = 50) -> list[dict]:
        return list(reversed(self._records[-limit:]))


class SupabaseStore(PredictionStore):
    """Real Supabase implementation."""

    def __init__(self, url: str, key: str):
        # Lazy import — không import nếu không dùng
        from supabase import create_client

        self.client = create_client(url, key)
        self.table = "predictions"
        logger.info(f"SupabaseStore initialized → {url}")

    def save(
        self,
        patient_id: Optional[str],
        patient_name: Optional[str],
        input_features: dict,
        gdm_probability: float,
        risk_level: str,
        threshold_used: float,
        shap_values: list[dict],
    ) -> str:
        rec = {
            "patient_id": patient_id,
            "patient_name": patient_name,
            "input_features": input_features,
            "gdm_probability": gdm_probability,
            "risk_level": risk_level,
            "threshold_used": threshold_used,
            "shap_values": shap_values,
        }
        result = self.client.table(self.table).insert(rec).execute()
        if not result.data:
            raise RuntimeError(f"Supabase insert failed: {result}")
        return result.data[0]["id"]

    def list_recent(self, limit: int = 50) -> list[dict]:
        result = (
            self.client.table(self.table)
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []


_store: Optional[PredictionStore] = None


def get_store() -> PredictionStore:
    """Singleton store getter — init lazy."""
    global _store
    if _store is None:
        if settings.supabase_enabled:
            _store = SupabaseStore(settings.supabase_url, settings.supabase_key)
        else:
            _store = MockStore()
    return _store
