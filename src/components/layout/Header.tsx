import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut, Settings, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyHeader } from './CompanyHeader';
import { supabase } from '@/integrations/supabase/client';
import { DMChatWidget } from '@/components/chat/DMChatWidget';

interface HeaderProps {
  onMenuClick: () => void;
}

interface CompanyInfo {
  company_name: string;
  logo_url: string;
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDMChat, setShowDMChat] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_name: 'BuildPro Construction',
    logo_url: ''
  });
  const [userProfile, setUserProfile] = useState<{ name?: string }>({});

  useEffect(() => {
    fetchCompanyInfo();
    fetchUserProfile();
  }, [user]);

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/projects':
        return 'Projects';
      case '/bid-planner':
        return 'Bid Planner';
      case '/payment-applications':
        return 'Payment Applications';
      case '/sov':
        return 'Schedule of Values';
      case '/schedule':
        return 'Project Schedule';
      case '/expenses':
        return 'Expenses';
      case '/equipment':
        return 'Equipment';
      case '/subcontractors':
        return 'Subcontractors';
      case '/documents':
        return 'Documents';
      case '/invoices':
        return 'Invoices';
      case '/proposals':
        return 'Proposals';
      case '/change-orders':
        return 'Change Orders';
      case '/billing':
      case '/project-billing':
        return 'Project Billing';
      case '/bid-packages':
        return 'Bid Packages';
      case '/analytics':
        return 'Analytics';
      case '/burn-rate':
      case '/burn-analysis':
        return 'Burn Rate Analysis';
      case '/settings':
        return 'Settings';
      case '/project-analyzer':
        return 'Project Analyzer';
      default:
        if (location.pathname.startsWith('/projects/')) {
          return 'Project Details';
        }
        return 'Construction Management';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const displayName = userProfile.name || user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              {companyInfo.logo_url && (
                <img 
                  src={companyInfo.logo_url} 
                  alt={`${companyInfo.company_name} logo`}
                  className="h-8 w-auto object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
                <p className="text-sm text-gray-600">{companyInfo.company_name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Chat Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDMChat(!showDMChat)}
              className="relative"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notifications.length}
                  </Badge>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No new notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {notification.timestamp}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-auto px-2 rounded-full">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block">{displayName}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* DM Chat Widget */}
      {showDMChat && (
        <DMChatWidget className="fixed bottom-4 right-4" />
      )}
    </>
  );
}
