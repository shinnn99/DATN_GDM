"""Pydantic schemas cho 3 endpoint chính.

Frontend gửi RAW features (không bao gồm MAP, BMI_category — backend tự compute).
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


# ──────────────────────────────────────────────────────────────────────
# Input schema — raw features
# ──────────────────────────────────────────────────────────────────────

class PatientInput(BaseModel):
    """Raw clinical features. None/missing OK cho OGTT, Sys BP, BMI, HDL.

    Engineered features (MAP, BMI_category) KHÔNG nhận từ client — backend
    tự compute từ Sys BP/Dia BP/BMI để tránh inconsistent input.
    """
    model_config = ConfigDict(extra="ignore")

    # Demographics
    Age: float = Field(..., ge=15, le=50, description="Tuổi (15-50)")

    # Pregnancy history
    No_of_Pregnancy: int = Field(..., ge=0, le=20, alias="No of Pregnancy")
    Gestation_in_previous_Pregnancy: int = Field(
        ..., ge=0, le=20, alias="Gestation in previous Pregnancy",
    )

    # Anthropometric
    BMI: Optional[float] = Field(None, ge=15, le=50)
    HDL: Optional[float] = Field(None, ge=20, le=100)

    # Risk factors (binary 0/1)
    Family_History: Literal[0, 1] = Field(..., alias="Family History")
    unexplained_prenetal_loss: Literal[0, 1] = Field(..., alias="unexplained prenetal loss")
    Large_Child_or_Birth_Default: Literal[0, 1] = Field(..., alias="Large Child or Birth Default")
    PCOS: Literal[0, 1]

    # Vitals
    Sys_BP: Optional[float] = Field(None, ge=70, le=200, alias="Sys BP")
    Dia_BP: float = Field(..., ge=40, le=130, alias="Dia BP")

    # Lab tests
    OGTT: Optional[float] = Field(None, ge=75, le=300, description="OGTT 2h, mg/dL. None nếu chưa đo")
    Hemoglobin: float = Field(..., ge=7, le=18)

    # Lifestyle / status
    Sedentary_Lifestyle: Literal[0, 1] = Field(..., alias="Sedentary Lifestyle")
    Prediabetes: Literal[0, 1]

    def to_feature_dict(self) -> dict:
        """Convert sang dict với key đúng theo feature_names trong model."""
        return {
            "Age": self.Age,
            "No of Pregnancy": self.No_of_Pregnancy,
            "Gestation in previous Pregnancy": self.Gestation_in_previous_Pregnancy,
            "BMI": self.BMI,
            "HDL": self.HDL,
            "Family History": self.Family_History,
            "unexplained prenetal loss": self.unexplained_prenetal_loss,
            "Large Child or Birth Default": self.Large_Child_or_Birth_Default,
            "PCOS": self.PCOS,
            "Sys BP": self.Sys_BP,
            "Dia BP": self.Dia_BP,
            "OGTT": self.OGTT,
            "Hemoglobin": self.Hemoglobin,
            "Sedentary Lifestyle": self.Sedentary_Lifestyle,
            "Prediabetes": self.Prediabetes,
        }


# ──────────────────────────────────────────────────────────────────────
# /predict response
# ──────────────────────────────────────────────────────────────────────

class ShapItem(BaseModel):
    feature: str
    value: Optional[float]
    shap: float
    direction: Literal["increase", "decrease"]


class PredictResponse(BaseModel):
    gdm_probability: float
    risk_level: Literal["Thấp", "Trung bình", "Cao"]
    threshold_used: float
    has_ogtt: bool
    top5_shap: list[ShapItem]
    recommendation: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────
# /shap-local response
# ──────────────────────────────────────────────────────────────────────

class ShapWaterfallItem(BaseModel):
    feature: str
    value: Optional[float]
    shap: float


class ShapLocalResponse(BaseModel):
    base_value: float
    predicted_probability: float
    risk_level: Literal["Thấp", "Trung bình", "Cao"]
    features: list[ShapWaterfallItem]
