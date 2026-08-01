import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Company {
  id: string;
  name: string;
  type: string;
  group_id: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  color: string | null;
  is_active: boolean;
}

export interface CompanyGroup {
  id: string;
  name: string;
  description: string | null;
}

interface CompanyContextValue {
  companies: Company[];
  groups: CompanyGroup[];
  loading: boolean;
  isAdmin: boolean;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleCompany: (id: string) => void;
  selectAll: () => void;
  selectGroup: (groupId: string) => void;
  activeCompanies: Company[];
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);
const STORAGE_KEY = 'rbf.selectedCompanyIds';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIdsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: profile }, { data: allCompanies }, { data: grants }, { data: grps }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('companies').select('*').order('name'),
      supabase.from('user_companies').select('company_id').eq('user_id', user.id),
      supabase.from('company_groups').select('id,name,description').order('name'),
    ]);

    const admin = (profile as any)?.role === 'Admin';
    setIsAdmin(admin);
    const allowed = new Set((grants || []).map((g: any) => g.company_id));
    const visible = ((allCompanies as any[]) || []).filter((c) => admin || allowed.has(c.id));
    setCompanies(visible as Company[]);
    setGroups((grps as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Prune stale selections; default to all visible companies
  useEffect(() => {
    if (loading || companies.length === 0) return;
    const ids = new Set(companies.map((c) => c.id));
    const valid = selectedIds.filter((id) => ids.has(id));
    if (valid.length === 0) {
      setSelectedIds(companies.map((c) => c.id));
    } else if (valid.length !== selectedIds.length) {
      setSelectedIds(valid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, companies]);

  const toggleCompany = useCallback(
    (id: string) => {
      setSelectedIds(
        selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
      );
    },
    [selectedIds, setSelectedIds]
  );

  const selectAll = useCallback(() => setSelectedIds(companies.map((c) => c.id)), [companies, setSelectedIds]);

  const selectGroup = useCallback(
    (groupId: string) => setSelectedIds(companies.filter((c) => c.group_id === groupId).map((c) => c.id)),
    [companies, setSelectedIds]
  );

  const activeCompanies = useMemo(
    () => companies.filter((c) => selectedIds.includes(c.id)),
    [companies, selectedIds]
  );

  const value: CompanyContextValue = {
    companies,
    groups,
    loading,
    isAdmin,
    selectedIds,
    setSelectedIds,
    toggleCompany,
    selectAll,
    selectGroup,
    activeCompanies,
    refresh: load,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanies() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompanies must be used within CompanyProvider');
  return ctx;
}