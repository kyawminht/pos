-- =============================================================================
-- setup-production.sql — ONE-PASTE setup for a Supabase project (SQL Editor).
--
-- Order of execution:
--   (0) cleanup_mocks.sql  — purges mock/demo items (guarded; skipped on fresh DB)
--   (1) 0001_init.sql      — schema, RLS, create_sale RPC, storage bucket
--   (2) 0002_admin_reports.sql — is_admin, report_period, sales_in_period,
--                                sale_detail, admin_update_product + grants
--
-- NO demo accounts or demo products are created here.
-- Create users in Dashboard > Authentication > Users (enable "Auto Confirm User").
-- Then promote the admin account:
--   update public.profiles set role = 'admin' where username = 'admin';
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- =============================================================================
-- (0) MOCK / DEMO ITEM CLEANUP (guarded — safe on a fresh database)
-- =============================================================================

do $$
begin
  if to_regclass('public.products') is not null then

    -- remove sale_items rows pointing at demo products (so history has no mock items)
    delete from public.sale_items
    where product_id in (
      select id from public.products where name in ('ဆီမင့်', 'အုတ် ၁၀၀၀', 'သံပူရှက်')
    );
    -- demo products seeded previously (with/without owner)
    delete from public.products where name in ('ဆီမင့်', 'အုတ် ၁၀၀၀', 'သံပူရှက်');
    delete from public.products where created_by is null;

    -- NUCLEAR OPTION — wipe ALL sale history (uncomment to use):
    -- delete from public.sale_items;
    -- delete from public.sales;

  end if;

  -- purge demo images from the products bucket (uncomment to use; bucket may not exist yet)
  -- delete from storage.objects where bucket_id = 'products';
end $$;

-- =============================================================================
-- (1) SCHEMA 0001 — initial schema
-- =============================================================================

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
declare
  v_base text := coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1));
  v_username text := v_base;
begin
  -- usernames are unique: disambiguate collisions (e.g. admin@gmail.com vs admin@pos.local)
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_base || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into public.profiles (id, username, full_name)
  values (new.id, v_username, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS-safe helpers (SECURITY DEFINER = evaluated as table owner, no recursion)
-- is_admin is also re-asserted inside 0002 RPCs. Grant to authenticated below.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin(p_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_uid and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_staff(p_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_uid and is_active
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_active_staff(uuid) to authenticated;

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
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);
-- NOTE: role/is_active changes for self are blocked by role; only admin edits role columns below.

-- products: authenticated users read active (+admin reads all incl. inactive)
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (
    auth.uid() is not null and (
       is_active
       or created_by = auth.uid()
       or public.is_admin(auth.uid())
    ));

-- products: any authenticated active staff may create (US5)
drop policy if exists products_insert_staff on public.products;
create policy products_insert_staff on public.products
  for insert with check (
    auth.uid() is not null
    and public.is_active_staff(auth.uid())
    and created_by = auth.uid()
  );

-- products: admin OR the product's own creator may update (price/name/image edits)
drop policy if exists products_update_admin on public.products;
create policy products_update_admin on public.products
  for update using (
    public.is_admin(auth.uid())
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
    or public.is_admin(auth.uid())
  );

-- sale_items: inherit sale visibility; insert via RPC (security definer) mostly
drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (s.completed_by = auth.uid() or public.is_admin(auth.uid()))
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

-- (Accounts are created via Supabase Dashboard > Authentication > Users.
--  The signup trigger public.handle_new_user() creates the matching profile row.)

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
-- =============================================================================
-- (2) SCHEMA 0002 — admin reports & product management
-- =============================================================================

-- Apply AFTER 0001_init.sql. Idempotent (create or replace).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helper: active admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_uid and p.role = 'admin' and p.is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- Period report: totals + per-day + per-staff (shop-timezone day buckets)
-- ---------------------------------------------------------------------------
create or replace function public.report_period(
  p_from date,
  p_to date,
  p_tz text default 'Asia/Yangon'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_count bigint;
  v_per_day jsonb;
  v_per_staff jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN: admin only';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'INVALID_RANGE';
  end if;

  with scoped as (
    select
      s.id,
      s.total_mmk,
      (s.created_at at time zone p_tz)::date as d,
      s.completed_by,
      coalesce(nullif(p.full_name, ''), p.username) as staff_name
    from public.sales s
    join public.profiles p on p.id = s.completed_by
    where s.status = 'completed'
      and (s.created_at at time zone p_tz)::date between p_from and p_to
  )
  select coalesce(sum(total_mmk), 0), count(*)
    into v_total, v_count
  from scoped;

  with scoped as (
    select
      s.total_mmk,
      (s.created_at at time zone p_tz)::date as d
    from public.sales s
    where s.status = 'completed'
      and (s.created_at at time zone p_tz)::date between p_from and p_to
  ),
  days as (
    select generate_series(p_from, p_to, interval '1 day')::date as d
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'd', to_char(days.d, 'YYYY-MM-DD'),
        'total_mmk', coalesce(agg.total_mmk, 0),
        'count', coalesce(agg.n, 0)
      ) order by days.d
    ),
    '[]'::jsonb
  )
    into v_per_day
  from days
  left join (
    select d, sum(total_mmk) as total_mmk, count(*) as n
    from scoped group by d
  ) agg on agg.d = days.d;

  with scoped as (
    select
      s.total_mmk,
      s.completed_by,
      coalesce(nullif(p.full_name, ''), p.username) as staff_name
    from public.sales s
    join public.profiles p on p.id = s.completed_by
    where s.status = 'completed'
      and (s.created_at at time zone p_tz)::date between p_from and p_to
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'staff_id', completed_by,
        'name', staff_name,
        'total_mmk', total_mmk,
        'count', n
      ) order by total_mmk desc
    ),
    '[]'::jsonb
  )
    into v_per_staff
  from (
    select completed_by, staff_name, sum(total_mmk) as total_mmk, count(*) as n
    from scoped group by completed_by, staff_name
  ) x;

  return jsonb_build_object(
    'from', to_char(p_from, 'YYYY-MM-DD'),
    'to', to_char(p_to, 'YYYY-MM-DD'),
    'tz', p_tz,
    'total_mmk', v_total,
    'sale_count', v_count,
    'per_day', v_per_day,
    'per_staff', v_per_staff
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Sale headers in a period (paginated, newest first)
-- ---------------------------------------------------------------------------
create or replace function public.sales_in_period(
  p_from date,
  p_to date,
  p_tz text default 'Asia/Yangon',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  total_mmk integer,
  completed_by uuid,
  completed_by_name text,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN: admin only';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT';
  end if;

  return query
  select
    s.id,
    s.created_at,
    s.total_mmk,
    s.completed_by,
    coalesce(nullif(p.full_name, ''), p.username) as completed_by_name,
    coalesce(sum(si.qty), 0)::integer as item_count
  from public.sales s
  join public.profiles p on p.id = s.completed_by
  left join public.sale_items si on si.sale_id = s.id
  where s.status = 'completed'
    and (s.created_at at time zone p_tz)::date between p_from and p_to
  group by s.id, s.created_at, s.total_mmk, s.completed_by, p.full_name, p.username
  order by s.created_at desc
  limit p_limit offset greatest(0, p_offset);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sale detail with snapshot line items (admin, or the sale owner)
-- ---------------------------------------------------------------------------
create or replace function public.sale_detail(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not exists (
    select 1 from public.sales s
    where s.id = p_sale_id
      and (s.completed_by = auth.uid() or public.is_admin(auth.uid()))
  ) then
    raise exception 'FORBIDDEN: not allowed';
  end if;

  select jsonb_build_object(
    'id', s.id,
    'created_at', s.created_at,
    'total_mmk', s.total_mmk,
    'status', s.status,
    'completed_by_name', coalesce(nullif(p.full_name, ''), p.username),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name_snapshot', si.product_name_snapshot,
          'image_url_snapshot', si.image_url_snapshot,
          'qty', si.qty,
          'unit_price_mmk', si.unit_price_mmk,
          'line_total_mmk', si.line_total_mmk
        ) order by si.product_name_snapshot
      )
      from public.sale_items si where si.sale_id = s.id
    ), '[]'::jsonb)
  )
    into v
  from public.sales s
  join public.profiles p on p.id = s.completed_by
  where s.id = p_sale_id;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Product update helper (admin OR creator; validation server-side)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_product(
  p_id uuid,
  p_name text default null,
  p_price_mmk integer default null,
  p_image_url text default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products;
  v_creator uuid;
begin
  select created_by into v_creator from public.products where id = p_id;
  if v_creator is null and not exists (select 1 from public.products where id = p_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not (public.is_admin(auth.uid()) or v_creator = auth.uid()) then
    raise exception 'FORBIDDEN: admin or creator only';
  end if;
  if p_name is not null and length(trim(p_name)) = 0 then
    raise exception 'NAME_REQUIRED';
  end if;
  if p_price_mmk is not null and (p_price_mmk < 1 or p_price_mmk > 9999999999) then
    raise exception 'PRICE_INVALID';
  end if;

  update public.products set
    name = coalesce(nullif(trim(p_name), ''), name),
    price_mmk = coalesce(p_price_mmk, price_mmk),
    image_url = coalesce(p_image_url, image_url),
    is_active = coalesce(p_is_active, is_active)
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id, 'name', v_row.name, 'price_mmk', v_row.price_mmk,
    'image_url', v_row.image_url, 'is_active', v_row.is_active
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (PostgREST RPC access for signed-in users; role checks inside)
-- ---------------------------------------------------------------------------
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.report_period(date, date, text) to authenticated;
grant execute on function public.sales_in_period(date, date, text, int, int) to authenticated;
grant execute on function public.sale_detail(uuid) to authenticated;
grant execute on function public.admin_update_product(uuid, text, integer, text, boolean) to authenticated;
