import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Import pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import ProjectSchedule from '@/pages/ProjectSchedule';
import ScheduleOfValues from '@/pages/ScheduleOfValues';
import BidPlanner from '@/pages/BidPlanner';
import Equipment from '@/pages/Equipment';
import Expenses from '@/pages/Expenses';
import Subcontractors from '@/pages/Subcontractors';
import Documents from '@/pages/Documents';
import BidPackages from '@/pages/BidPackages';
import ChangeOrders from '@/pages/ChangeOrders';
import Proposals from '@/pages/Proposals';
import ProjectBilling from '@/pages/ProjectBilling';
import Invoices from '@/pages/Invoices';
import PaymentApplications from '@/pages/PaymentApplications';
import CreatePaymentApplication from '@/pages/CreatePaymentApplication';
import Settings from '@/pages/Settings';
import AdminUsers from '@/pages/AdminUsers';
import Analytics from '@/pages/Analytics';
import BurnRateAnalysis from '@/pages/BurnRateAnalysis';
import ProjectAnalyzer from '@/pages/ProjectAnalyzer';
import Chat from '@/pages/Chat';
import CompanyCalendar from '@/pages/CompanyCalendar';
import NotFound from '@/pages/NotFound';

import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/projects/:id/schedule" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
              <Route path="/schedule-of-values" element={<ProtectedRoute><ScheduleOfValues /></ProtectedRoute>} />
              <Route path="/sov" element={<ProtectedRoute><ScheduleOfValues /></ProtectedRoute>} />
              <Route path="/bid-planner" element={<ProtectedRoute><BidPlanner /></ProtectedRoute>} />
              <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/subcontractors" element={<ProtectedRoute><Subcontractors /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/bid-packages" element={<ProtectedRoute><BidPackages /></ProtectedRoute>} />
              <Route path="/change-orders" element={<ProtectedRoute><ChangeOrders /></ProtectedRoute>} />
              <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><ProjectBilling /></ProtectedRoute>} />
              <Route path="/project-billing" element={<ProtectedRoute><ProjectBilling /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/payment-applications" element={<ProtectedRoute><PaymentApplications /></ProtectedRoute>} />
              <Route path="/payment-apps" element={<ProtectedRoute><PaymentApplications /></ProtectedRoute>} />
              <Route path="/payment-applications/create/:projectId" element={<ProtectedRoute><CreatePaymentApplication /></ProtectedRoute>} />
              <Route path="/payment-applications/edit/:projectId/:applicationId" element={<ProtectedRoute><CreatePaymentApplication /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/burn-rate-analysis" element={<ProtectedRoute><BurnRateAnalysis /></ProtectedRoute>} />
              <Route path="/burn-analysis" element={<ProtectedRoute><BurnRateAnalysis /></ProtectedRoute>} />
              <Route path="/project-analyzer" element={<ProtectedRoute><ProjectAnalyzer /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/company-calendar" element={<ProtectedRoute><CompanyCalendar /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
