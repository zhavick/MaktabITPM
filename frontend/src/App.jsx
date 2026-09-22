import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import OnboardingWizardPage from './pages/OnboardingWizardPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import NotesPage from './pages/NotesPage';
import TimesheetsPage from './pages/TimesheetsPage';
import AttendancePage from './pages/AttendancePage';
import TicketsPage from './pages/TicketsPage';
import ReportsPage from './pages/ReportsPage';
import MembersManagementPage from './pages/MembersManagementPage';
import ProfilePage from './pages/ProfilePage';
import SystemConfigPage from './pages/SystemConfigPage';
import AuditTrailPage from './pages/AuditTrailPage';
import MasterDataPage from './pages/MasterDataPage';

// Protected Route Component
function ProtectedLayout({ children, requireManager = false, requireAdmin = false }) {
  const { user, isAuthenticated, loading, isManager, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Memuat sistem...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to Onboarding if not completed and not already on /onboarding
  if (!user?.onboardingCompleted && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  // If on onboarding screen, show without sidebar layout for clean focus
  if (window.location.pathname === '/onboarding') {
    return children;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

            {/* Protected Routes */}
            <Route
              path="/onboarding"
              element={
                <ProtectedLayout>
                  <OnboardingWizardPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedLayout>
                  <ProfilePage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedLayout>
                  <TasksPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedLayout>
                  <NotesPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/timesheets"
              element={
                <ProtectedLayout>
                  <TimesheetsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedLayout>
                  <AttendancePage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedLayout>
                  <TicketsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedLayout>
                  <ReportsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedLayout requireManager={true}>
                  <MembersManagementPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/master-data"
              element={
                <ProtectedLayout requireManager={true}>
                  <MasterDataPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/audit-trail"
              element={
                <ProtectedLayout requireManager={true}>
                  <AuditTrailPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedLayout requireAdmin={true}>
                  <SystemConfigPage />
                </ProtectedLayout>
              }
            />

            {/* Default fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
}
