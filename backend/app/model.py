"""Model registry — load LightGBM booster + calibrator + SHAP explainer 1 lần ở startup.

⚠️ Plan task 4.2: KHÔNG load trong mỗi request — TreeExplainer khởi tạo ~2-3s.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Optional

import joblib
import lightgbm as lgb
import numpy as np

from .config import settings

logger = logging.getLogger(__name__)


@dataclass
class ModelRegistry:
    """Singleton chứa model + calibrator + explainer + config.

    Initialized 1 lần ở FastAPI lifespan startup, dùng chung cho mọi request.
    """

    booster: lgb.Booster
    explainer: object  # shap.TreeExplainer
    config: dict
    feature_names: list[str]
    threshold: float
    use_calibration: bool
    risk_tiers: dict
    calibrator: Optional[object] = None  # IsotonicRegression hoặc None


_registry: Optional[ModelRegistry] = None


def load_registry() -> ModelRegistry:
    """Load tất cả artifacts và init registry. Gọi 1 lần ở startup."""
    global _registry

    cfg_path = settings.config_file
    model_path = settings.model_file
    explainer_path = settings.explainer_file

    if not cfg_path.exists():
        raise FileNotFoundError(
            f"❌ Không tìm thấy {cfg_path}. "
            f"Download artifacts từ Phase 2/3 vào {settings.artifacts_dir}/"
        )
    if not model_path.exists():
        raise FileNotFoundError(f"❌ Không tìm thấy {model_path}")
    if not explainer_path.exists():
        raise FileNotFoundError(f"❌ Không tìm thấy {explainer_path}")

    logger.info(f"Loading config from {cfg_path}")
    with open(cfg_path, encoding="utf-8") as f:
        config = json.load(f)

    logger.info(f"Loading LightGBM booster from {model_path}")
    booster = lgb.Booster(model_file=str(model_path))

    calibrator = None
    if config.get("use_calibration"):
        cal_path = settings.calibrator_file
        if not cal_path.exists():
            raise FileNotFoundError(
                f"❌ Config nói use_calibration=True nhưng không tìm thấy {cal_path}"
            )
        logger.info(f"Loading calibrator from {cal_path}")
        calibrator = joblib.load(cal_path)

    logger.info(f"Loading SHAP explainer from {explainer_path}")
    explainer = joblib.load(explainer_path)

    _registry = ModelRegistry(
        booster=booster,
        calibrator=calibrator,
        explainer=explainer,
        config=config,
        feature_names=list(config["feature_names"]),
        threshold=float(config["optimal_threshold"]),
        use_calibration=bool(config.get("use_calibration", False)),
        risk_tiers=dict(config["risk_tiers"]),
    )

    logger.info(
        f"✅ Registry ready: {booster.num_trees()} trees, "
        f"{len(_registry.feature_names)} features, "
        f"threshold={_registry.threshold:.4f}, "
        f"use_calibration={_registry.use_calibration}, "
        f"tier_method={_registry.risk_tiers.get('method')}"
    )

    return _registry


def get_registry() -> ModelRegistry:
    """Trả về registry đã load. Raise nếu chưa init."""
    if _registry is None:
        raise RuntimeError(
            "ModelRegistry chưa init. load_registry() phải được gọi ở startup."
        )
    return _registry


def predict_proba(features_array: np.ndarray) -> np.ndarray:
    """Predict probability với calibration nếu có.

    Args:
        features_array: shape (n_samples, n_features), order theo feature_names

    Returns:
        probability array shape (n_samples,)
    """
    reg = get_registry()
    raw = reg.booster.predict(features_array)
    if reg.calibrator is not None:
        return reg.calibrator.predict(raw)
    return raw
