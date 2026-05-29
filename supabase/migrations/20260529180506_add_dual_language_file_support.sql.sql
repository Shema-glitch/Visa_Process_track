/*
  # Add Dual-Language File Support

  1. Database Changes
    - Add `requires_dual_language` boolean to requirements table
    - Remove `gdrive_file_id` from requirements table (moved to attachments)
  
  2. New Table: `requirement_attachments`
    - Tracks individual file uploads per requirement
    - Supports language tags: "English", "Kinyarwanda", "Universal"
    - Allows multiple files per requirement (for dual-language docs)
  
  3. Migration Strategy
    - Create new attachments table
    - Migrate existing gdrive_file_id data to attachments (as Universal)
    - Drop old column from requirements
    - Add dual-language flag
  
  4. Security
    - Enable RLS on attachments table
    - Users can only access their own attachments
*/

-- Step 1: Create attachments table
CREATE TABLE IF NOT EXISTS requirement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gdrive_file_id text NOT NULL,
  filename text NOT NULL,
  language_tag text NOT NULL CHECK (language_tag IN ('English', 'Kinyarwanda', 'Universal')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requirement_id, language_tag)
);

-- Step 2: Migrate existing data
INSERT INTO requirement_attachments (requirement_id, user_id, gdrive_file_id, filename, language_tag)
SELECT 
  id,
  user_id,
  gdrive_file_id,
  'Uploaded File' as filename,
  'Universal' as language_tag
FROM requirements
WHERE gdrive_file_id IS NOT NULL;

-- Step 3: Add dual-language flag to requirements
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requires_dual_language boolean DEFAULT false;

-- Step 4: Mark specific requirements as dual-language
UPDATE requirements
SET requires_dual_language = true
WHERE name ILIKE ANY(ARRAY[
  '%birth certificate%',
  '%criminal record%',
  '%police clearance%',
  '%identity card%',
  '%national id%'
]);

-- Step 5: Remove old gdrive_file_id column (data already migrated)
ALTER TABLE requirements DROP COLUMN IF EXISTS gdrive_file_id;

-- Step 6: Enable RLS on attachments
ALTER TABLE requirement_attachments ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for attachments
CREATE POLICY "Users can view own attachments"
  ON requirement_attachments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON requirement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments"
  ON requirement_attachments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON requirement_attachments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 8: Add indexes for performance
CREATE INDEX idx_attachments_requirement ON requirement_attachments(requirement_id);
CREATE INDEX idx_attachments_user ON requirement_attachments(user_id);
CREATE INDEX idx_attachments_language ON requirement_attachments(language_tag);

-- Step 9: Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON requirement_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
