
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Import pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import BidPlanner from '@/pages/BidPlanner';
import PaymentApplications from '@/pages/PaymentApplications';
import ScheduleOfValues from '@/pages/ScheduleOfValues';
import ProjectSchedule from '@/pages/ProjectSchedule';
import Expenses from '@/pages/Expenses';
import Equipment from '@/pages/Equipment';
import Subcontractors from '@/pages/Subcontractors';
import Documents from '@/pages/Documents';
import Invoices from '@/pages/Invoices';
import Proposals from '@/pages/Proposals';
import ChangeOrders from '@/pages/ChangeOrders';
import ProjectBilling from '@/pages/ProjectBilling';
import BidPackages from '@/pages/BidPackages';
import Analytics from '@/pages/Analytics';
import BurnRateAnalysis from '@/pages/BurnRateAnalysis';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import ProjectAnalyzer from '@/pages/ProjectAnalyzer';
import AdminUsers from '@/pages/AdminUsers';
import Chat from '@/pages/Chat';

import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/bid-planner" element={<ProtectedRoute><BidPlanner /></ProtectedRoute>} />
              <Route path="/payment-applications" element={<ProtectedRoute><PaymentApplications /></ProtectedRoute>} />
              {/* Redirect old payment-apps route to payment-applications */}
              <Route path="/payment-apps" element={<Navigate to="/payment-applications" replace />} />
              <Route path="/sov" element={<ProtectedRoute><ScheduleOfValues /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
              <Route path="/subcontractors" element={<ProtectedRoute><Subcontractors /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
              <Route path="/change-orders" element={<ProtectedRoute><ChangeOrders /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><ProjectBilling /></ProtectedRoute>} />
              <Route path="/project-billing" element={<ProtectedRoute><ProjectBilling /></ProtectedRoute>} />
              <Route path="/bid-packages" element={<ProtectedRoute><BidPackages /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/burn-rate" element={<ProtectedRoute><BurnRateAnalysis /></ProtectedRoute>} />
              <Route path="/burn-analysis" element={<ProtectedRoute><BurnRateAnalysis /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/project-analyzer" element={<ProtectedRoute><ProjectAnalyzer /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
