import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectRow {
  id: string;
  name: string;
}

const NAV_ITEMS: { name: string; href: string; group: string }[] = [
  { name: 'Dashboard', href: '/dashboard', group: 'Pages' },
  { name: 'Projects', href: '/projects', group: 'Pages' },
  { name: 'Analytics', href: '/analytics', group: 'Pages' },
  { name: 'E-Sign', href: '/esign', group: 'Pages' },
  { name: 'Project Schedule', href: '/project-schedule', group: 'Pages' },
  { name: 'Documents', href: '/documents', group: 'Pages' },
  { name: 'Permits', href: '/permits', group: 'Pages' },
  { name: 'Punch List', href: '/punch-list', group: 'Pages' },
  { name: 'Meetings', href: '/meetings', group: 'Pages' },
  { name: 'Equipment', href: '/equipment', group: 'Pages' },
  { name: 'Subcontractors', href: '/subcontractors', group: 'Pages' },
  { name: 'Bid Planner', href: '/bid-planner', group: 'Pages' },
  { name: 'Proposals', href: '/proposals', group: 'Pages' },
  { name: 'Expenses', href: '/expenses', group: 'Pages' },
  { name: 'Payment Apps', href: '/payment-applications', group: 'Pages' },
  { name: 'Billing', href: '/billing', group: 'Pages' },
  { name: 'Change Orders', href: '/change-orders', group: 'Pages' },
  { name: 'Burn Analysis', href: '/burn-rate-analysis', group: 'Pages' },
  { name: 'Settings', href: '/settings', group: 'Pages' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || projects.length > 0) return;
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setProjects(data || []));
  }, [open, projects.length]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, pages, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {projects.length > 0 && (
          <>
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  onSelect={() => run(() => navigate(`/projects/${p.id}`))}
                >
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Pages">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`page ${item.name}`}
              onSelect={() => run(() => navigate(item.href))}
            >
              {item.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            value="action new change order"
            onSelect={() => run(() => navigate('/change-orders'))}
          >
            New Change Order
          </CommandItem>
          <CommandItem
            value="action new payment application"
            onSelect={() => run(() => navigate('/payment-applications'))}
          >
            New Payment Application
          </CommandItem>
          <CommandItem
            value="action send for esign"
            onSelect={() => run(() => navigate('/esign'))}
          >
            Send for E-Signature
          </CommandItem>
          <CommandItem
            value="action toggle dark mode"
            onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
          >
            Toggle Dark Mode
          </CommandItem>
          <CommandItem
            value="action sign out"
            onSelect={() => run(() => signOut())}
          >
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}