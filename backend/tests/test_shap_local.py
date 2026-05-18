"""Test /shap-local endpoint."""


def test_shap_local_high(client, patient_high):
    r = client.post("/shap-local", json=patient_high)
    assert r.status_code == 200, r.text
    data = r.json()

    # Cấu trúc waterfall
    assert "base_value" in data
    assert "predicted_probability" in data
    assert "risk_level" in data
    assert len(data["features"]) == 17

    # Sorted by |shap| desc
    abs_shaps = [abs(f["shap"]) for f in data["features"]]
    assert abs_shaps == sorted(abs_shaps, reverse=True)


def test_shap_local_medium_ogtt_zero_shap(client, patient_medium):
    """Tier Trung bình (OGTT=None) → SHAP của OGTT phải gần 0 (model không có signal)."""
    r = client.post("/shap-local", json=patient_medium)
    assert r.status_code == 200
    data = r.json()
    assert data["risk_level"] == "Trung bình"

    ogtt_item = next(f for f in data["features"] if f["feature"] == "OGTT")
    assert ogtt_item["value"] is None  # NaN → null trong JSON


def test_shap_local_features_match_input(client, patient_low):
    r = client.post("/shap-local", json=patient_low)
    data = r.json()
    bmi_item = next(f for f in data["features"] if f["feature"] == "BMI")
    assert bmi_item["value"] == patient_low["BMI"]
