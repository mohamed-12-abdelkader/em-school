-- WhatsApp number for parent notifications (separate from login phone).
ALTER TABLE parents ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

CREATE INDEX IF NOT EXISTS idx_parents_whatsapp_number
  ON parents (school_id, whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;
