-- Signature Sandwiches support (Aug 27, 2026)
-- Adds item-type tracking so preset signature items can be saved alongside
-- build-your-own rows. Run in the Supabase SQL Editor BEFORE deploying is live-tested:
-- signature orders will fail to save until these columns exist.

alter table sandwich_orders
  add column if not exists item_type text not null default 'byo',
  add column if not exists signature_id text,
  add column if not exists signature_name text,
  add column if not exists signature_upc text;

-- Signature rows have no bread selection; relax the old BYO-era constraint.
alter table sandwich_orders alter column bread drop not null;
