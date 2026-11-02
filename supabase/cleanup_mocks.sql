-- =============================================================================
-- cleanup_mocks.sql — remove mock/demo items from an EXISTING project.
-- Guarded with to_regclass() checks: silently skips anything not created yet.
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
