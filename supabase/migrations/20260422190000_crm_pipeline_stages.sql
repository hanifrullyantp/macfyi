-- Align crm_contacts.stage with admin UI pipeline stages.
-- Old: lead/interested/payment_pending/paid/affiliate_customer
-- New (UI): lead/contacted/demo/trial/customer/churned

do $$
begin
  -- Normalize old values first (idempotent).
  update public.crm_contacts set stage = 'contacted' where stage = 'interested';
  update public.crm_contacts set stage = 'trial' where stage = 'payment_pending';
  update public.crm_contacts set stage = 'customer' where stage in ('paid', 'affiliate_customer');

  -- Ensure any null/blank stages fall back to lead.
  update public.crm_contacts set stage = 'lead' where stage is null or btrim(stage) = '';
end $$;

-- Drop and recreate check constraint (name is auto-generated in some environments).
alter table public.crm_contacts drop constraint if exists crm_contacts_stage_check;

alter table public.crm_contacts
  add constraint crm_contacts_stage_check
  check (stage in ('lead', 'contacted', 'demo', 'trial', 'customer', 'churned'));

