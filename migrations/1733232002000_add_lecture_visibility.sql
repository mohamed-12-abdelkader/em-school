-- Up Migration
-- إضافة أعمدة is_visible و updated_at إلى جدول المحاضرات lectures
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Down Migration
-- حذف الأعمدة المضافة إذا لزم الأمر
ALTER TABLE lectures DROP COLUMN IF EXISTS is_visible;
ALTER TABLE lectures DROP COLUMN IF EXISTS updated_at;
