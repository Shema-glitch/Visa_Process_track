-- ============================================================
-- Admin Role Setup
-- ============================================================
-- This migration updates the admin check to use JWT metadata
-- instead of email comparison. This is more secure because:
--   1. The is_admin flag is embedded in the JWT token (tamper-proof)
--   2. It's set server-side via auth.users metadata
--   3. It can't be changed by the user
-- ============================================================

-- Drop the old email-based admin function
drop function if exists public.is_admin();

-- Create new admin check based on JWT metadata
-- This reads from the verified JWT, not from any user-editable table
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
    false
  )
$$ language sql security definer stable;

-- The existing RLS policies reference is_admin(), so they automatically
-- use the new implementation. No policy changes needed.

-- ============================================================
-- IMPORTANT: After running this migration, you must:
--
-- 1. Create the admin user in Supabase Dashboard:
--    → Authentication → Users → Invite user
--    → Enter your admin email
--    → After creation, click the user → Set password
--    → Use the same value as ADMIN_SECRET for the password
--
-- 2. Set the admin metadata on that user:
--    Run this in SQL Editor (replace the email):
--
--    UPDATE auth.users
--    SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
--    WHERE email = 'your-admin@email.com';
--
-- 3. Set Edge Function secrets:
--    supabase secrets set ADMIN_SECRET=your-secret-here
--    supabase secrets set ADMIN_EMAIL=your-admin@email.com
-- ============================================================
