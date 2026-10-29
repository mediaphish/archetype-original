-- The shop (2026-10-28): guides sold as downloads, and apparel drops
-- (one design, orders for a window, then a local print run).
-- Applied to Supabase as migration "ao_shop". Server-only: RLS on, no policies.
create table if not exists ao_shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind text not null check (kind in ('guide','apparel')),
  title text not null,
  subtitle text,
  description text,
  price_cents integer not null check (price_cents > 0),
  shipping_cents integer not null default 0,
  cover_url text,
  file_path text,
  sizes text[],
  status text not null default 'draft' check (status in ('draft','live','closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists ao_shop_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references ao_shop_products(id),
  stripe_session_id text unique not null,
  email text,
  name text,
  size text,
  quantity integer not null default 1,
  amount_cents integer,
  shipping jsonb,
  status text not null default 'paid' check (status in ('paid','delivered','printing','shipped','refunded')),
  download_token text unique,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table ao_shop_products enable row level security;
alter table ao_shop_orders enable row level security;
insert into storage.buckets (id, name, public) values ('ao-shop-files','ao-shop-files', false) on conflict (id) do nothing;

-- Books (2026-10-29): sold where they already sell (Lulu, SamCart). The shop
-- lists them and sends the buyer to that store. Applied as migration "ao_shop_books".
alter table ao_shop_products add column if not exists buy_url text, add column if not exists page_path text, add column if not exists sort_order integer not null default 100;
alter table ao_shop_products drop constraint if exists ao_shop_products_kind_check;
alter table ao_shop_products add constraint ao_shop_products_kind_check check (kind in ('guide','apparel','book'));
