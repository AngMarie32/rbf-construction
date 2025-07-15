
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import Permits from '@/pages/Permits';
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
    <Router>
      <Routes>
        <Route path="/" element={
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
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
