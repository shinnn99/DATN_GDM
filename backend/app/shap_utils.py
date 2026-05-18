"""XAI utilities — copy từ Phase 3 notebook, refactored cho backend reuse.

Functions:
- recompute_engineered: tự tính MAP và BMI_category từ raw features
- assign_risk_tier: Option D — tier theo OGTT availability
- get_top5_shap: format SHAP top-k cho frontend JSON
- compute_shap_local: tính SHAP cho 1 sample
- what_if: re-predict với changes
"""
from __future__ import annotations

from typing import Optional

import numpy as np

from .model import get_registry, predict_proba


def recompute_engineered(row: dict) -> dict:
    """Re-compute MAP và BMI_category từ raw features.

    Quan trọng cho What-If: user thay BMI=30 → BMI_category phải re-compute,
    không thì model nhận BMI_category cũ → predict sai.
    """
    out = dict(row)

    # MAP = (SysBP + 2*DiaBP) / 3, NaN propagate nếu thiếu Sys BP
    sys_bp = out.get("Sys BP")
    dia_bp = out.get("Dia BP")
    if sys_bp is None or (isinstance(sys_bp, float) and np.isnan(sys_bp)):
        out["MAP"] = np.nan
    elif dia_bp is None or (isinstance(dia_bp, float) and np.isnan(dia_bp)):
        out["MAP"] = np.nan
    else:
        out["MAP"] = (sys_bp + 2 * dia_bp) / 3

    # BMI_category theo WHO/Asian: <18.5, 18.5-22.9, 23-24.9, ≥25
    bmi = out.get("BMI")
    if bmi is None or (isinstance(bmi, float) and np.isnan(bmi)):
        out["BMI_category"] = np.nan
    elif bmi < 18.5:
        out["BMI_category"] = 0.0
    elif bmi < 23:
        out["BMI_category"] = 1.0
    elif bmi < 25:
        out["BMI_category"] = 2.0
    else:
        out["BMI_category"] = 3.0

    return out


def assign_risk_tier(prob: float, has_ogtt: bool, threshold: float) -> str:
    """Option D — tier theo OGTT availability (Phase 2 logic)."""
    if not has_ogtt:
        return "Trung bình"
    if prob < threshold:
        return "Thấp"
    return "Cao"


def row_dict_to_array(row: dict, feature_names: list[str]) -> np.ndarray:
    """Convert row dict → 2D numpy array theo đúng feature order.

    Missing keys (vd OGTT chưa đo) sẽ là np.nan để LightGBM tự xử lý.
    """
    values = []
    for name in feature_names:
        v = row.get(name)
        if v is None:
            values.append(np.nan)
        else:
            values.append(float(v))
    return np.array([values], dtype=float)


def get_top5_shap(
    shap_values_row: np.ndarray,
    feature_values_row: np.ndarray,
    feature_names: list[str],
    top_k: int = 5,
) -> list[dict]:
    """Format SHAP top-k cho frontend JSON.

    Returns:
        list of {feature, value, shap, direction}, sorted by |shap| desc.
    """
    abs_shap = np.abs(shap_values_row)
    top_idx = np.argsort(abs_shap)[::-1][:top_k]

    result = []
    for i in top_idx:
        val = feature_values_row[i]
        is_nan = isinstance(val, float) and np.isnan(val)
        result.append({
            "feature": feature_names[i],
            "value": None if is_nan else float(val),
            "shap": round(float(shap_values_row[i]), 4),
            "direction": "increase" if shap_values_row[i] > 0 else "decrease",
        })
    return result


def compute_shap_local(features_array: np.ndarray) -> tuple[np.ndarray, float]:
    """Compute SHAP values cho 1 sample.

    Args:
        features_array: shape (1, n_features) hoặc (n_features,)

    Returns:
        (shap_values_1d, base_value_scalar)
    """
    reg = get_registry()
    arr = np.atleast_2d(features_array)

    explanation = reg.explainer(arr)

    if hasattr(explanation, "values"):
        sv = explanation.values
        bv = explanation.base_values
    else:
        sv = explanation
        bv = reg.explainer.expected_value

    # Binary classifier: shape có thể là (n, n_features, 2) → lấy class 1
    if sv.ndim == 3:
        sv = sv[:, :, 1]
        if hasattr(bv, "__len__"):
            bv = bv[..., 1] if (hasattr(bv, "ndim") and bv.ndim > 1) else bv[1]

    sv_1d = sv[0]  # 1 sample only
    bv_scalar = float(np.atleast_1d(bv).flat[0])

    return sv_1d, bv_scalar


def predict_with_explanation(row: dict) -> dict:
    """Full predict pipeline: raw input → predict + tier + top5_shap.

    Args:
        row: dict {feature_name: value} — raw, KHÔNG cần engineered

    Returns:
        dict response cho /predict endpoint
    """
    reg = get_registry()

    # Re-compute engineered features
    enriched = recompute_engineered(row)

    # Convert → array
    arr = row_dict_to_array(enriched, reg.feature_names)

    # Predict
    prob = float(predict_proba(arr)[0])

    # Tier
    has_ogtt = enriched.get("OGTT") is not None and not (
        isinstance(enriched.get("OGTT"), float) and np.isnan(enriched["OGTT"])
    )
    tier = assign_risk_tier(prob, has_ogtt, reg.threshold)

    # SHAP top 5
    shap_values, _ = compute_shap_local(arr)
    top5 = get_top5_shap(shap_values, arr[0], reg.feature_names, top_k=5)

    return {
        "gdm_probability": prob,
        "risk_level": tier,
        "threshold_used": reg.threshold,
        "has_ogtt": has_ogtt,
        "top5_shap": top5,
        "recommendation": (
            "Khuyến nghị làm xét nghiệm OGTT để xác định chẩn đoán cuối cùng"
            if tier == "Trung bình"
            else None
        ),
    }


def compute_shap_waterfall(row: dict) -> dict:
    """Compute waterfall data cho frontend chart."""
    reg = get_registry()

    enriched = recompute_engineered(row)
    arr = row_dict_to_array(enriched, reg.feature_names)

    shap_values, base_value = compute_shap_local(arr)

    # Build response
    feature_data = []
    for i, name in enumerate(reg.feature_names):
        val = arr[0][i]
        is_nan = isinstance(val, float) and np.isnan(val)
        feature_data.append({
            "feature": name,
            "value": None if is_nan else float(val),
            "shap": round(float(shap_values[i]), 4),
        })

    # Sort theo |shap| desc cho frontend dễ render
    feature_data.sort(key=lambda x: abs(x["shap"]), reverse=True)

    prob = float(predict_proba(arr)[0])
    has_ogtt = enriched.get("OGTT") is not None and not (
        isinstance(enriched.get("OGTT"), float) and np.isnan(enriched["OGTT"])
    )

    return {
        "base_value": base_value,
        "predicted_probability": prob,
        "risk_level": assign_risk_tier(prob, has_ogtt, reg.threshold),
        "features": feature_data,
    }


def what_if(original_row: dict, changes: dict) -> dict:
    """Re-predict với changes apply lên original_row.

    Args:
        original_row: input gốc (raw features)
        changes: {feature: new_value} — chỉ feature thay đổi

    Returns:
        {original_prob, new_prob, delta, original_tier, new_tier, tier_changed,
         changes_applied, derived_changes}
    """
    reg = get_registry()

    # Original
    orig = recompute_engineered(original_row)
    orig_arr = row_dict_to_array(orig, reg.feature_names)
    orig_prob = float(predict_proba(orig_arr)[0])
    orig_has_ogtt = orig.get("OGTT") is not None and not (
        isinstance(orig.get("OGTT"), float) and np.isnan(orig["OGTT"])
    )
    orig_tier = assign_risk_tier(orig_prob, orig_has_ogtt, reg.threshold)

    # New
    new_row = {**orig, **changes}
    new = recompute_engineered(new_row)
    new_arr = row_dict_to_array(new, reg.feature_names)
    new_prob = float(predict_proba(new_arr)[0])
    new_has_ogtt = new.get("OGTT") is not None and not (
        isinstance(new.get("OGTT"), float) and np.isnan(new["OGTT"])
    )
    new_tier = assign_risk_tier(new_prob, new_has_ogtt, reg.threshold)

    # Track derived feature changes
    derived = {}
    for k in ["MAP", "BMI_category"]:
        orig_val = orig.get(k)
        new_val = new.get(k)
        orig_is_nan = isinstance(orig_val, float) and np.isnan(orig_val)
        new_is_nan = isinstance(new_val, float) and np.isnan(new_val)
        if orig_is_nan and new_is_nan:
            continue
        if orig_val != new_val:
            derived[k] = None if new_is_nan else float(new_val)

    return {
        "original_prob": orig_prob,
        "new_prob": new_prob,
        "delta": new_prob - orig_prob,
        "original_tier": orig_tier,
        "new_tier": new_tier,
        "tier_changed": orig_tier != new_tier,
        "changes_applied": changes,
        "derived_changes": derived,
    }
