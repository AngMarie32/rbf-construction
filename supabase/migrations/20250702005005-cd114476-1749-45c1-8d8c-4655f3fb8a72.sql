
-- Create tasks table for schedule integration if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'On Hold', 'Completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  dependencies TEXT[] DEFAULT '{}',
  budget_allocation NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense categories table for better categorization
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  budget_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, budget_percentage) VALUES
('Labor', 'Direct labor costs', 35.0),
('Materials', 'Construction materials and supplies', 30.0),
('Equipment', 'Equipment rental and usage', 15.0),
('Subcontractors', 'Subcontractor payments', 12.0),
('Overhead', 'Project overhead expenses', 5.0),
('Insurance', 'Insurance and bonding costs', 2.0),
('Other', 'Miscellaneous expenses', 1.0)
ON CONFLICT (name) DO NOTHING;

-- Create budget allocations table for detailed budget tracking
CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC DEFAULT 0,
  committed_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, category_id)
);

-- Create project milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  actual_date DATE,
  budget_checkpoint NUMERIC DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Delayed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE USING (true);

-- Add RLS policies for expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view expense categories" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "Users can create expense categories" ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update expense categories" ON public.expense_categories FOR UPDATE USING (true);

-- Add RLS policies for budget_allocations
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view budget allocations" ON public.budget_allocations FOR SELECT USING (true);
CREATE POLICY "Users can create budget allocations" ON public.budget_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update budget allocations" ON public.budget_allocations FOR UPDATE USING (true);
CREATE POLICY "Users can delete budget allocations" ON public.budget_allocations FOR DELETE USING (true);

-- Add RLS policies for project_milestones
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project milestones" ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "Users can create project milestones" ON public.project_milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project milestones" ON public.project_milestones FOR UPDATE USING (true);
CREATE POLICY "Users can delete project milestones" ON public.project_milestones FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_budget_allocations_updated_at BEFORE UPDATE ON public.budget_allocations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
