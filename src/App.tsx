import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ScheduleOfValues from './pages/ScheduleOfValues';
import ProjectSchedule from './pages/ProjectSchedule';
import PaymentApplications from './pages/PaymentApplications';
import ChangeOrders from './pages/ChangeOrders';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import ProjectBilling from './pages/ProjectBilling';
import Subcontractors from './pages/Subcontractors';
import Documents from './pages/Documents';
import Permits from './pages/Permits';
import Equipment from './pages/Equipment';
import Auth from './pages/Auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          } />
          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          } />
          <Route path="/equipment" element={
            <ProtectedRoute>
              <Equipment />
            </ProtectedRoute>
          } />
          <Route path="/schedule-of-values" element={
            <ProtectedRoute>
              <ScheduleOfValues />
            </ProtectedRoute>
          } />
          <Route path="/project-schedule" element={
            <ProtectedRoute>
              <ProjectSchedule />
            </ProtectedRoute>
          } />
          <Route path="/payment-applications" element={
            <ProtectedRoute>
              <PaymentApplications />
            </ProtectedRoute>
          } />
          <Route path="/change-orders" element={
            <ProtectedRoute>
              <ChangeOrders />
            </ProtectedRoute>
          } />
          <Route path="/expenses" element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/project-billing" element={
            <ProtectedRoute>
              <ProjectBilling />
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <ProjectBilling />
            </ProtectedRoute>
          } />
          <Route path="/subcontractors" element={
            <ProtectedRoute>
              <Subcontractors />
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          } />
          <Route path="/permits" element={
            <ProtectedRoute>
              <Permits />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
