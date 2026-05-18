"""Pytest fixtures — shared TestClient + sample patients."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """TestClient triggers lifespan → load_registry chạy 1 lần."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def patient_low():
    """Ca THẤP — có OGTT bình thường, ít risk factor."""
    return {
        "Age": 28,
        "No of Pregnancy": 1,
        "Gestation in previous Pregnancy": 0,
        "BMI": 23.5,
        "HDL": 55.0,
        "Family History": 0,
        "unexplained prenetal loss": 0,
        "Large Child or Birth Default": 0,
        "PCOS": 0,
        "Sys BP": 110.0,
        "Dia BP": 70,
        "OGTT": 120.0,
        "Hemoglobin": 12.5,
        "Sedentary Lifestyle": 0,
        "Prediabetes": 0,
    }


@pytest.fixture
def patient_high():
    """Ca CAO — OGTT cao + nhiều risk factor."""
    return {
        "Age": 38,
        "No of Pregnancy": 3,
        "Gestation in previous Pregnancy": 2,
        "BMI": 32.0,
        "HDL": 38.0,
        "Family History": 1,
        "unexplained prenetal loss": 1,
        "Large Child or Birth Default": 1,
        "PCOS": 1,
        "Sys BP": 145.0,
        "Dia BP": 95,
        "OGTT": 220.0,
        "Hemoglobin": 11.0,
        "Sedentary Lifestyle": 1,
        "Prediabetes": 1,
    }


@pytest.fixture
def patient_high_with_ogtt_headroom():
    """HIGH risk nhưng có 'không gian' cho OGTT thay đổi.

    Khác patient_high: bỏ Prediabetes/PCOS/Sedentary, giảm BMI/HDL/BP về moderate
    → model còn nhạy với OGTT, không saturate prob=1.0 ở mọi OGTT.
    Dùng cho test KB1 (what-if giảm OGTT → prob phải giảm).
    """
    return {
        "Age": 32,
        "No of Pregnancy": 2,
        "Gestation in previous Pregnancy": 1,
        "BMI": 28.0,
        "HDL": 50.0,
        "Family History": 1,
        "unexplained prenetal loss": 0,
        "Large Child or Birth Default": 0,
        "PCOS": 0,
        "Sys BP": 125.0,
        "Dia BP": 80,
        "OGTT": 220.0,
        "Hemoglobin": 12.5,
        "Sedentary Lifestyle": 0,
        "Prediabetes": 0,
    }


@pytest.fixture
def patient_medium():
    """Ca TRUNG BÌNH — OGTT chưa đo (None)."""
    return {
        "Age": 30,
        "No of Pregnancy": 2,
        "Gestation in previous Pregnancy": 1,
        "BMI": 27.0,
        "HDL": 45.0,
        "Family History": 0,
        "unexplained prenetal loss": 0,
        "Large Child or Birth Default": 0,
        "PCOS": 0,
        "Sys BP": 125.0,
        "Dia BP": 80,
        "OGTT": None,
        "Hemoglobin": 12.0,
        "Sedentary Lifestyle": 0,
        "Prediabetes": 0,
    }
