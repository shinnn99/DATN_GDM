"""Test /predict endpoint."""


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_info(client):
    r = client.get("/info")
    assert r.status_code == 200
    data = r.json()
    assert data["n_features"] == 17
    assert "OGTT" in data["feature_names"]
    assert data["risk_tiers"]["method"] == "ogtt_availability_based"


def test_predict_low_risk(client, patient_low):
    r = client.post("/predict", json=patient_low)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 0.0 <= data["gdm_probability"] <= 1.0
    assert data["risk_level"] in ("Thấp", "Cao")  # tier "Trung bình" chỉ khi OGTT NaN
    assert data["has_ogtt"] is True
    assert len(data["top5_shap"]) == 5
    assert data["recommendation"] is None


def test_predict_high_risk(client, patient_high):
    r = client.post("/predict", json=patient_high)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["risk_level"] == "Cao"
    assert data["gdm_probability"] >= data["threshold_used"]


def test_predict_medium_no_ogtt(client, patient_medium):
    """Option D: OGTT missing → tier 'Trung bình' bất kể prob."""
    r = client.post("/predict", json=patient_medium)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["has_ogtt"] is False
    assert data["risk_level"] == "Trung bình"
    assert data["recommendation"] is not None
    assert "OGTT" in data["recommendation"]


def test_predict_validation_age_out_of_range(client, patient_low):
    payload = {**patient_low, "Age": 100}  # ngoài [15, 50]
    r = client.post("/predict", json=payload)
    assert r.status_code == 422


def test_predict_validation_missing_required(client, patient_low):
    payload = {**patient_low}
    del payload["Age"]
    r = client.post("/predict", json=payload)
    assert r.status_code == 422


def test_predict_top5_shap_has_ogtt_when_present(client, patient_high):
    r = client.post("/predict", json=patient_high)
    features_in_top5 = [item["feature"] for item in r.json()["top5_shap"]]
    # OGTT là feature dominant 61% → phải ở top 5
    assert "OGTT" in features_in_top5
