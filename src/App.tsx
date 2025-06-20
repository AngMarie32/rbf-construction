
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Expenses from '@/pages/Expenses';
import PaymentApplications from '@/pages/PaymentApplications';
import ScheduleOfValues from '@/pages/ScheduleOfValues';
import ProjectSchedule from '@/pages/ProjectSchedule';
import BidPlanner from '@/pages/BidPlanner';
import ProjectBilling from '@/pages/ProjectBilling';
import BurnRateAnalysis from '@/pages/BurnRateAnalysis';
import ProjectAnalyzer from '@/pages/ProjectAnalyzer';
import Equipment from '@/pages/Equipment';
import Subcontractors from '@/pages/Subcontractors';
import Proposals from '@/pages/Proposals';
import BidPackages from '@/pages/BidPackages';
import Invoices from '@/pages/Invoices';
import Documents from '@/pages/Documents';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import AdminUsers from '@/pages/AdminUsers';
import Chat from '@/pages/Chat';
import ChangeOrders from '@/pages/ChangeOrders';
import CompanyCalendar from '@/pages/CompanyCalendar';
import NotFound from '@/pages/NotFound';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="/expenses" element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            } />
            <Route path="/payment-apps" element={
              <ProtectedRoute>
                <PaymentApplications />
              </ProtectedRoute>
            } />
            <Route path="/sov" element={
              <ProtectedRoute>
                <ScheduleOfValues />
              </ProtectedRoute>
            } />
            <Route path="/schedule" element={
              <ProtectedRoute>
                <ProjectSchedule />
              </ProtectedRoute>
            } />
            <Route path="/bid-planner" element={
              <ProtectedRoute>
                <BidPlanner />
              </ProtectedRoute>
            } />
            <Route path="/project-billing" element={
              <ProtectedRoute>
                <ProjectBilling />
              </ProtectedRoute>
            } />
            <Route path="/burn-analysis" element={
              <ProtectedRoute>
                <BurnRateAnalysis />
              </ProtectedRoute>
            } />
            <Route path="/project-analyzer" element={
              <ProtectedRoute>
                <ProjectAnalyzer />
              </ProtectedRoute>
            } />
            <Route path="/equipment" element={
              <ProtectedRoute>
                <Equipment />
              </ProtectedRoute>
            } />
            <Route path="/subcontractors" element={
              <ProtectedRoute>
                <Subcontractors />
              </ProtectedRoute>
            } />
            <Route path="/proposals" element={
              <ProtectedRoute>
                <Proposals />
              </ProtectedRoute>
            } />
            <Route path="/bid-packages" element={
              <ProtectedRoute>
                <BidPackages />
              </ProtectedRoute>
            } />
            <Route path="/invoices" element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/change-orders" element={
              <ProtectedRoute>
                <ChangeOrders />
              </ProtectedRoute>
            } />
            <Route path="/company-calendar" element={
              <ProtectedRoute>
                <CompanyCalendar />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
