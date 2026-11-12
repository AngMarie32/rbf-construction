import {
  LayoutDashboard, BarChart3, Wallet, FolderKanban, Database, Send, PenLine,
  TrendingUp, Building2, Receipt, Home, Calculator, ClipboardList, LayoutTemplate,
  FileSignature, FileText, FileCheck2, BadgeCheck, CalendarRange, ListChecks, Users,
  Truck, Cpu, CreditCard, Flame, GitPullRequestArrow, Upload, DollarSign, HardHat,
  Landmark, FileSpreadsheet, FileInput, Settings, CalendarClock, type LucideIcon,
} from 'lucide-react';

export interface NavItem { name: string; href: string; icon: LucideIcon }
export interface NavGroup { label: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Owner Cockpit', href: '/owner-money', icon: Wallet },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Quick Access',
    items: [
      { name: 'Cost Database', href: '/cost-database', icon: Database },
      { name: 'Document Sender', href: '/invoice-sender', icon: Send },
      { name: 'E-Sign', href: '/esign', icon: PenLine },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { name: 'Cash Flow', href: '/cash-flow', icon: TrendingUp },
      { name: 'Companies', href: '/companies', icon: Building2 },
      { name: 'Operating Costs', href: '/operating-costs', icon: Receipt },
      { name: 'Properties', href: '/properties', icon: Home },
    ],
  },
  {
    label: 'Bidding',
    items: [
      { name: 'Bid Estimator', href: '/estimating', icon: Calculator },
      { name: 'Bid Planner', href: '/bid-planner', icon: ClipboardList },
      { name: 'Bid Templates', href: '/bid-templates', icon: LayoutTemplate },
      { name: 'Proposals', href: '/proposals', icon: FileSignature },
    ],
  },
  {
    label: 'Project Management',
    items: [
      { name: 'Documents', href: '/documents', icon: FileText },
      { name: 'Payment Applications', href: '/payment-applications', icon: FileCheck2 },
      { name: 'Permits & Bonds', href: '/permits', icon: BadgeCheck },
      { name: 'Project Schedule', href: '/project-schedule', icon: CalendarRange },
      { name: 'Punch List', href: '/punch-list', icon: ListChecks },
      { name: 'Subcontractors', href: '/subcontractors', icon: Users },
    ],
  },
  {
    label: 'Equipment',
    items: [
      { name: 'Equipment', href: '/equipment', icon: Truck },
      { name: 'Equipment Intelligence', href: '/equipment-insights', icon: Cpu },
    ],
  },
  {
    label: 'Financial',
    items: [
      { name: 'Billing', href: '/billing', icon: CreditCard },
      { name: 'Burn Analysis', href: '/burn-rate-analysis', icon: Flame },
      { name: 'Change Orders', href: '/change-orders', icon: GitPullRequestArrow },
      { name: 'Cost Import', href: '/cost-import', icon: Upload },
      { name: 'Expenses', href: '/expenses', icon: DollarSign },
      { name: 'Labor Costs', href: '/labor-costs', icon: HardHat },
      { name: 'Loans', href: '/loans', icon: Landmark },
      { name: 'QuickBooks Export', href: '/quickbooks-export', icon: FileSpreadsheet },
      { name: 'Report Import', href: '/report-import', icon: FileInput },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Scheduled Reports', href: '/weekly-reports', icon: CalendarClock },
    ],
  },
];

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');
