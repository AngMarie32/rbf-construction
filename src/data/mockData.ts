import { Project, User, BidItem, SOVItem, Task, Equipment, Proposal, ChangeOrder } from '@/types';

export const mockUser: User = {
  id: '1',
  email: 'admin@construction.com',
  role: 'Admin',
  name: 'John Smith',
  createdAt: new Date('2024-01-01')
};

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Downtown Office Complex',
    type: 'Commercial',
    contractValue: 2500000,
    status: 'Open',
    startDate: new Date('2024-01-15'),
    dueDate: new Date('2024-12-15'),
    completionPercentage: 65,
    address: '123 Main St, Downtown',
    projectCode: 'DOC-2024-001',
    client: 'Metropolitan Development Corp',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-05-20')
  },
  {
    id: '2',
    name: 'Riverside Apartments',
    type: 'Residential',
    contractValue: 1800000,
    status: 'Open',
    startDate: new Date('2024-02-01'),
    dueDate: new Date('2024-10-30'),
    completionPercentage: 42,
    address: '456 River Dr, Riverside',
    projectCode: 'RA-2024-002',
    client: 'Riverside Housing LLC',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-05-18')
  },
  {
    id: '3',
    name: 'Municipal Bridge Repair',
    type: 'Infrastructure',
    contractValue: 850000,
    status: 'Planning',
    startDate: new Date('2024-06-01'),
    dueDate: new Date('2024-09-15'),
    completionPercentage: 15,
    address: 'Bridge St over Cedar River',
    projectCode: 'MBR-2024-003',
    client: 'City of Springfield',
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-05-10')
  },
  {
    id: '4',
    name: 'Retail Shopping Center',
    type: 'Commercial',
    contractValue: 3200000,
    status: 'Closed',
    startDate: new Date('2023-08-15'),
    dueDate: new Date('2024-03-30'),
    completionPercentage: 100,
    address: '789 Commerce Blvd, West End',
    projectCode: 'RSC-2023-004',
    client: 'West End Retail Group',
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date('2024-04-01')
  }
];

export const mockBidItems: BidItem[] = [
  {
    id: '1',
    projectId: '1',
    category: 'Site Work',
    subcategory: 'Excavation',
    description: 'Excavation and Grading',
    unit: 'cy',
    unitCost: 25,
    quantity: 1200,
    total: 30000
  },
  {
    id: '2',
    projectId: '1',
    category: 'Concrete',
    subcategory: 'Foundation',
    description: 'Foundation Concrete',
    unit: 'cy',
    unitCost: 150,
    quantity: 800,
    total: 120000
  },
  {
    id: '3',
    projectId: '1',
    category: 'Steel',
    subcategory: 'Structural',
    description: 'Structural Steel Frame',
    unit: 'ton',
    unitCost: 2800,
    quantity: 45,
    total: 126000
  }
];

export const mockSOVItems: SOVItem[] = [
  {
    id: '1',
    projectId: '1',
    itemNumber: '001',
    category: 'Site Work',
    description: 'Excavation and Grading',
    scheduledValue: 30000,
    previousApplications: 25000,
    thisPeriod: 5000,
    materialsStored: 0,
    workCompletedFromPrevious: 25000,
    materialsPresently_stored: 0,
    totalCompletedAndStored: 30000,
    percentComplete: 100,
    retainagePercentage: 10
  },
  {
    id: '2',
    projectId: '1',
    itemNumber: '002',
    category: 'Concrete',
    description: 'Foundation Concrete',
    scheduledValue: 120000,
    previousApplications: 80000,
    thisPeriod: 20000,
    materialsStored: 5000,
    workCompletedFromPrevious: 80000,
    materialsPresently_stored: 5000,
    totalCompletedAndStored: 105000,
    percentComplete: 83,
    retainagePercentage: 10
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    projectId: '1',
    title: 'Site Preparation',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-02-15'),
    progress: 100,
    status: 'Completed',
    dependencies: []
  },
  {
    id: '2',
    projectId: '1',
    title: 'Foundation Work',
    startDate: new Date('2024-02-16'),
    endDate: new Date('2024-04-15'),
    progress: 90,
    status: 'In Progress',
    dependencies: ['1']
  },
  {
    id: '3',
    projectId: '1',
    title: 'Steel Frame Installation',
    startDate: new Date('2024-04-16'),
    endDate: new Date('2024-06-30'),
    progress: 45,
    status: 'In Progress',
    dependencies: ['2']
  }
];

export const mockEquipment: Equipment[] = [
  {
    id: '1',
    name: 'CAT 320 Excavator',
    category: 'Heavy Machinery',
    hourly_rate: 125,
    year: 2021,
    value: 275000,
    status: 'In Use',
    description: 'Heavy-duty excavator for large construction projects',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Ford F-250 Truck',
    category: 'Vehicles',
    hourly_rate: 35,
    year: 2022,
    value: 65000,
    status: 'Available',
    description: 'Heavy-duty pickup truck for transportation and light hauling',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Utility Trailer',
    category: 'Trailers',
    hourly_rate: 15,
    year: 2020,
    value: 12000,
    status: 'Available',
    description: 'Multi-purpose utility trailer for equipment transport',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const mockProposals: Proposal[] = [
  {
    id: '1',
    projectName: 'Medical Center Expansion',
    client: 'Regional Healthcare System',
    scope: 'Addition of 3-story medical wing with specialized equipment installation',
    amount: 4200000,
    status: 'Sent',
    createdAt: new Date('2024-05-15')
  },
  {
    id: '2',
    projectName: 'School District Renovations',
    client: 'City School District',
    scope: 'Renovation of 3 elementary schools including HVAC upgrades',
    amount: 1850000,
    status: 'Draft',
    createdAt: new Date('2024-05-20')
  }
];

export const mockChangeOrders: ChangeOrder[] = [
  {
    id: '1',
    projectId: '1',
    number: 'CO-001',
    date: new Date('2024-03-15'),
    description: 'Additional electrical outlets in office areas',
    amount: 15000,
    status: 'Approved'
  },
  {
    id: '2',
    projectId: '1',
    number: 'CO-002',
    date: new Date('2024-04-20'),
    description: 'Upgrade to higher grade flooring material',
    amount: 28000,
    status: 'Pending'
  }
];
