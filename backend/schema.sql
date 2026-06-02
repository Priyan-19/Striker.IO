-- ============================================================
-- Striker.IO - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- NOTE: When using Django with Supabase, Django will manage
-- its own migration tables. This schema is for reference only.
-- Django migrations will create the actual tables.
-- Use: python manage.py migrate

-- For manual Supabase inspection, here is the intended schema:

-- profiles (auto-created via Django's auth_user)
-- tasks
-- striker_app_task:
--   id, user_id, name, color_theme, icon, is_active, created_at

-- daily_logs
-- striker_app_dailylog:
--   id, task_id, user_id, logged_date, message, created_at

-- To create indexes manually in Supabase:
CREATE INDEX IF NOT EXISTS idx_dailylog_user_date
    ON striker_app_dailylog (user_id, logged_date);

CREATE INDEX IF NOT EXISTS idx_task_user
    ON striker_app_task (user_id);
