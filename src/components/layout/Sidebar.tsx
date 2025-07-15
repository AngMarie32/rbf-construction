
import {
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  CreditCard,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LucideIcon,
  Settings,
  User2,
  FileCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  subItems?: { label: string; path: string }[];
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: FolderOpen,
      label: 'Projects',
      path: '/projects',
      subItems: [
        { label: 'All Projects', path: '/projects' },
        { label: 'Project Schedule', path: '/project-schedule' },
        { label: 'Schedule of Values', path: '/schedule-of-values' },
        { label: 'Payment Applications', path: '/payment-applications' },
        { label: 'Change Orders', path: '/change-orders' },
      ]
    },
    {
      icon: FileCheck,
      label: 'Permits',
      path: '/permits'
    },
    {
      icon: CreditCard,
      label: 'Billing',
      path: '/billing'
    },
    {
      icon: Building2,
      label: 'Subcontractors',
      path: '/subcontractors'
    },
    {
      icon: Gauge,
      label: 'Expenses',
      path: '/expenses'
    },
    {
      icon: FolderOpen,
      label: 'Documents',
      path: '/documents'
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/settings'
    }
  ];

  return (
    <div className={cn("flex flex-col w-64 border-r bg-secondary", className)}>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Construction App</h1>
      </div>
      <nav className="flex-1 px-2 py-4">
        {menuItems.map((item) => (
          <div key={item.label} className="space-y-1">
            <button
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center w-full p-2 text-sm font-medium rounded-md hover:bg-muted hover:text-foreground",
                location.pathname === item.path ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </button>
            {item.subItems && (
              <div className="pl-4 space-y-1">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.label}
                    onClick={() => navigate(subItem.path)}
                    className={cn(
                      "flex items-center w-full p-2 text-sm font-medium rounded-md hover:bg-muted hover:text-foreground",
                      location.pathname === subItem.path ? "bg-muted text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
