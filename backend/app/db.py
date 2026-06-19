"""DB layer — Supabase nếu config có, không thì in-memory mock.

Hai bảng:
- `patients`  : hồ sơ bệnh nhân (id, code, full_name, dob, phone, note, ...)
- `predictions` : mỗi lần khám / chạy model, FK → patients.id (nullable)

Cả Supabase và Mock đều expose cùng interface để main.py không cần biết.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, date
from typing import Optional, Any

from .config import settings

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Interface
# ──────────────────────────────────────────────────────────────────────

class Store:
    """Interface chung cho mock & supabase."""

    # ----- Patients -----
    def create_patient(
        self,
        full_name: str,
        code: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        phone: Optional[str] = None,
        note: Optional[str] = None,
    ) -> dict: raise NotImplementedError

    def update_patient(
        self,
        patient_id: str,
        *,
        full_name: Optional[str] = None,
        code: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        phone: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Optional[dict]: raise NotImplementedError

    def delete_patient(self, patient_id: str) -> bool: raise NotImplementedError

    def get_patient(self, patient_id: str) -> Optional[dict]: raise NotImplementedError

    def list_patients(
        self,
        *,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict: raise NotImplementedError

    # ----- Predictions -----
    def save_prediction(
        self,
        *,
        patient_id: Optional[str],
        patient_code: Optional[str],
        patient_name: Optional[str],
        input_features: dict,
        gdm_probability: float,
        risk_level: str,
        threshold_used: float,
        has_ogtt: bool,
        shap_values: list[dict],
        recommendation: Optional[str],
    ) -> str: raise NotImplementedError

    def list_predictions(
        self,
        *,
        patient_id: Optional[str] = None,
        search: Optional[str] = None,
        risk_levels: Optional[list[str]] = None,
        has_ogtt: Optional[bool] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        prob_min: Optional[float] = None,
        prob_max: Optional[float] = None,
        sort: str = "created_at_desc",
        limit: int = 50,
        offset: int = 0,
    ) -> dict: raise NotImplementedError

    def get_prediction(self, prediction_id: str) -> Optional[dict]: raise NotImplementedError


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


# ──────────────────────────────────────────────────────────────────────
# Mock store (in-memory)
# ──────────────────────────────────────────────────────────────────────

class MockStore(Store):
    def __init__(self):
        self._patients: dict[str, dict] = {}
        self._predictions: dict[str, dict] = {}
        logger.warning(
            "Supabase chưa config → dùng MockStore (in-memory). "
            "Dữ liệu sẽ mất khi restart server."
        )

    # Patients ---------------------------------------------------------
    def create_patient(self, full_name, code=None, date_of_birth=None, phone=None, note=None):
        pid = str(uuid.uuid4())
        now = _now()
        rec = {
            "id": pid,
            "code": code,
            "full_name": full_name,
            "date_of_birth": date_of_birth,
            "phone": phone,
            "note": note,
            "created_at": now,
            "updated_at": now,
        }
        self._patients[pid] = rec
        return rec

    def update_patient(self, patient_id, *, full_name=None, code=None, date_of_birth=None, phone=None, note=None):
        rec = self._patients.get(patient_id)
        if not rec:
            return None
        if full_name is not None: rec["full_name"] = full_name
        if code is not None: rec["code"] = code or None
        if date_of_birth is not None: rec["date_of_birth"] = date_of_birth or None
        if phone is not None: rec["phone"] = phone or None
        if note is not None: rec["note"] = note or None
        rec["updated_at"] = _now()
        return rec

    def delete_patient(self, patient_id):
        if patient_id in self._patients:
            del self._patients[patient_id]
            # Cascade: gỡ FK ở predictions
            for p in self._predictions.values():
                if p.get("patient_id") == patient_id:
                    p["patient_id"] = None
            return True
        return False

    def get_patient(self, patient_id):
        rec = self._patients.get(patient_id)
        if not rec:
            return None
        return {**rec, "prediction_count": sum(
            1 for p in self._predictions.values() if p.get("patient_id") == patient_id
        )}

    def list_patients(self, *, search=None, limit=50, offset=0):
        items = list(self._patients.values())
        if search:
            s = _norm(search)
            items = [
                p for p in items
                if s in _norm(p.get("full_name")) or s in _norm(p.get("code")) or s in _norm(p.get("phone"))
            ]
        items.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        total = len(items)
        # Tính prediction_count
        counts: dict[str, int] = {}
        for p in self._predictions.values():
            pid = p.get("patient_id")
            if pid:
                counts[pid] = counts.get(pid, 0) + 1
        enriched = [{**p, "prediction_count": counts.get(p["id"], 0)} for p in items[offset:offset + limit]]
        return {"items": enriched, "total": total}

    # Predictions ------------------------------------------------------
    def save_prediction(self, **kw) -> str:
        rec_id = str(uuid.uuid4())
        rec = {
            "id": rec_id,
            "patient_id": kw["patient_id"],
            "patient_code": kw["patient_code"],
            "patient_name": kw["patient_name"],
            "input_features": kw["input_features"],
            "gdm_probability": kw["gdm_probability"],
            "risk_level": kw["risk_level"],
            "threshold_used": kw["threshold_used"],
            "has_ogtt": kw["has_ogtt"],
            "shap_values": kw["shap_values"],
            "recommendation": kw["recommendation"],
            "created_at": _now(),
        }
        self._predictions[rec_id] = rec
        return rec_id

    def list_predictions(
        self, *, patient_id=None, search=None, risk_levels=None,
        has_ogtt=None, date_from=None, date_to=None,
        prob_min=None, prob_max=None,
        sort="created_at_desc", limit=50, offset=0,
    ):
        items = list(self._predictions.values())
        if patient_id:
            items = [p for p in items if p.get("patient_id") == patient_id]
        if search:
            s = _norm(search)
            items = [
                p for p in items
                if s in _norm(p.get("patient_name")) or s in _norm(p.get("patient_code"))
            ]
        if risk_levels:
            rl = set(risk_levels)
            items = [p for p in items if p.get("risk_level") in rl]
        if has_ogtt is not None:
            items = [p for p in items if bool(p.get("has_ogtt")) is has_ogtt]
        if date_from:
            items = [p for p in items if p.get("created_at", "") >= date_from]
        if date_to:
            items = [p for p in items if p.get("created_at", "") <= date_to]
        if prob_min is not None:
            items = [p for p in items if p.get("gdm_probability", 0) >= prob_min]
        if prob_max is not None:
            items = [p for p in items if p.get("gdm_probability", 0) <= prob_max]

        key_map = {
            "created_at_desc": ("created_at", True),
            "created_at_asc": ("created_at", False),
            "prob_desc": ("gdm_probability", True),
            "prob_asc": ("gdm_probability", False),
        }
        key, desc = key_map.get(sort, ("created_at", True))
        items.sort(key=lambda p: p.get(key) or "", reverse=desc)
        total = len(items)
        return {"items": items[offset:offset + limit], "total": total}

    def get_prediction(self, prediction_id):
        return self._predictions.get(prediction_id)


# ──────────────────────────────────────────────────────────────────────
# Supabase store
# ──────────────────────────────────────────────────────────────────────

class SupabaseStore(Store):
    def __init__(self, url: str, key: str):
        from supabase import create_client
        self.client = create_client(url, key)
        logger.info(f"SupabaseStore initialized → {url}")

    # Patients ---------------------------------------------------------
    def create_patient(self, full_name, code=None, date_of_birth=None, phone=None, note=None):
        payload = {
            "full_name": full_name,
            "code": code or None,
            "date_of_birth": date_of_birth or None,
            "phone": phone or None,
            "note": note or None,
        }
        r = self.client.table("patients").insert(payload).execute()
        if not r.data:
            raise RuntimeError(f"Insert patient failed: {r}")
        return r.data[0]

    def update_patient(self, patient_id, *, full_name=None, code=None, date_of_birth=None, phone=None, note=None):
        payload: dict[str, Any] = {}
        if full_name is not None: payload["full_name"] = full_name
        if code is not None: payload["code"] = code or None
        if date_of_birth is not None: payload["date_of_birth"] = date_of_birth or None
        if phone is not None: payload["phone"] = phone or None
        if note is not None: payload["note"] = note or None
        if not payload:
            return self.get_patient(patient_id)
        r = self.client.table("patients").update(payload).eq("id", patient_id).execute()
        return r.data[0] if r.data else None

    def delete_patient(self, patient_id):
        r = self.client.table("patients").delete().eq("id", patient_id).execute()
        return bool(r.data)

    def get_patient(self, patient_id):
        r = self.client.table("patients").select("*").eq("id", patient_id).limit(1).execute()
        if not r.data:
            return None
        rec = r.data[0]
        # đếm predictions
        cnt = self.client.table("predictions").select("id", count="exact").eq("patient_id", patient_id).execute()
        rec["prediction_count"] = cnt.count or 0
        return rec

    def list_patients(self, *, search=None, limit=50, offset=0):
        q = self.client.table("patients").select("*", count="exact")
        if search:
            s = search.replace("%", "").replace(",", "")
            # OR: full_name ILIKE | code ILIKE | phone ILIKE
            q = q.or_(f"full_name.ilike.%{s}%,code.ilike.%{s}%,phone.ilike.%{s}%")
        q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
        r = q.execute()
        items = r.data or []
        # Bulk count predictions per patient — đơn giản: gọi 1 query
        if items:
            ids = [p["id"] for p in items]
            # PostgREST không group-by trực tiếp; fallback gọi count theo từng patient.
            # Để tiết kiệm, ta chỉ count khi <=50 items.
            counts: dict[str, int] = {}
            for pid in ids:
                c = self.client.table("predictions").select("id", count="exact").eq("patient_id", pid).limit(1).execute()
                counts[pid] = c.count or 0
            for p in items:
                p["prediction_count"] = counts.get(p["id"], 0)
        return {"items": items, "total": r.count or 0}

    # Predictions ------------------------------------------------------
    def save_prediction(self, **kw) -> str:
        payload = {
            "patient_id": kw["patient_id"],
            "patient_code": kw["patient_code"],
            "patient_name": kw["patient_name"],
            "input_features": kw["input_features"],
            "gdm_probability": kw["gdm_probability"],
            "risk_level": kw["risk_level"],
            "threshold_used": kw["threshold_used"],
            "has_ogtt": kw["has_ogtt"],
            "shap_values": kw["shap_values"],
            "recommendation": kw["recommendation"],
        }
        r = self.client.table("predictions").insert(payload).execute()
        if not r.data:
            raise RuntimeError(f"Insert prediction failed: {r}")
        return r.data[0]["id"]

    def list_predictions(
        self, *, patient_id=None, search=None, risk_levels=None,
        has_ogtt=None, date_from=None, date_to=None,
        prob_min=None, prob_max=None,
        sort="created_at_desc", limit=50, offset=0,
    ):
        q = self.client.table("predictions").select("*", count="exact")
        if patient_id:
            q = q.eq("patient_id", patient_id)
        if search:
            s = search.replace("%", "").replace(",", "")
            q = q.or_(f"patient_name.ilike.%{s}%,patient_code.ilike.%{s}%")
        if risk_levels:
            q = q.in_("risk_level", risk_levels)
        if has_ogtt is not None:
            q = q.eq("has_ogtt", has_ogtt)
        if date_from:
            q = q.gte("created_at", date_from)
        if date_to:
            q = q.lte("created_at", date_to)
        if prob_min is not None:
            q = q.gte("gdm_probability", prob_min)
        if prob_max is not None:
            q = q.lte("gdm_probability", prob_max)

        sort_map = {
            "created_at_desc": ("created_at", True),
            "created_at_asc": ("created_at", False),
            "prob_desc": ("gdm_probability", True),
            "prob_asc": ("gdm_probability", False),
        }
        col, desc = sort_map.get(sort, ("created_at", True))
        q = q.order(col, desc=desc).range(offset, offset + limit - 1)
        r = q.execute()
        return {"items": r.data or [], "total": r.count or 0}

    def get_prediction(self, prediction_id):
        r = self.client.table("predictions").select("*").eq("id", prediction_id).limit(1).execute()
        return r.data[0] if r.data else None


# ──────────────────────────────────────────────────────────────────────
# Singleton
# ──────────────────────────────────────────────────────────────────────

_store: Optional[Store] = None


def get_store() -> Store:
    global _store
    if _store is None:
        if settings.supabase_enabled:
            _store = SupabaseStore(settings.supabase_url, settings.supabase_key)
        else:
            _store = MockStore()
    return _store
