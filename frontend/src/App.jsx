import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { Doctors } from "./pages/Doctors";
import { Appointments } from "./pages/Appointments";
import { Consultation } from "./pages/Consultation";
import { WardMap } from "./pages/WardMap";
import { Billing } from "./pages/Billing";
import { LabPortal } from "./pages/LabPortal";
import { HRPayroll } from "./pages/HRPayroll";
import { Pharmacy } from "./pages/Pharmacy";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OfflineSync } from "./pages/OfflineSync";
import { PatientPortal } from "./pages/PatientPortal";
import { OTScheduler } from "./pages/OTScheduler";
import { LobbyKiosk } from "./pages/LobbyKiosk";
import { Telemedicine } from "./pages/Telemedicine";
import { BranchManagement } from "./pages/BranchManagement";
import { ReportsAnalytics } from "./pages/ReportsAnalytics";
import { StaffManagement } from "./pages/StaffManagement";
import { SystemSettings } from "./pages/SystemSettings";

// Protected Layout wrapper
const Layout = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f9] flex items-center justify-center font-semibold text-slate-500">
        Authenticating system...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "PATIENT") {
    return <Navigate to="/patient-portal" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main View Shell */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f0f4f9]">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Anonymous route guard
const AnonymousRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    if (user.role === "PATIENT") {
      return <Navigate to="/patient-portal" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// Standalone route guard for full-screen protected views
const StandaloneRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-bold text-slate-500">
        Connecting to session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Analytics />
        <Routes>
          {/* Public Login Route */}
          <Route
            path="/login"
            element={
              <AnonymousRoute>
                <Login />
              </AnonymousRoute>
            }
          />

          {/* Secure Layout Portal */}
          <Route
            path="/"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "DOCTOR", "RECEPTIONIST", "PHARMACIST", "LAB_TECH"]}>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/patients"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "RECEPTIONIST", "DOCTOR"]}>
                <Patients />
              </Layout>
            }
          />
          <Route
            path="/appointments"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "RECEPTIONIST"]}>
                <Appointments />
              </Layout>
            }
          />
          <Route
            path="/consultation"
            element={
              <Layout allowedRoles={["ADMIN", "DOCTOR"]}>
                <Consultation />
              </Layout>
            }
          />
          <Route
            path="/ward-map"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "RECEPTIONIST", "DOCTOR"]}>
                <WardMap />
              </Layout>
            }
          />
          <Route
            path="/doctors"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN"]}>
                <Doctors />
              </Layout>
            }
          />
          <Route
            path="/billing"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "RECEPTIONIST"]}>
                <Billing />
              </Layout>
            }
          />
          <Route
            path="/lab-portal"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "LAB_TECH"]}>
                <LabPortal />
              </Layout>
            }
          />
          <Route
            path="/hr-payroll"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN"]}>
                <HRPayroll />
              </Layout>
            }
          />
          <Route
            path="/staff-management"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN"]}>
                <StaffManagement />
              </Layout>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "PHARMACIST"]}>
                <Pharmacy />
              </Layout>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <Layout allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </Layout>
            }
          />
          <Route
            path="/reports"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN"]}>
                <ReportsAnalytics />
              </Layout>
            }
          />
          <Route
            path="/offline-sync"
            element={
              <Layout allowedRoles={["ADMIN", "RECEPTIONIST"]}>
                <OfflineSync />
              </Layout>
            }
          />
          <Route
            path="/branch-management"
            element={
              <Layout allowedRoles={["ADMIN"]}>
                <BranchManagement />
              </Layout>
            }
          />
          <Route
            path="/system-settings"
            element={
              <Layout allowedRoles={["ADMIN"]}>
                <SystemSettings />
              </Layout>
            }
          />
          <Route
            path="/patient-portal"
            element={<PatientPortal />}
          />
          <Route
            path="/ot-scheduler"
            element={
              <Layout allowedRoles={["ADMIN", "SUB_ADMIN", "DOCTOR", "RECEPTIONIST"]}>
                <OTScheduler />
              </Layout>
            }
          />
          <Route
            path="/lobby-kiosk"
            element={<LobbyKiosk />}
          />
          <Route
            path="/telemedicine"
            element={
              <StandaloneRoute>
                <Telemedicine />
              </StandaloneRoute>
            }
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
