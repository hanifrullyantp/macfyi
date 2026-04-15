-- Demo funnel: tie CRM contacts to auth users (profiles.id = auth.users.id), unique per user for upserts.

create unique index if not exists crm_contacts_user_id_unique
  on public.crm_contacts (user_id)
  where user_id is not null;

comment on index public.crm_contacts_user_id_unique is 'At most one CRM row per Macfyi account; demo-request upserts on user_id.';

insert into public.platform_settings (key, value) values
  ('demo.allow_anonymous_demo_request', 'false'::jsonb)
on conflict (key) do nothing;
