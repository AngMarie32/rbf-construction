-- 1) % complete updates itself.
--    Uses the latest payment application (completed & stored to date ÷ contract sum to date).
--    With no pay apps, uses billed ÷ contract value. Projects with neither keep whatever was typed in.
create or replace function public.recalc_project_completion(p_project uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  pct numeric;
  contract numeric;
  billed numeric;
begin
  if p_project is null then return; end if;

  select case when coalesce(pa.contract_sum_to_date, 0) > 0
              then pa.total_completed_and_stored / pa.contract_sum_to_date * 100 end
    into pct
    from payment_applications pa
   where pa.project_id = p_project
   order by pa.application_number desc nulls last, pa.created_at desc
   limit 1;

  if pct is null then
    select contract_value into contract from projects where id = p_project;
    select sum(billed_amount) into billed from project_billing where project_id = p_project;
    if coalesce(contract, 0) > 0 and coalesce(billed, 0) > 0 then
      pct := billed / contract * 100;
    end if;
  end if;

  if pct is not null then
    update projects
       set completion_percentage = least(100, greatest(0, round(pct)))
     where id = p_project
       and completion_percentage is distinct from least(100, greatest(0, round(pct)));
  end if;
end $$;

create or replace function public.trg_recalc_project_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform recalc_project_completion(new.project_id); end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.project_id is distinct from new.project_id) then
    perform recalc_project_completion(old.project_id);
  end if;
  return null;
end $$;

drop trigger if exists recalc_completion_payapps on payment_applications;
create trigger recalc_completion_payapps after insert or update or delete on payment_applications
  for each row execute function trg_recalc_project_completion();

drop trigger if exists recalc_completion_billing on project_billing;
create trigger recalc_completion_billing after insert or update or delete on project_billing
  for each row execute function trg_recalc_project_completion();

create or replace function public.trg_recalc_completion_contract()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.contract_value is distinct from old.contract_value then perform recalc_project_completion(new.id); end if;
  return null;
end $$;

drop trigger if exists recalc_completion_contract on projects;
create trigger recalc_completion_contract after update of contract_value on projects
  for each row execute function trg_recalc_completion_contract();

-- Fill in every existing project now.
do $$ declare r record; begin
  for r in select id from projects loop perform recalc_project_completion(r.id); end loop;
end $$;

-- 2) Budget by cost type for Job cost vs. estimate.
create table if not exists public.project_cost_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cost_type text not null,
  amount numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, cost_type)
);
alter table public.project_cost_budgets enable row level security;
drop policy if exists "Signed-in users manage cost budgets" on public.project_cost_budgets;
create policy "Signed-in users manage cost budgets" on public.project_cost_budgets
  for all to authenticated using (true) with check (true);

NOTIFY pgrst, 'reload schema';
