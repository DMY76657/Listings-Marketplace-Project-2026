-- Migration Health Check for Listings Marketplace
-- Run this in Supabase SQL Editor after clean-migration.sql

-- 1) Functions
SELECT
  'function_is_admin' AS check_name,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
      AND p.prokind = 'f'
  ) AS ok;

SELECT
  'function_handle_new_user' AS check_name,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
      AND p.prokind = 'f'
  ) AS ok;

-- 2) Trigger on auth.users
SELECT
  'trigger_on_auth_user_created' AS check_name,
  EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) AS ok;

-- 3) RLS enabled on all app tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_roles', 'listings', 'listing_images', 'comments')
ORDER BY tablename;

-- 4) Required policy names and existence
WITH required_policies AS (
  SELECT *
  FROM (
    VALUES
      ('profiles', 'profiles_select_all'),
      ('profiles', 'profiles_insert_own'),
      ('profiles', 'profiles_update_own'),
      ('user_roles', 'roles_select_own'),
      ('user_roles', 'roles_admin_all'),
      ('listings', 'listings_select'),
      ('listings', 'listings_insert'),
      ('listings', 'listings_update'),
      ('listings', 'listings_delete'),
      ('listing_images', 'images_select'),
      ('listing_images', 'images_write'),
      ('listing_images', 'images_delete'),
      ('comments', 'comments_select'),
      ('comments', 'comments_insert'),
      ('comments', 'comments_delete')
  ) AS t(tablename, policyname)
)
SELECT
  rp.tablename,
  rp.policyname,
  EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = rp.tablename
      AND p.policyname = rp.policyname
  ) AS ok
FROM required_policies rp
ORDER BY rp.tablename, rp.policyname;

-- 5) Optional summary block (single-row pass/fail)
WITH checks AS (
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
      AND p.prokind = 'f'
  ) AS is_admin_ok,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
      AND p.prokind = 'f'
  ) AS handle_new_user_ok,
  EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) AS trigger_ok,
  (
    SELECT COUNT(*) = 5
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'user_roles', 'listings', 'listing_images', 'comments')
      AND rowsecurity = true
  ) AS all_rls_enabled,
  (
    SELECT COUNT(*) = 15
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename, policyname) IN (
        ('profiles', 'profiles_select_all'),
        ('profiles', 'profiles_insert_own'),
        ('profiles', 'profiles_update_own'),
        ('user_roles', 'roles_select_own'),
        ('user_roles', 'roles_admin_all'),
        ('listings', 'listings_select'),
        ('listings', 'listings_insert'),
        ('listings', 'listings_update'),
        ('listings', 'listings_delete'),
        ('listing_images', 'images_select'),
        ('listing_images', 'images_write'),
        ('listing_images', 'images_delete'),
        ('comments', 'comments_select'),
        ('comments', 'comments_insert'),
        ('comments', 'comments_delete')
      )
  ) AS all_policies_present
)
SELECT
  is_admin_ok,
  handle_new_user_ok,
  trigger_ok,
  all_rls_enabled,
  all_policies_present,
  (is_admin_ok AND handle_new_user_ok AND trigger_ok AND all_rls_enabled AND all_policies_present) AS all_checks_passed
FROM checks;
