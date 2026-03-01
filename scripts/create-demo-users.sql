BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  user_demo_id uuid;
  admin_demo_id uuid;
BEGIN
  SELECT id INTO user_demo_id
  FROM auth.users
  WHERE email = 'user@demo.com'
  LIMIT 1;

  IF user_demo_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'user@demo.com',
      crypt('demo123', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      false,
      false
    )
    RETURNING id INTO user_demo_id;
  END IF;

  SELECT id INTO admin_demo_id
  FROM auth.users
  WHERE email = 'admin@demo.com'
  LIMIT 1;

  IF admin_demo_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@demo.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      false,
      false
    )
    RETURNING id INTO admin_demo_id;
  END IF;

  INSERT INTO profiles (id, display_name)
  VALUES
    (user_demo_id, 'Demo User'),
    (admin_demo_id, 'Demo Admin')
  ON CONFLICT (id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name;

  INSERT INTO user_roles (user_id, role)
  VALUES
    (user_demo_id, 'user'),
    (admin_demo_id, 'admin')
  ON CONFLICT (user_id)
  DO UPDATE SET
    role = EXCLUDED.role;
END $$;

COMMIT;
