
-- Create table for tracking detailed expense categories and subcategories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id),
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert standard construction expense categories
INSERT INTO public.expense_categories (name, color) VALUES
  ('Labor', '#10b981'),
  ('Materials', '#3b82f6'),
  ('Equipment', '#f59e0b'),
  ('Subcontractors', '#8b5cf6'),
  ('Overhead', '#ef4444');

-- Create table for budget variance tracking and analysis
CREATE TABLE public.budget_variances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (actual_amount - planned_amount) STORED,
  variance_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN planned_amount > 0 
    THEN ((actual_amount - planned_amount) / planned_amount) * 100 
    ELSE 0 END
  ) STORED,
  variance_reason TEXT,
  risk_level TEXT DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for budget forecasting
CREATE TABLE public.budget_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_month DATE NOT NULL,
  predicted_spend NUMERIC NOT NULL DEFAULT 0,
  confidence_level NUMERIC DEFAULT 0.8 CHECK (confidence_level >= 0 AND confidence_level <= 1),
  forecast_method TEXT DEFAULT 'trend_analysis',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for budget alerts and notifications
CREATE TABLE public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('budget_overrun', 'variance_threshold', 'forecast_warning', 'burn_rate_high')),
  threshold_percentage NUMERIC NOT NULL,
  current_percentage NUMERIC NOT NULL,
  severity TEXT DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view expense categories" ON public.expense_categories FOR SELECT USING (true);

CREATE POLICY "Users can view budget variances" ON public.budget_variances FOR SELECT USING (true);
CREATE POLICY "Users can create budget variances" ON public.budget_variances FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update budget variances" ON public.budget_variances FOR UPDATE USING (true);

CREATE POLICY "Users can view budget forecasts" ON public.budget_forecasts FOR SELECT USING (true);
CREATE POLICY "Users can create budget forecasts" ON public.budget_forecasts FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view budget alerts" ON public.budget_alerts FOR SELECT USING (true);
CREATE POLICY "Users can create budget alerts" ON public.budget_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update budget alerts" ON public.budget_alerts FOR UPDATE USING (true);

-- Add updated_at trigger for budget_variances
CREATE TRIGGER update_budget_variances_updated_at
  BEFORE UPDATE ON public.budget_variances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_budget_variances_project_period ON public.budget_variances(project_id, period_start, period_end);
CREATE INDEX idx_budget_forecasts_project_date ON public.budget_forecasts(project_id, forecast_date);
CREATE INDEX idx_budget_alerts_project_severity ON public.budget_alerts(project_id, severity) WHERE NOT is_acknowledged;
CREATE INDEX idx_expenses_project_date_status ON public.expenses(project_id, date, status);
CREATE INDEX idx_project_billing_project_period ON public.project_billing(project_id, billing_period_start, billing_period_end);
