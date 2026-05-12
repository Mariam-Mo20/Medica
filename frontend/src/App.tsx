import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PatientsPage } from "@/pages/PatientsPage";
import { PatientDetailPage } from "@/pages/PatientDetailPage";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { AppointmentFormPage } from "@/pages/AppointmentFormPage";
import { SignupPage } from "@/pages/SignupPage";
import { RolePage } from "@/pages/RolePage";
import { ClinicPage } from "@/pages/ClinicPage";
import { ConsultationPage } from "@/pages/ConsultationPage";
import { AdministrationPage } from "@/pages/AdministrationPage";

export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/role" element={<RolePage />} />
      <Route path="/signup/clinic" element={<ClinicPage />} />
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/new" element={<AppointmentFormPage />} />
        <Route path="/consultation/:appointmentId" element={<ConsultationPage />} />
        <Route path="/administration" element={<AdministrationPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
