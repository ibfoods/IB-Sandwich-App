-- Run this in the Supabase SQL Editor for the Sandwich App project
-- (jrdylryrawprhvefzfid) before deploying the multi-sandwich cart update.
-- It's safe to run multiple times.

alter table sandwich_orders
  add column if not exists cart_id text,
  add column if not exists item_index integer,
  add column if not exists item_count integer;

-- Optional: index for grouping sandwiches that belong to the same order
create index if not exists idx_sandwich_orders_cart_id on sandwich_orders (cart_id);
