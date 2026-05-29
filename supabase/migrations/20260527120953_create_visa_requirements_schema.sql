/*
  # Create Visa Requirements & Google Drive Integration Schema

  1. New Tables
    - `requirements`: Tracks visa document requirements with dependencies
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, document name)
      - `phase` (integer, 1-4 for DIY/Bank/University/Embassy)
      - `status` (text, pending/in_progress/completed)
      - `dependency_id` (uuid, nullable, points to another requirement)
      - `gdrive_file_id` (text, nullable, Google Drive file reference)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `google_drive_auth`: Stores Google Drive OAuth tokens per user
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `app_folder_id` (text, nullable, app's dedicated folder ID)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only view/edit their own requirements and drive auth
    - Service role can manage app folder creation

  3. Sample Data
    - Pre-populate requirements with standard visa roadmap phases
*/

CREATE TABLE IF NOT EXISTS requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phase integer NOT NULL CHECK (phase >= 1 AND phase <= 4),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  dependency_id uuid REFERENCES requirements(id) ON DELETE SET NULL,
  gdrive_file_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS google_drive_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  app_folder_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requirements"
  ON requirements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requirements"
  ON requirements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requirements"
  ON requirements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requirements"
  ON requirements
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own drive auth"
  ON google_drive_auth
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive auth"
  ON google_drive_auth
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive auth"
  ON google_drive_auth
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_requirements_user_phase ON requirements(user_id, phase);
CREATE INDEX idx_requirements_dependency ON requirements(dependency_id);
CREATE INDEX idx_gdrive_auth_user ON google_drive_auth(user_id);
