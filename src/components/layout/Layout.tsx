import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '@/components/CommandPalette';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Set when the page renders its own heading, to avoid a duplicate title. */
  hideTitle?: boolean;
  /** Optional buttons rendered on the right of the page title. */
  actions?: ReactNode;
}

export function Layout({ children, title, subtitle, hideTitle = false, actions }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = title ? `${title} · RBF Construction` : 'RBF Construction';
  }, [title]);

  return (
    <div className="min-h-screen bg-background flex">
      <CommandPalette />
      <Sidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] border-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in-up">
            {!hideTitle && title && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {title}
                  </h1>
                  {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
