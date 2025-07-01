
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Calendar, FileText, Calculator, List, DollarSign, TrendingUp, Users, Wrench, FileCheck, ChevronLeft, ChevronRight, Clock, Edit, Receipt, Package, CreditCard, ChevronDown, ChevronUp, BarChart3, Shield, MessageCircle } from 'lucide-react';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const menuSections = [{
  title: 'Company Dashboards',
  items: [{
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  }, {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp
  }]
}, {
  title: 'Communication',
  items: [{
    name: 'Team Chat',
    href: '/chat',
    icon: MessageCircle
  }]
}, {
  title: 'Tools',
  items: [{
    name: 'Bid Planner',
    href: '/bid-planner',
    icon: Calculator
  }, {
    name: 'Burn Analysis',
    href: '/burn-analysis',
    icon: BarChart3
  }, {
    name: 'Equipment',
    href: '/equipment',
    icon: Wrench
  }, {
    name: 'Subcontractors',
    href: '/subcontractors',
    icon: Users
  }, {
    name: 'Documents',
    href: '/documents',
    icon: FileCheck
  }]
}, {
  title: 'Project Management',
  items: [{
    name: 'Projects',
    href: '/projects',
    icon: Calendar
  }, {
    name: 'Project Schedule',
    href: '/schedule',
    icon: Clock
  }, {
    name: 'Proposals',
    href: '/proposals',
    icon: FileText
  }, {
    name: 'Schedule of Values',
    href: '/sov',
    icon: List
  }, {
    name: 'Payment Apps',
    href: '/payment-apps',
    icon: DollarSign
  }, {
    name: 'Project Billing',
    href: '/project-billing',
    icon: CreditCard
  }, {
    name: 'Change Orders',
    href: '/change-orders',
    icon: Edit
  }, {
    name: 'Expenses',
    href: '/expenses',
    icon: Receipt
  }, {
    name: 'Bid Invitations',
    href: '/bid-packages',
    icon: Package
  }]
}];

const adminSection = {
  title: 'Administration',
  items: [{
    name: 'User Management',
    href: '/admin/users',
    icon: Shield
  }]
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Company Dashboards', 'Tools', 'Project Management', 'Administration']);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const { user } = useAuth();

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      }
    };

    checkUserRole();
  }, [user]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionTitle) 
        ? prev.filter(s => s !== sectionTitle) 
        : [...prev, sectionTitle]
    );
  };

  const sectionsToShow = userRole === 'Admin' ? [...menuSections, adminSection] : menuSections;

  return (
    <div className={cn(
      "enhanced-sidebar transition-all duration-300 flex flex-col shadow-xl",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
        {!collapsed && (
          <div className="flex items-center space-x-3 animate-fade-in-up">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-lg text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              RBF Construction
            </span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-2 h-9 w-9 hover:bg-gray-100/80 hover:shadow-sm transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {sectionsToShow.map((section, sectionIndex) => (
          <div key={section.title} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${sectionIndex * 0.1}s` }}>
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-all duration-200 hover:bg-gray-50/80 rounded-lg"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.title) ? 
                  <ChevronUp className="w-3 h-3 transition-transform duration-200" /> : 
                  <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                }
              </button>
            )}
            
            {(collapsed || expandedSections.includes(section.title)) && (
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden animate-slide-up",
                        isActive 
                          ? "bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg shadow-primary/20" 
                          : "text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-sm hover:-translate-y-0.5",
                        collapsed && "justify-center"
                      )}
                      style={{ animationDelay: `${(sectionIndex * 0.1) + (itemIndex * 0.05)}s` }}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        !collapsed && "mr-3",
                        isActive ? "text-white" : "text-gray-500 group-hover:text-primary"
                      )} />
                      {!collapsed && (
                        <span className="transition-all duration-200">{item.name}</span>
                      )}
                      {isActive && !collapsed && (
                        <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-bounce-gentle"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200/50 animate-fade-in-up">
          <div className="text-xs text-gray-400 text-center">
            © 2024 RBF Construction
          </div>
        </div>
      )}
    </div>
  );
}
