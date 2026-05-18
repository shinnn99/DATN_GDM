from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    artifacts_dir: Path = Path("./artifacts")
    supabase_url: str = ""
    supabase_key: str = ""
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    @property
    def model_file(self) -> Path:
        return self.artifacts_dir / "gdm_model.txt"

    @property
    def config_file(self) -> Path:
        return self.artifacts_dir / "config.json"

    @property
    def calibrator_file(self) -> Path:
        return self.artifacts_dir / "calibrator.joblib"

    @property
    def explainer_file(self) -> Path:
        return self.artifacts_dir / "shap_explainer.joblib"


settings = Settings()
