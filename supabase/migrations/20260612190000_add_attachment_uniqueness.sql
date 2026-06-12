-- Add unique constraint to requirement_attachments to allow for upsert operations
-- specifically for (requirement_id, language_tag) to ensure one file per language per requirement.

ALTER TABLE public.requirement_attachments 
ADD CONSTRAINT requirement_attachments_id_lang_unique 
UNIQUE (requirement_id, language_tag);
