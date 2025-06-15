
-- Create table for subcontractor groups
CREATE TABLE public.subcontractor_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for subcontractors in groups
CREATE TABLE public.subcontractor_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.subcontractor_groups(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, subcontractor_id)
);

-- Create table for bid invitations
CREATE TABLE public.bid_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id UUID REFERENCES public.bid_packages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create junction table for documents included in bid invitations
CREATE TABLE public.bid_invitation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_invitation_id UUID REFERENCES public.bid_invitations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bid_invitation_id, document_id)
);

-- Create table for tracking bid invitation recipients
CREATE TABLE public.bid_invitation_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_invitation_id UUID REFERENCES public.bid_invitations(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bid_invitation_id, subcontractor_id)
);

-- Enable RLS on all tables
ALTER TABLE public.subcontractor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitation_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now since there's no auth implemented)
CREATE POLICY "Allow all operations on subcontractor_groups" ON public.subcontractor_groups FOR ALL USING (true);
CREATE POLICY "Allow all operations on subcontractor_group_members" ON public.subcontractor_group_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on bid_invitations" ON public.bid_invitations FOR ALL USING (true);
CREATE POLICY "Allow all operations on bid_invitation_documents" ON public.bid_invitation_documents FOR ALL USING (true);
CREATE POLICY "Allow all operations on bid_invitation_recipients" ON public.bid_invitation_recipients FOR ALL USING (true);

-- Add updated_at trigger for subcontractor_groups
CREATE TRIGGER update_subcontractor_groups_updated_at 
  BEFORE UPDATE ON public.subcontractor_groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for bid_invitations
CREATE TRIGGER update_bid_invitations_updated_at 
  BEFORE UPDATE ON public.bid_invitations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
