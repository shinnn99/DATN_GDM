import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/Home";
import { PredictPage } from "@/pages/Predict";
import { ShapPage } from "@/pages/Shap";
import { HistoryPage } from "@/pages/History";
import { PatientsPage } from "@/pages/Patients";
import { PatientDetailPage } from "@/pages/PatientDetail";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<PredictPage />} />
        <Route path="/shap" element={<ShapPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
