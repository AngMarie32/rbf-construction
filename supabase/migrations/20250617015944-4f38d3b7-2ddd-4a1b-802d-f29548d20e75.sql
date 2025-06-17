
-- Add the missing field_leader column to the projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS field_leader TEXT;

-- Add description column if it doesn't exist (also referenced in the code)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Create an index on field_leader for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_field_leader ON projects(field_leader);

-- Add indexes for better performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_billing_project_id ON project_billing(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
