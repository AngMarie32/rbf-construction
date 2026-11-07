
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Menu, Settings, Moon, Sun, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTheme } from 'next-themes';
import { CompanySwitcher } from '@/components/layout/CompanySwitcher';
import { RemindersMenu } from '@/components/layout/RemindersMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const { notifications, markAsRead, deleteNotification, getUnreadCount, clearAll } = useNotificationStore();
  const unreadCount = getUnreadCount();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/70 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <span className="lg:hidden font-display font-extrabold tracking-tight text-foreground truncate">RBF Construction</span>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            className="hidden md:flex w-full max-w-md items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 h-10 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search projects, pages, actions…</span>
            <kbd className="pointer-events-none rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          >
            <Search className="h-5 w-5" />
          </Button>
          <CompanySwitcher />
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <RemindersMenu />

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center ring-2 ring-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-80 bg-popover border shadow-lg z-50 max-h-96 overflow-y-auto"
              side="bottom"
              sideOffset={5}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <div className="flex gap-1">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.preventDefault(); notifications.forEach((n) => !n.read && markAsRead(n.id)); }}>
                        Mark all read
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.preventDefault(); clearAll(); }}>
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
              {notifications.length > 0 ? (
                notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-4 cursor-pointer hover:bg-muted flex-col items-start"
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex items-start w-full">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="text-muted-foreground hover:text-foreground ml-2"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label="Account menu">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-blue-700 text-white font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover z-50" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};