-- Adds a location column so orders can be attributed to a specific storefront.
-- Nullable / no default so existing rows are unaffected.

alter table sandwich_orders
  add column if not exists location text;

create index if not exists sandwich_orders_location_idx on sandwich_orders (location);
