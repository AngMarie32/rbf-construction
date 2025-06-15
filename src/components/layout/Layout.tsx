
import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageChatWidget } from '@/components/chat/PageChatWidget';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Don't show page chat widget on dedicated chat page
  const showPageChat = !location.pathname.startsWith('/chat');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={handleMenuClick} />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {children}
        </main>
      </div>
      
      {/* Page-specific Chat Widget */}
      {showPageChat && (
        <PageChatWidget
          pageName={title}
          contextType="page"
        />
      )}
    </div>
  );
}
