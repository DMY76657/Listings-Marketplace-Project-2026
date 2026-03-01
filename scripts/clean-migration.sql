BEGIN;

-- =====================================================
-- 1) Drop all existing policies on app tables
-- =====================================================
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'user_roles', 'listings', 'listing_images', 'comments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END $$;

-- =====================================================
-- 2) Drop existing functions
-- =====================================================
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- 3) Drop existing trigger
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =====================================================
-- 4) Re-create functions
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5) Re-create RLS policies
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_all
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- user_roles
CREATE POLICY roles_select_own
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY roles_admin_all
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- listings
CREATE POLICY listings_select
ON public.listings
FOR SELECT
USING (
  status = 'published'
  OR owner_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY listings_insert
ON public.listings
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY listings_update
ON public.listings
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY listings_delete
ON public.listings
FOR DELETE
USING (
  owner_id = auth.uid()
  OR public.is_admin()
);

-- listing_images
CREATE POLICY images_select
ON public.listing_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = listing_id
      AND (
        l.status = 'published'
        OR l.owner_id = auth.uid()
        OR public.is_admin()
      )
  )
);

CREATE POLICY images_write
ON public.listing_images
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

CREATE POLICY images_delete
ON public.listing_images
FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);

-- comments
CREATE POLICY comments_select
ON public.comments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY comments_insert
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY comments_delete
ON public.comments
FOR DELETE
USING (
  auth.uid() = author_id
  OR public.is_admin()
);

COMMIT;
