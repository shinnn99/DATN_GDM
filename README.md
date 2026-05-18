# DATN — Chẩn đoán Tiểu đường Thai kỳ (GDM) với LightGBM + XAI

Đồ án tốt nghiệp: hệ thống dự đoán nguy cơ GDM dùng LightGBM, giải thích bằng SHAP.

- **Backend**: FastAPI + LightGBM + SHAP — xem [backend/README.md](backend/README.md)
- **Frontend**: React + TypeScript + Vite — xem [frontend/README.md](frontend/README.md)

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Mở docs: http://localhost:8000/docs

Artifacts model (`gdm_model.txt`, `calibrator.joblib`, `config.json`, `shap_explainer.joblib`) đã được commit sẵn trong `backend/artifacts/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở: http://localhost:5173

Frontend gọi `/api/*` và Vite proxy sang backend ở `http://localhost:8000`.

## Test

```bash
cd backend
pytest -v
```
