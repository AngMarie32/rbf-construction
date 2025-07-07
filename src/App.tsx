import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Bids from './pages/Bids';
import Tasks from './pages/Tasks';
import ProjectForm from './pages/ProjectForm';
import BidForm from './pages/BidForm';
import TaskForm from './pages/TaskForm';
import PaymentApplications from './pages/PaymentApplications';
import PaymentApplicationForm from './pages/PaymentApplicationForm';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/projects/:id" element={<ProjectForm />} />
            <Route path="/bids" element={<Bids />} />
            <Route path="/bids/new" element={<BidForm />} />
            <Route path="/bids/:id" element={<BidForm />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskForm />} />
            <Route path="/payment-apps" element={<PaymentApplications />} />
            <Route path="/payment-apps/:projectId/application/new" element={<PaymentApplicationForm />} />
            <Route path="/payment-apps/:projectId/application/:applicationId" element={<PaymentApplicationForm />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
