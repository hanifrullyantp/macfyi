-- Align crm_contacts.stage with admin UI pipeline stages.
-- Old: lead/interested/payment_pending/paid/affiliate_customer
-- New (UI): lead/contacted/demo/trial/customer/churned
--
-- Must drop the old CHECK before UPDATEs; otherwise setting stage = 'customer'
-- violates the legacy constraint.

alter table public.crm_contacts drop constraint if exists crm_contacts_stage_check;

do $$
begin
  update public.crm_contacts set stage = 'contacted' where stage = 'interested';
  update public.crm_contacts set stage = 'trial' where stage = 'payment_pending';
  update public.crm_contacts set stage = 'customer' where stage in ('paid', 'affiliate_customer');

  update public.crm_contacts set stage = 'lead' where stage is null or btrim(stage) = '';

  -- Anything still not in the new allowed set becomes lead (legacy/custom typos).
  update public.crm_contacts
    set stage = 'lead'
    where stage not in ('lead', 'contacted', 'demo', 'trial', 'customer', 'churned');
end $$;

alter table public.crm_contacts
  add constraint crm_contacts_stage_check
  check (stage in ('lead', 'contacted', 'demo', 'trial', 'customer', 'churned'));
