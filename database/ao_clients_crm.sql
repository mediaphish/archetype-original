-- The CRM's own fields on each person (2026-10-25, notes/PLAN-crm.md):
-- relationship (client, prospect, podcast guest, mentee, partner, contact),
-- source (how they found Bart), and the next step with a date and an owner.
alter table ao_clients add column if not exists crm jsonb not null default '{}'::jsonb;
