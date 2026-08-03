-- Reset the public schema so Drizzle migrations can apply cleanly from 0000.
--
-- WHY THIS EXISTS
-- The Render production database drifted into a half-built state: 3 of 18 tables
-- existed (users, devices, notifications), all 15 enum types existed, but the
-- drizzle.__drizzle_migrations ledger was empty. That combination means the schema
-- was created by `drizzle-kit push` rather than the migration runner, and stopped
-- partway. Running `db:migrate` against it fails with "relation already exists",
-- while the app fails with `column "notifications_enabled" does not exist`.
--
-- SAFETY
-- Verified before writing this: users=0, devices=0, notifications=0 rows.
-- This script DESTROYS ALL DATA in the public schema. Do not run it against a
-- database that holds anything you want to keep. Check row counts first:
--   select 'users', count(*) from users
--   union all select 'devices', count(*) from devices
--   union all select 'notifications', count(*) from notifications;
--
-- The plpgsql extension is unaffected (it is not owned by the public schema).

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS drizzle CASCADE;

CREATE SCHEMA public;

-- Restore default grants. On PG15+ the recreated schema is owned by whoever runs
-- this, so the app role needs them re-granted explicitly.
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO PUBLIC;

COMMIT;
