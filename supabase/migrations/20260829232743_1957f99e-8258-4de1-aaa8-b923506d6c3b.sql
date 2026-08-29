CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_number text,
  borrower_name text NOT NULL,
  borrower_email text,
  borrower_phone text,
  borrower_address text,
  principal_amount numeric(14,3) NOT NULL DEFAULT 0,
  interest_rate numeric(7,4) NOT NULL DEFAULT 0,
  term_months integer NOT NULL DEFAULT 12,
  payment_day integer NOT NULL DEFAULT 1,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage loans" ON public.loans
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE TABLE public.loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  payment_number integer NOT NULL,
  due_date date NOT NULL,
  scheduled_amount numeric(14,3) NOT NULL DEFAULT 0,
  principal_amount numeric(14,3) NOT NULL DEFAULT 0,
  interest_amount numeric(14,3) NOT NULL DEFAULT 0,
  balance_after numeric(14,3) NOT NULL DEFAULT 0,
  paid_amount numeric(14,3) NOT NULL DEFAULT 0,
  paid_date date,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, payment_number)
);

CREATE INDEX idx_loan_payments_loan ON public.loan_payments(loan_id);
CREATE INDEX idx_loans_company ON public.loans(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_payments TO authenticated;
GRANT ALL ON public.loan_payments TO service_role;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage loan payments" ON public.loan_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND public.has_company_access(l.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND public.has_company_access(l.company_id)));

CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_loan_payments_updated BEFORE UPDATE ON public.loan_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();