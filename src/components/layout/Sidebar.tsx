
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FolderOpen, 
  CalendarDays, 
  Truck, 
  Receipt, 
  Users, 
  FileText, 
  Calculator, 
  Package, 
  FileCheck, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  ClipboardList, 
  MessageSquare, 
  Settings,
  Pencil,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Project Schedule', href: '/project-schedule', icon: CalendarDays },
    
    // Quality & Collaboration
    { name: 'Drawing Markup', href: '/drawing-markup', icon: Pencil },
    { name: 'Punch List', href: '/punch-list', icon: CheckCircle },
    { name: 'Meetings', href: '/meetings', icon: Calendar },
    
    { name: 'Equipment', href: '/equipment', icon: Truck },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Subcontractors', href: '/subcontractors', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Bid Planner', href: '/bid-planner', icon: Calculator },
    { name: 'Bid Packages', href: '/bid-packages', icon: Package },
    { name: 'Proposals', href: '/proposals', icon: FileCheck },
    { name: 'Invoices', href: '/invoices', icon: CreditCard },
    { name: 'Payment Apps', href: '/payment-applications', icon: DollarSign },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Change Orders', href: '/change-orders', icon: FileText },
    { name: 'Burn Analysis', href: '/burn-rate-analysis', icon: TrendingUp },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Permits', href: '/permits', icon: ClipboardList },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleItemClick = (href: string) => {
    navigate(href);
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <div className="bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
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
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
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
