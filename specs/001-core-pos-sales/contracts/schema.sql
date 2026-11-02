-- ============================================================================
-- Supabase schema + RLS + seeds — POS for Construction Shop
-- Generated for feature 001-core-pos-sales. Run in Supabase SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text not null default '',
  role        text not null default 'sale' check (role in ('sale','admin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  price_mmk    integer not null check (price_mmk >= 1),
  image_url    text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (is_active, updated_at desc);

create table if not exists public.sales (
  id               uuid primary key default gen_random_uuid(),
  idempotency_key  uuid not null,
  total_mmk        integer not null check (total_mmk >= 0),
  completed_by     uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),   -- client sale event time
  synced_at        timestamptz not null default now(),   -- first server acceptance
  status           text not null default 'completed' check (status in ('completed','void')),
  unique (idempotency_key)
);
create index if not exists sales_completed_by_idx on public.sales (completed_by, created_at desc);
create index if not exists sales_created_at_idx  on public.sales (created_at desc);   -- admin daily/weekly/monthly later

create table if not exists public.sale_items (
  id                  uuid primary key default gen_random_uuid(),
  sale_id             uuid not null references public.sales(id) on delete cascade,
  product_id          uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  image_url_snapshot    text,
  qty                 integer not null check (qty >= 1),
  unit_price_mmk      integer not null check (unit_price_mmk >= 0),
  line_total_mmk      integer not null check (line_total_mmk >= 0)
);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);

-- ----------------------------------------------------------------------------
-- RPC: atomic, idempotent sale creation
-- expects: p_sale  = {"idempotency_key","total_mmk","completed_by","created_at"}
--          p_items = [{"product_id","product_name_snapshot","image_url_snapshot",
--                      "qty","unit_price_mmk","line_total_mmk"}]
-- returns jsonb: {"sale_id": ..., "duplicate": bool, "total_mmk": int}
-- ----------------------------------------------------------------------------

create or replace function public.create_sale(p_sale jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_existing uuid;
  v_existing_dup boolean;
  v_recalc bigint;
  v_by uuid := p_sale->>'completed_by';
begin
  -- must own this sale
  if v_by is null or v_by::uuid <> auth.uid() then
    raise exception 'FORBIDDEN: completed_by must be the signed-in user';
  end if;

  select s.id into v_existing from public.sales s
  where s.idempotency_key = (p_sale->>'idempotency_key')::uuid;
  if v_existing is not null then
    return jsonb_build_object('sale_id', v_existing, 'duplicate', true);
  end if;

  -- recompute total from items; never trust client total
  select coalesce(sum((i->>'line_total_mmk')::bigint),0) into v_recalc
  from jsonb_array_elements(p_items) i;
  if v_recalc <> coalesce((p_sale->>'total_mmk')::bigint, -1) then
    raise exception 'TOTAL_MISMATCH: client total does not match item sum';
  end if;
  if v_recalc = 0 then
    raise exception 'EMPTY_SALE: no items';
  end if;

  insert into public.sales (idempotency_key, total_mmk, completed_by, created_at)
  values ((p_sale->>'idempotency_key')::uuid,
          v_recalc::integer,
          v_by,
          coalesce(nullif(p_sale->>'created_at','')::timestamptz, now()))
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, product_name_snapshot,
                                 image_url_snapshot, qty, unit_price_mmk, line_total_mmk)
  select v_sale_id,
         nullif(i->>'product_id','')::uuid,
         i->>'product_name_snapshot',
         nullif(i->>'image_url_snapshot',''),
         (i->>'qty')::integer,
         (i->>'unit_price_mmk')::integer,
         (i->>'line_total_mmk')::integer
  from jsonb_array_elements(p_items) i;

  return jsonb_build_object('sale_id', v_sale_id, 'duplicate', false,
                            'total_mmk', v_recalc);
end;
$$;

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- populate profiles row at signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales    enable row level security;
alter table public.sale_items enable row level security;

-- profiles: read own; admin reads all
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role='admin' and p.is_active));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);
-- NOTE: role/is_active changes for self are blocked by role; only admin edits role columns below.

-- products: authenticated users read active (+admin reads all incl. inactive)
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (
    (auth.uid() is not null and (
       is_active
       or created_by = auth.uid()
       or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_active)
    )));

-- products: any authenticated active staff may create (US5)
drop policy if exists products_insert_staff on public.products;
create policy products_insert_staff on public.products
  for insert with check (
    auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
    and created_by = auth.uid()
  );

-- products: admin OR the product's own creator may update (price/name/image edits)
drop policy if exists products_update_admin on public.products;
create policy products_update_admin on public.products
  for update using (
    exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_active)
    or created_by = auth.uid()
  );

-- sales: staff insert/read own; admin reads all
drop policy if exists sales_insert_self on public.sales;
create policy sales_insert_self on public.sales
  for insert with check (completed_by = auth.uid());

drop policy if exists sales_read on public.sales;
create policy sales_read on public.sales
  for select using (
    completed_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_active)
  );

-- sale_items: inherit sale visibility; insert via RPC (security definer) mostly
drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (s.completed_by = auth.uid()
             or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.is_active))
    )
  );

drop policy if exists sale_items_insert_self on public.sale_items;
create policy sale_items_insert_self on public.sale_items
  for insert with check (
    exists (select 1 from public.sales s where s.id = sale_id and s.completed_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Storage: product images bucket (canonical image store)
-- products.image_url holds the public URL; bytes live here, never in Postgres.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('products','products', true)
on conflict (id) do nothing;

drop policy if exists "products upload staff" on storage.objects;
create policy "products upload staff" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products');

drop policy if exists "products read public" on storage.objects;
create policy "products read public" on storage.objects
  for select using (bucket_id = 'products');

-- ----------------------------------------------------------------------------
-- Seeds (fixed credential users + sample products)
-- Run via Supabase Dashboard / SQL editor (server admin context required).
-- Passwords here are DEMO ONLY — change for production.
-- ----------------------------------------------------------------------------
-- Demo sale account
select id from auth.users limit 0; -- ensure auth schema callable in editor context
do $$
declare v uuid;
begin
  if not exists (select 1 from auth.users where email = 'sale01@pos.local') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000',
            gen_random_uuid(), 'authenticated', 'authenticated',
            'sale01@pos.local',
            crypt('demo-pass-1234', gen_salt('bf')),
            now(), now(), now(),
            '{"username":"sale01","full_name":"ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁"}'::jsonb)
    returning id into v;
    insert into public.profiles (id, username, full_name, role)
    values (v, 'sale01', 'ဆိုင်တွင်းလုပ်ဆောင်သူ ၀၁', 'sale');
  end if;

  if not exists (select 1 from auth.users where email = 'admin@pos.local') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000',
            gen_random_uuid(), 'authenticated', 'authenticated',
            'admin@pos.local',
            crypt('demo-admin-1234', gen_salt('bf')),
            now(), now(), now(),
            '{"username":"admin","full_name":"စီမံခန့်ခွဲသူ"}'::jsonb)
    returning id into v;
    insert into public.profiles (id, username, full_name, role)
    values (v, 'admin', 'စီမံခန့်ခွဲသူ', 'admin');
  end if;
end $$;

-- Sample products (no images; UI shows placeholder)
insert into public.products (name, price_mmk, created_by)
select 'ဆီမင့်', 9500, (select id from public.profiles where username='admin')
where not exists (select 1 from public.products where name='ဆီမင့်');

insert into public.products (name, price_mmk, created_by)
select 'အုတ် ၁၀၀၀', 85000, (select id from public.profiles where username='admin')
where not exists (select 1 from public.products where name='အုတ် ၁၀၀၀');

insert into public.products (name, price_mmk, created_by)
select 'သံပူရှက်', 4800, (select id from public.profiles where username='admin')
where not exists (select 1 from public.products where name='သံပူရှက်');

-- ----------------------------------------------------------------------------
-- Admin reporting helper (for future /admin feature)
-- ----------------------------------------------------------------------------
create or replace function public.sales_summary_daily(p_from date, p_to date)
returns table (d date, n bigint, total_mmk bigint)
language sql stable security invoker as $$
  select s.created_at::date, count(*), sum(s.total_mmk)::bigint
  from public.sales s
  where s.created_at::date between p_from and p_to
    and s.status = 'completed'
  group by 1 order by 1;
$$;

-- End of schema
