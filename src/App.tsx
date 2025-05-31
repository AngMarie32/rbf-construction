
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import BidPlanner from "./pages/BidPlanner";
import Equipment from "./pages/Equipment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/proposals" element={<div>Proposals Coming Soon</div>} />
          <Route path="/bid-planner" element={<BidPlanner />} />
          <Route path="/sov" element={<div>Schedule of Values Coming Soon</div>} />
          <Route path="/payment-apps" element={<div>Payment Applications Coming Soon</div>} />
          <Route path="/analytics" element={<div>Analytics Coming Soon</div>} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/subcontractors" element={<div>Subcontractors Coming Soon</div>} />
          <Route path="/documents" element={<div>Documents Coming Soon</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
