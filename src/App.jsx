import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Student pages
const HomePage = lazy(() => import('./pages/student/HomePage'));
const BookingPage = lazy(() => import('./pages/student/BookingPage'));
const BookingLookupPage = lazy(() => import('./pages/student/BookingLookupPage'));

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const RoomsPage = lazy(() => import('./pages/admin/RoomsPage'));
const BedsPage = lazy(() => import('./pages/admin/BedsPage'));
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage'));
const BookingsPage = lazy(() => import('./pages/admin/BookingsPage'));
const PaymentsPage = lazy(() => import('./pages/admin/PaymentsPage'));
const SemestersPage = lazy(() => import('./pages/admin/SemestersPage'));
const AccommodationTypesPage = lazy(() => import('./pages/admin/AccommodationTypesPage'));
const AdminsPage = lazy(() => import('./pages/admin/AdminsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));

// Auth page
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage message="Loading..." />;
  if (!currentUser) return <Navigate to="/admin/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage message="Loading..." />;
  if (!currentUser) return <Navigate to="/admin/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingSpinner fullPage message="Loading..." />
        }
      >
        <Routes>
          {/* Public Student Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/check-booking" element={<BookingLookupPage />} />

          {/* Admin Login */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="beds" element={<BedsPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="semesters" element={<SemestersPage />} />
            <Route path="accommodation-types" element={<AccommodationTypesPage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;