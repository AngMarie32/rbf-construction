
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

// Page imports
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import ProjectSchedule from '@/pages/ProjectSchedule';
import Equipment from '@/pages/Equipment';
import Expenses from '@/pages/Expenses';
import Subcontractors from '@/pages/Subcontractors';
import Documents from '@/pages/Documents';
import BidPlanner from '@/pages/BidPlanner';
import BidPackages from '@/pages/BidPackages';
import Proposals from '@/pages/Proposals';
import Invoices from '@/pages/Invoices';
import PaymentApplications from '@/pages/PaymentApplications';
import CreatePaymentApplication from '@/pages/CreatePaymentApplication';
import ScheduleOfValues from '@/pages/ScheduleOfValues';
import ProjectBilling from '@/pages/ProjectBilling';
import ChangeOrders from '@/pages/ChangeOrders';
import BurnRateAnalysis from '@/pages/BurnRateAnalysis';
import ProjectAnalyzer from '@/pages/ProjectAnalyzer';
import Analytics from '@/pages/Analytics';
import Permits from '@/pages/Permits';
import CompanyCalendar from '@/pages/CompanyCalendar';
import Settings from '@/pages/Settings';
import AdminUsers from '@/pages/AdminUsers';
import NotFound from '@/pages/NotFound';

// New feature pages
import PunchList from '@/pages/PunchList';
import Meetings from '@/pages/Meetings';

// E-Sign pages
import EsignDashboard from '@/pages/esign/EsignDashboard';
import EsignDocuments from '@/pages/esign/EsignDocuments';
import EsignTemplates from '@/pages/esign/EsignTemplates';
import EsignNew from '@/pages/esign/EsignNew';
import EsignDocumentDetail from '@/pages/esign/EsignDocumentDetail';
import PublicSign from '@/pages/esign/PublicSign';
import EsignRecipientGroups from '@/pages/esign/EsignRecipientGroups';
import EsignMySignature from '@/pages/esign/EsignMySignature';
import InvoiceSender from '@/pages/InvoiceSender';
import WeeklyReports from '@/pages/WeeklyReports';
import BlueprintAnalyzer from '@/pages/BlueprintAnalyzer';
import CompaniesPage from '@/pages/Companies';
import Properties from '@/pages/Properties';
import OwnerMoney from '@/pages/OwnerMoney';
import { CompanyProvider } from '@/contexts/CompanyContext';

const queryClient = new QueryClient();

function QueryClientProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProviderWrapper>
          <CompanyProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/properties"
              element={
                <ProtectedRoute>
                  <Properties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner-money"
              element={
                <ProtectedRoute>
                  <OwnerMoney />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-schedule"
              element={
                <ProtectedRoute>
                  <ProjectSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/punch-list"
              element={
                <ProtectedRoute>
                  <PunchList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute>
                  <Meetings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment"
              element={
                <ProtectedRoute>
                  <Equipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subcontractors"
              element={
                <ProtectedRoute>
                  <Subcontractors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bid-planner"
              element={
                <ProtectedRoute>
                  <BidPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bid-packages"
              element={
                <ProtectedRoute>
                  <BidPackages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals"
              element={
                <ProtectedRoute>
                  <Proposals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-applications"
              element={
                <ProtectedRoute>
                  <PaymentApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-applications/create/:projectId"
              element={
                <ProtectedRoute>
                  <CreatePaymentApplication />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-applications/edit/:projectId/:applicationId"
              element={
                <ProtectedRoute>
                  <CreatePaymentApplication />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule-of-values"
              element={
                <ProtectedRoute>
                  <ScheduleOfValues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <ProjectBilling />
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-orders"
              element={
                <ProtectedRoute>
                  <ChangeOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/burn-rate-analysis"
              element={
                <ProtectedRoute>
                  <BurnRateAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-analyzer"
              element={
                <ProtectedRoute>
                  <ProjectAnalyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/permits"
              element={
                <ProtectedRoute>
                  <Permits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-calendar"
              element={
                <ProtectedRoute>
                  <CompanyCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route path="/sign/:token" element={<PublicSign />} />
            <Route path="/esign" element={<ProtectedRoute><EsignDashboard /></ProtectedRoute>} />
            <Route path="/esign/documents" element={<ProtectedRoute><EsignDocuments /></ProtectedRoute>} />
            <Route path="/esign/templates" element={<ProtectedRoute><EsignTemplates /></ProtectedRoute>} />
            <Route path="/esign/new" element={<ProtectedRoute><EsignNew /></ProtectedRoute>} />
            <Route path="/esign/documents/:id" element={<ProtectedRoute><EsignDocumentDetail /></ProtectedRoute>} />
            <Route path="/esign/recipient-groups" element={<ProtectedRoute><EsignRecipientGroups /></ProtectedRoute>} />
            <Route path="/esign/my-signature" element={<ProtectedRoute><EsignMySignature /></ProtectedRoute>} />
            <Route path="/invoice-sender" element={<ProtectedRoute><InvoiceSender /></ProtectedRoute>} />
            <Route path="/weekly-reports" element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>} />
            <Route path="/blueprint-analyzer" element={<ProtectedRoute><BlueprintAnalyzer /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          </CompanyProvider>
        </QueryClientProviderWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;