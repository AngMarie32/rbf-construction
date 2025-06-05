import { Project, User, BidItem, SOVItem, Task, Equipment, Proposal, ChangeOrder } from '@/types';

export const mockUser: User = {
  id: '1',
  email: 'admin@construction.com',
  role: 'Admin',
  name: 'John Smith',
  createdAt: new Date('2024-01-01')
};

export const mockProjects: Project[] = [];

export const mockBidItems: BidItem[] = [];

export const mockSOVItems: SOVItem[] = [];

export const mockTasks: Task[] = [];

export const mockEquipment: Equipment[] = [];

export const mockProposals: Proposal[] = [];

export const mockChangeOrders: ChangeOrder[] = [];
