-- Run this in the Supabase SQL Editor for the Sandwich App project
-- (jrdylryrawprhvefzfid) before deploying this update.
-- Safe to run multiple times.

-- New per-sandwich fields
alter table sandwich_orders
  add column if not exists double_meat boolean default false,
  add column if not exists label_name text,
  add column if not exists sms_opt_in boolean default false;

-- Admin users for the /admin reporting panel (same simple username/password
-- pattern as the Butcher App's `users` table — internal tool, no public signup).
create table if not exists sandwich_admin_users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  username text not null unique,
  password text not null
);

-- Seed a first admin login — CHANGE THIS PASSWORD after running, or update
-- it directly in Supabase Table Editor.
insert into sandwich_admin_users (username, password)
values ('admin', 'changeme')
on conflict (username) do nothing;
