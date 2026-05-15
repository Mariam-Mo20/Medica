import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/Layout";
import { LoadingBar } from "@/components/LoadingBar";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PatientsPage } from "@/pages/PatientsPage";
import { PatientDetailPage } from "@/pages/PatientDetailPage";
import { PatientFormPage } from "@/pages/PatientFormPage";
import { AddVisitPage } from "@/pages/AddVisitPage";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { AppointmentFormPage } from "@/pages/AppointmentFormPage";
import { SignupPage } from "@/pages/SignupPage";
import { RolePage } from "@/pages/RolePage";
import { ClinicPage } from "@/pages/ClinicPage";
import { SignupCompletePage } from "@/pages/SignupCompletePage";
import { ConsultationPage } from "@/pages/ConsultationPage";
import { AdministrationPage } from "@/pages/AdministrationPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";

export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <>
      <LoadingBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/role" element={<RolePage />} />
        <Route path="/signup/clinic" element={<ClinicPage />} />
        <Route path="/signup/complete" element={<SignupCompletePage />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/new" element={<PatientFormPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/patients/:id/visits/new" element={<AddVisitPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/new" element={<AppointmentFormPage />} />
          <Route path="/consultation/:appointmentId" element={<ConsultationPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/administration" element={<AdministrationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
