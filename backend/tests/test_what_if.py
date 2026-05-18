"""Test /what-if endpoint — 4 KB main + edge cases."""


def test_whatif_kb1_high_decrease_ogtt(client, patient_high_with_ogtt_headroom):
    """KB1: HIGH risk control đường huyết — OGTT 220→110.

    Dùng fixture không saturate (xem conftest.patient_high_with_ogtt_headroom)
    để model còn nhạy với OGTT.
    """
    payload = {"original": patient_high_with_ogtt_headroom, "changes": {"OGTT": 110.0}}
    r = client.post("/what-if", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    # Giảm OGTT mạnh → prob giảm đáng kể HOẶC tier đổi từ Cao→Thấp
    assert data["delta"] < -0.1 or data["tier_changed"], (
        f"Expected significant change, got delta={data['delta']}, "
        f"tier {data['original_tier']}→{data['new_tier']}"
    )


def test_whatif_kb2_high_increase_ogtt(client, patient_low):
    """KB2: LOW risk OGTT mất kiểm soát — 120→220."""
    payload = {"original": patient_low, "changes": {"OGTT": 220.0}}
    r = client.post("/what-if", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["delta"] > 0.1


def test_whatif_kb3_medium_add_low_ogtt(client, patient_medium):
    """KB3: MEDIUM (OGTT None) → thêm OGTT=120 → tier change."""
    payload = {"original": patient_medium, "changes": {"OGTT": 120.0}}
    r = client.post("/what-if", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["original_tier"] == "Trung bình"
    assert data["new_tier"] in ("Thấp", "Cao")  # giờ có OGTT
    assert data["tier_changed"] is True


def test_whatif_kb4_medium_add_high_ogtt(client, patient_medium):
    """KB4: MEDIUM → thêm OGTT=220 → expect chuyển 'Cao'."""
    payload = {"original": patient_medium, "changes": {"OGTT": 220.0}}
    r = client.post("/what-if", json=payload)
    data = r.json()
    assert data["new_tier"] == "Cao"
    assert data["tier_changed"] is True


def test_whatif_recompute_engineered_when_bmi_changes(client, patient_high):
    """Nếu user thay BMI → backend phải re-compute BMI_category trong derived_changes."""
    payload = {"original": patient_high, "changes": {"BMI": 22.0}}
    r = client.post("/what-if", json=payload)
    data = r.json()
    assert "BMI_category" in data["derived_changes"]


def test_whatif_recompute_map_when_sysbp_changes(client, patient_high):
    """Nếu user thay Sys BP → backend phải re-compute MAP."""
    payload = {"original": patient_high, "changes": {"Sys BP": 120.0}}
    r = client.post("/what-if", json=payload)
    data = r.json()
    assert "MAP" in data["derived_changes"]


def test_whatif_no_changes_returns_zero_delta(client, patient_low):
    payload = {"original": patient_low, "changes": {}}
    r = client.post("/what-if", json=payload)
    data = r.json()
    assert abs(data["delta"]) < 1e-6
    assert data["tier_changed"] is False


def test_whatif_validation_invalid_input(client):
    payload = {"original": {"Age": 999}, "changes": {}}
    r = client.post("/what-if", json=payload)
    assert r.status_code == 422


def test_history_endpoint(client, patient_low):
    """Test /history sau khi đã /predict."""
    client.post("/predict", json=patient_low)
    r = client.get("/history")
    assert r.status_code == 200
    data = r.json()
    assert "store_type" in data
    assert "records" in data
    assert len(data["records"]) >= 1
