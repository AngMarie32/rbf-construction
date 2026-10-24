
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

interface NavGroup {
  label: string;
  items: { name: string; href: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Quick Access',
    items: [
      { name: 'Document Sender', href: '/invoice-sender' },
      { name: 'E-Sign', href: '/esign' },
    ],
  },
  {
    label: 'Overview',
    items: [
      { name: 'Analytics', href: '/analytics' },
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Owner Cockpit', href: '/owner-money' },
      { name: 'Projects', href: '/projects' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { name: 'Cash Flow', href: '/cash-flow' },
      { name: 'Companies', href: '/companies' },
      { name: 'Operating Costs', href: '/operating-costs' },
      { name: 'Properties', href: '/properties' },
    ],
  },
  {
    label: 'Bidding',
    items: [
      { name: 'Bid Estimator', href: '/estimating' },
      { name: 'Bid Planner', href: '/bid-planner' },
      { name: 'Bid Templates', href: '/bid-templates' },
      { name: 'Proposals', href: '/proposals' },
    ],
  },
  {
    label: 'Project Management',
    items: [
      { name: 'Documents', href: '/documents' },
      { name: 'Payment Applications', href: '/payment-applications' },
      { name: 'Permits', href: '/permits' },
      { name: 'Project Schedule', href: '/project-schedule' },
      { name: 'Punch List', href: '/punch-list' },
      { name: 'Subcontractors', href: '/subcontractors' },
    ],
  },
  {
    label: 'Equipment',
    items: [
      { name: 'Equipment', href: '/equipment' },
      { name: 'Equipment Intelligence', href: '/equipment-insights' },
    ],
  },
  {
    label: 'Financial',
    items: [
      { name: 'Billing', href: '/billing' },
      { name: 'Burn Analysis', href: '/burn-rate-analysis' },
      { name: 'Change Orders', href: '/change-orders' },
      { name: 'Cost Import', href: '/cost-import' },
      { name: 'Expenses', href: '/expenses' },
      { name: 'Labor Costs', href: '/labor-costs' },
      { name: 'Loans', href: '/loans' },
      { name: 'QuickBooks Export', href: '/quickbooks-export' },
      { name: 'Report Import', href: '/report-import' },
    ],
  },
  {
    label: 'TraderTaxHQ',
    items: [
      { name: 'Tax Dashboard', href: '/tradertax' },
      { name: 'Leads', href: '/tradertax/leads' },
      { name: 'Tax Clients', href: '/tradertax/clients' },
      { name: 'Deadlines', href: '/tradertax/calendar' },
      { name: 'Practice Analytics', href: '/tradertax/analytics' },
      { name: 'Security Program', href: '/tradertax/security' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Settings', href: '/settings' },
      { name: 'Weekly Reports', href: '/weekly-reports' },
    ],
  },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      initial[g.label] = g.label === 'Quick Access';
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleItemClick = (href: string) => {
    navigate(href);
    onNavigate?.(href);
  };

  return (
    <div
      className={cn(
        'sticky top-0 h-screen flex flex-col overflow-y-auto transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-12' : 'min-w-[220px] w-[220px]'
      )}
      style={{ backgroundColor: 'hsl(222, 47%, 13%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        {!collapsed && (
          <span className="font-display font-bold text-sm text-white/90 tracking-wide uppercase">
            Navigation
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    openGroups[group.label] ? '' : '-rotate-90'
                  )}
                />
              </button>
            )}

            {!collapsed && openGroups[group.label] && (
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => handleItemClick(item.href)}
                        title={collapsed ? item.name : undefined}
                        className={cn(
                          'w-full flex items-center px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 text-left',
                          isActive
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-white/70 hover:bg-white/8 hover:text-white'
                        )}
                      >
                        {item.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
