
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Projects from './pages/Projects';
import PaymentApplications from './pages/PaymentApplications';
import PaymentApplicationForm from './pages/PaymentApplicationForm';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 p-4">
            <Routes>
              <Route path="/" element={<Projects />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/payment-apps" element={<PaymentApplications />} />
              <Route path="/payment-apps/:projectId/application/new" element={<PaymentApplicationForm />} />
              <Route path="/payment-apps/:projectId/application/:applicationId" element={<PaymentApplicationForm />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
