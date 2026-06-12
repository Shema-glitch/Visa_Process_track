/*
  # Create Requirement Templates & Centralize Configuration

  1. New Tables
    - `requirement_templates`: Stores the blueprint for common visa requirements
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `phase` (integer, 1-4)
      - `requires_dual_language` (boolean)
      - `category` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Templates are readable by all authenticated users
    - Write access restricted to service role
*/

CREATE TABLE IF NOT EXISTS requirement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  phase integer NOT NULL CHECK (phase >= 1 AND phase <= 4),
  requires_dual_language boolean NOT NULL DEFAULT false,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE requirement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are viewable by everyone"
  ON requirement_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed initial data
INSERT INTO requirement_templates (name, phase, requires_dual_language, category) VALUES
('Passport', 1, false, 'Identity'),
('Motivation Letter', 1, false, 'Identity'),
('Birth Certificate', 2, true, 'Vital Documents'),
('Criminal Record', 2, true, 'Vital Documents'),
('Certificate of Being Alive', 2, true, 'Vital Documents'),
('Health Checkup', 2, false, 'Health'),
('Bank Statement', 3, false, 'Financial'),
('Sponsorship Letter', 3, false, 'Financial'),
('Tuition Fee Receipt', 3, false, 'Academic'),
('Letter of Acceptance', 3, false, 'Academic')
ON CONFLICT (name) DO UPDATE SET
  phase = EXCLUDED.phase,
  requires_dual_language = EXCLUDED.requires_dual_language,
  category = EXCLUDED.category;
