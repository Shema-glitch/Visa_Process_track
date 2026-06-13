-- Migration: add app_folder_id to google_drive_auth and store expires_at properly
-- The upload-to-drive Edge Function reads and writes app_folder_id to cache the 
-- "Visa Vault Archive" Drive folder ID so it doesn't create duplicates on each upload.
-- Without this column the upsert silently drops the field and every upload re-creates
-- a new folder, eventually hitting Drive quota limits.

ALTER TABLE public.google_drive_auth
  ADD COLUMN IF NOT EXISTS app_folder_id text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill: set expires_at for existing rows to NOW so the next upload
-- triggers a refresh rather than using an already-expired token blindly.
UPDATE public.google_drive_auth
SET expires_at = now()
WHERE expires_at IS NULL;
