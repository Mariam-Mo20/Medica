import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/Layout";
import { LoadingBar } from "@/components/LoadingBar";

const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const PatientsPage = lazy(() => import("@/pages/PatientsPage").then((m) => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import("@/pages/PatientDetailPage").then((m) => ({ default: m.PatientDetailPage })));
const PatientFormPage = lazy(() => import("@/pages/PatientFormPage").then((m) => ({ default: m.PatientFormPage })));
const AddVisitPage = lazy(() => import("@/pages/AddVisitPage").then((m) => ({ default: m.AddVisitPage })));
const AppointmentsPage = lazy(() => import("@/pages/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })));
const AppointmentFormPage = lazy(() => import("@/pages/AppointmentFormPage").then((m) => ({ default: m.AppointmentFormPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const RolePage = lazy(() => import("@/pages/RolePage").then((m) => ({ default: m.RolePage })));
const ClinicPage = lazy(() => import("@/pages/ClinicPage").then((m) => ({ default: m.ClinicPage })));
const SignupCompletePage = lazy(() => import("@/pages/SignupCompletePage").then((m) => ({ default: m.SignupCompletePage })));
const ConsultationPage = lazy(() => import("@/pages/ConsultationPage").then((m) => ({ default: m.ConsultationPage })));
const AdministrationPage = lazy(() => import("@/pages/AdministrationPage").then((m) => ({ default: m.AdministrationPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));

export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <>
      <LoadingBar />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
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
      </Suspense>
    </>
  );
}
