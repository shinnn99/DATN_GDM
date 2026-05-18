# GDM Diagnosis Backend

FastAPI backend cho ĐATN — chẩn đoán Tiểu đường thai kỳ (GDM) với LightGBM + XAI.

## Stack

- **FastAPI** (Pydantic 2) — REST API
- **LightGBM 4.5+** — model gốc
- **SHAP 0.46** — XAI (Global + Local + What-If)
- **Supabase** (optional) — persistence
- **Docker** — deployment ready

## 3 endpoint chính

| Method | Path | Mô tả |
|---|---|---|
| POST | `/predict` | Predict probability + tier + top 5 SHAP |
| POST | `/shap-local` | Full SHAP waterfall data cho frontend chart |
| POST | `/what-if` | Re-predict với changes apply lên original input |

Plus: `GET /info` (model metadata), `GET /history` (recent predictions).

## Chạy local

### 1. Copy artifacts từ Phase 2/3 vào `artifacts/`

Cần 4 file (download từ `MyDrive/datn-gdm/artifacts/` của Hạnh):

```
artifacts/
├── gdm_model.txt          (~65 KB)
├── calibrator.joblib      (~1 KB, nếu use_calibration=True)
├── config.json            (~1 KB)
└── shap_explainer.joblib  (~5-15 MB)
```

### 2. Setup env

```bash
cp .env.example .env
# Chỉnh ARTIFACTS_DIR nếu artifacts ở chỗ khác
# SUPABASE_URL/KEY để trống = dùng MockStore (in-memory)
```

### 3. Install + run

```bash
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Mở docs: http://localhost:8000/docs

### 4. Test

```bash
pytest -v
```

## Test với Postman

Import `GDM_API.postman_collection.json` vào Postman. Có sẵn 8 request:
- Health check, Model info
- Predict cho 3 tier (LOW/HIGH/MEDIUM)
- SHAP Local
- What-If 2 kịch bản (KB1, KB3)
- History

## Docker deploy

```bash
docker compose up -d
```

API sẽ chạy ở `http://localhost:8000`.

## Supabase setup (optional)

Tạo bảng predictions trên Supabase:

```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT,
    input_features JSONB,
    gdm_probability FLOAT,
    risk_level TEXT,
    threshold_used FLOAT,
    shap_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_predictions_risk_level ON predictions(risk_level);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
```

Set vào `.env`:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
```

Restart server → backend tự switch từ MockStore sang SupabaseStore.

## Risk tier (Option D — Phase 2)

| Điều kiện | Tier | Action |
|---|---|---|
| Có OGTT + prob < threshold | **Thấp** | Theo dõi định kỳ |
| Có OGTT + prob ≥ threshold | **Cao** | Khám chuyên khoa |
| OGTT chưa đo | **Trung bình** | **Khuyến nghị làm OGTT** |

Threshold + risk_tiers config được load từ `artifacts/config.json` (sinh ra ở Phase 2).
