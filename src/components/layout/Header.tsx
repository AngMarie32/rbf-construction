import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Settings, User, LogOut, UserCircle, HelpCircle, X, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Notification {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'error';
  time: string;
  read: boolean;
}

interface NotificationSettings {
  projectUpdates: boolean;
  equipmentMaintenance: boolean;
  invoicePayments: boolean;
  taskDeadlines: boolean;
}

export function Header() {
  const { user, signOut } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    projectUpdates: true,
    equipmentMaintenance: true,
    invoicePayments: true,
    taskDeadlines: true,
  });

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Administrator'
  });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleNotificationClick = () => {
    setNotificationsOpen(true);
    // Mark all notifications as read when opened
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    toast.success('Notification deleted');
  };

  const handleProfileClick = () => {
    setProfileOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSaveProfile = () => {
    // TODO: Implement profile update with Supabase
    toast.success('Profile updated successfully');
    setProfileOpen(false);
  };

  const handleSaveSettings = () => {
    // TODO: Save notification settings to local storage or database
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    toast.success('Settings saved successfully');
    setSettingsOpen(false);
  };

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.name) return capitalizeWords(user.user_metadata.name);
    if (user?.email) return capitalizeWords(user.email.split('@')[0]);
    return 'User';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-end">
          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={handleNotificationClick}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">{getDisplayName()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Help documentation coming soon!')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Support</span>
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

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-3 border rounded-lg group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        notification.type === 'warning' ? 'destructive' :
                        notification.type === 'success' ? 'default' : 'secondary'
                      }
                      className="ml-2"
                    >
                      {notification.type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-center text-gray-500 py-8">No notifications</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{getDisplayName()}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div>
                <Label>Role</Label>
                <p className="text-sm text-gray-600 mt-1">{profileData.role}</p>
              </div>
              
              <div>
                <Label>Member Since</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveProfile} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setProfileOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="project-updates">Project Updates</Label>
                  <p className="text-sm text-gray-500">Get notified about project status changes</p>
                </div>
                <Switch
                  id="project-updates"
                  checked={notificationSettings.projectUpdates}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, projectUpdates: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="equipment-maintenance">Equipment Maintenance</Label>
                  <p className="text-sm text-gray-500">Alerts for equipment maintenance due dates</p>
                </div>
                <Switch
                  id="equipment-maintenance"
                  checked={notificationSettings.equipmentMaintenance}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, equipmentMaintenance: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="invoice-payments">Invoice Payments</Label>
                  <p className="text-sm text-gray-500">Notifications for invoice payments received</p>
                </div>
                <Switch
                  id="invoice-payments"
                  checked={notificationSettings.invoicePayments}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, invoicePayments: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="task-deadlines">Task Deadlines</Label>
                  <p className="text-sm text-gray-500">Reminders for upcoming task deadlines</p>
                </div>
                <Switch
                  id="task-deadlines"
                  checked={notificationSettings.taskDeadlines}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, taskDeadlines: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveSettings} className="flex-1">
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setSettingsOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
