-- Read-only structural + count inventory. Output: one JSON document (single row).
-- Used to compare a source database with its restored copy. Contains no row contents,
-- only counts and hashes of definitions.
set search_path = '';
select jsonb_pretty(jsonb_build_object(
  'server_version', current_setting('server_version'),
  'extensions', (select coalesce(jsonb_agg(extname order by extname), '[]') from pg_extension),
  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', n.nspname || '.' || c.relname,
      'rls', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'rows', (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint,
      'columns_md5', (
        select md5(string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull || ':' || coalesce(pg_get_expr(d.adbin, d.adrelid), ''), ',' order by a.attnum))
        from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      'acl_md5', md5(coalesce((select string_agg(coalesce(nullif(x.grantee, 0)::regrole::text, 'PUBLIC') || ':' || x.privilege_type || ':' || x.is_grantable, ',' order by 1) from aclexplode(c.relacl) x), ''))
    ) order by n.nspname, c.relname), '[]')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and n.nspname in ('public', 'auth', 'storage')
  ),
  'public_policies', (
    select coalesce(jsonb_agg(jsonb_build_object('policy', tablename || '.' || policyname,
      'md5', md5(concat_ws('|', cmd, roles::text, qual, with_check))) order by tablename, policyname), '[]')
    from pg_policies where schemaname = 'public'),
  'public_functions', (
    select coalesce(jsonb_agg(jsonb_build_object('function', p.oid::regprocedure::text,
      'md5', md5(pg_get_functiondef(p.oid)), 'acl_md5', md5(coalesce((select string_agg(coalesce(nullif(x.grantee, 0)::regrole::text, 'PUBLIC') || ':' || x.privilege_type || ':' || x.is_grantable, ',' order by 1) from aclexplode(p.proacl) x), ''))) order by p.oid::regprocedure::text), '[]')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')),
  'public_triggers', (
    select coalesce(jsonb_agg(jsonb_build_object('trigger', c.relname || '.' || t.tgname,
      'md5', md5(pg_get_triggerdef(t.oid))) order by c.relname, t.tgname), '[]')
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal),
  'public_indexes', (
    select coalesce(jsonb_agg(jsonb_build_object('index', indexname, 'md5', md5(indexdef)) order by indexname), '[]')
    from pg_indexes where schemaname = 'public'),
  'public_constraints', (
    select coalesce(jsonb_agg(jsonb_build_object('constraint', c.conrelid::regclass::text || '.' || c.conname,
      'md5', md5(pg_get_constraintdef(c.oid))) order by c.conrelid::regclass::text, c.conname), '[]')
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'),
  'public_table_grants_md5', (
    select md5(coalesce(string_agg(grantee || ':' || table_name || ':' || privilege_type, ',' order by grantee, table_name, privilege_type), ''))
    from information_schema.role_table_grants where table_schema = 'public'),
  'applied_migrations', (
    select case when to_regclass('supabase_migrations.schema_migrations') is null then null
      else (xpath('/row/c/text()', query_to_xml('select count(*) as c from supabase_migrations.schema_migrations', false, true, '')))[1]::text::bigint end),
  'storage_buckets', (
    select case when to_regclass('storage.buckets') is null then null
      else (xpath('/row/c/text()', query_to_xml('select count(*) as c from storage.buckets', false, true, '')))[1]::text::bigint end)
));
