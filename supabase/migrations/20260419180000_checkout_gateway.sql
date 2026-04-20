-- Default checkout gateway for landing (Midtrans | Lynk | external). Admin can change via platform_settings.
insert into public.platform_settings (key, value)
values ('checkout.gateway', '"midtrans"'::jsonb)
on conflict (key) do nothing;
