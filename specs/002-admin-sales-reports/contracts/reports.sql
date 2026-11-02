-- ============================================================================
-- 0002 — Admin reporting RPCs (feature 002-admin-sales-reports)
-- Source of truth: specs/002-admin-sales-reports/contracts/reports.sql
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
