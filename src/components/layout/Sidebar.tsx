
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Projects', href: '/projects' },
    { name: 'Project Schedule', href: '/project-schedule' },
    { name: 'Equipment', href: '/equipment' },
    { name: 'Expenses', href: '/expenses' },
    { name: 'Subcontractors', href: '/subcontractors' },
    { name: 'Documents', href: '/documents' },
    { name: 'Bid Planner', href: '/bid-planner' },
    { name: 'Bid Packages', href: '/bid-packages' },
    { name: 'Proposals', href: '/proposals' },
    { name: 'Invoices', href: '/invoices' },
    { name: 'Payment Apps', href: '/payment-applications' },
    { name: 'Billing', href: '/billing' },
    { name: 'Change Orders', href: '/change-orders' },
    { name: 'Burn Analysis', href: '/burn-rate-analysis' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Permits', href: '/permits' },
    { name: 'Punch List', href: '/punch-list' },
    { name: 'Meetings', href: '/meetings' },
    { name: 'Chat', href: '/chat' },
    { name: 'Settings', href: '/settings' },
  ];

  const handleItemClick = (href: string) => {
    navigate(href);
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <div className="bg-[#1e3a5f] h-full min-w-[200px]">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white">Navigation</h2>
      </div>
      <nav className="mt-4">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleItemClick(item.href)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
