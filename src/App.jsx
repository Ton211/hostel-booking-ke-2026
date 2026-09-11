import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Student pages
import HomePage from './pages/student/HomePage';
import BookingPage from './pages/student/BookingPage';
import BookingLookupPage from './pages/student/BookingLookupPage';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import RoomsPage from './pages/admin/RoomsPage';
import BedsPage from './pages/admin/BedsPage';
import StudentsPage from './pages/admin/StudentsPage';
import BookingsPage from './pages/admin/BookingsPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import SemestersPage from './pages/admin/SemestersPage';
import AccommodationTypesPage from './pages/admin/AccommodationTypesPage';
import AdminsPage from './pages/admin/AdminsPage';
import SettingsPage from './pages/admin/SettingsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import ReportsPage from './pages/admin/ReportsPage';

// Auth page
import LoginPage from './pages/admin/LoginPage';

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
    </ErrorBoundary>
  );
}

export default App;
