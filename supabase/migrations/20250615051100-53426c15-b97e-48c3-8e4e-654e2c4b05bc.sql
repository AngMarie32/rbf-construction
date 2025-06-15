
-- Add document_id column to bid_package_items table to allow linking documents to bid items
ALTER TABLE public.bid_package_items 
ADD COLUMN document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
