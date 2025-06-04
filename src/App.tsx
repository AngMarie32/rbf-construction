
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Proposals from "./pages/Proposals";
import BidPlanner from "./pages/BidPlanner";
import ScheduleOfValues from "./pages/ScheduleOfValues";
import PaymentApplications from "./pages/PaymentApplications";
import Analytics from "./pages/Analytics";
import Equipment from "./pages/Equipment";
import ProjectSchedule from "./pages/ProjectSchedule";
import ChangeOrders from "./pages/ChangeOrders";
import Expenses from "./pages/Expenses";
import BidPackages from "./pages/BidPackages";
import Subcontractors from "./pages/Subcontractors";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";
import ProjectBilling from "./pages/ProjectBilling";
import BurnRateAnalysis from "./pages/BurnRateAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
              path="/proposals"
              element={
                <ProtectedRoute>
                  <Proposals />
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
              path="/burn-analysis"
              element={
                <ProtectedRoute>
                  <BurnRateAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sov"
              element={
                <ProtectedRoute>
                  <ScheduleOfValues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-apps"
              element={
                <ProtectedRoute>
                  <PaymentApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-billing"
              element={
                <ProtectedRoute>
                  <ProjectBilling />
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
              path="/equipment"
              element={
                <ProtectedRoute>
                  <Equipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <ProjectSchedule />
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
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
