import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import UpdateProfile from './pages/UpdateProfile';
import PrivateRoute from './components/PrivateRoute';
import ProjectDetail from './pages/ProjectDetail';
import ScheduleOfValues from './pages/ScheduleOfValues';
import ProjectSchedule from './pages/ProjectSchedule';
import PaymentApplications from './pages/PaymentApplications';
import ChangeOrders from './pages/ChangeOrders';
import Expenses from './pages/Expenses';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Users from './pages/Users';
import BidTemplates from './pages/BidTemplates';
import Proposals from './pages/Proposals';
import EquipmentList from './pages/EquipmentList';
import MaintenanceLogs from './pages/MaintenanceLogs';
import Settings from './pages/Settings';
import ProjectBilling from './pages/ProjectBilling';
import Subcontractors from './pages/Subcontractors';
import Documents from './pages/Documents';
import CompanySettingsPage from './pages/CompanySettingsPage';
import Permits from '@/pages/Permits';

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
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-profile" element={
          <PrivateRoute>
            <UpdateProfile />
          </PrivateRoute>
        } />
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
        <Route path="/users" element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        } />
        <Route path="/bid-templates" element={
          <ProtectedRoute>
            <BidTemplates />
          </ProtectedRoute>
        } />
         <Route path="/proposals" element={
          <ProtectedRoute>
            <Proposals />
          </ProtectedRoute>
        } />
        <Route path="/equipment" element={
          <ProtectedRoute>
            <EquipmentList />
          </ProtectedRoute>
        } />
        <Route path="/maintenance-logs" element={
          <ProtectedRoute>
            <MaintenanceLogs />
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
        <Route path="/company-settings" element={
          <AdminRoute>
            <CompanySettingsPage />
          </AdminRoute>
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

export default App;
