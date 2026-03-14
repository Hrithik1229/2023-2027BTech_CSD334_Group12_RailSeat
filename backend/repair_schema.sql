-- ============================================================
-- repair_schema.sql  —  Run this ONCE to fix the database
-- 
-- Purpose: Restore columns that Sequelize's alter:true may have
-- dropped, and add new columns required by the app.
--
-- How to run in pgAdmin:
--   Open the Query Tool, paste this entire file, click ▶ Run.
-- Or from command line:
--   psql -U postgres -d train_booking -f repair_schema.sql
-- ============================================================

-- ── 1. Restore superfast_charge on fare_rules (may have been dropped) ─────────
ALTER TABLE fare_rules
  ADD COLUMN IF NOT EXISTS superfast_charge NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Update existing rows with correct superfast charges
UPDATE fare_rules SET superfast_charge = 30 WHERE train_type = 'SUPERFAST' AND coach_type = 'SL' AND superfast_charge = 0;
UPDATE fare_rules SET superfast_charge = 45 WHERE train_type = 'SUPERFAST' AND coach_type = '3A' AND superfast_charge = 0;
UPDATE fare_rules SET superfast_charge = 45 WHERE train_type = 'SUPERFAST' AND coach_type = '2A' AND superfast_charge = 0;
UPDATE fare_rules SET superfast_charge = 75 WHERE train_type = 'SUPERFAST' AND coach_type = '1A' AND superfast_charge = 0;
UPDATE fare_rules SET superfast_charge = 45 WHERE train_type = 'SUPERFAST' AND coach_type = 'CC' AND superfast_charge = 0;
UPDATE fare_rules SET superfast_charge = 55 WHERE train_type = 'SUPERFAST' AND coach_type = 'AC' AND superfast_charge = 0;

-- ── 2. Add new Booking columns (required by app) ──────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gen_ticket          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gen_validity_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gen_validity_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_downloadable     BOOLEAN     NOT NULL DEFAULT true;

-- ── 3. Verify ─────────────────────────────────────────────────────────────────
SELECT 'fare_rules columns:' AS check;
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_name = 'fare_rules'
ORDER  BY ordinal_position;

SELECT 'bookings new columns:' AS check;
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_name = 'bookings'
AND    column_name IN ('gen_ticket','gen_validity_start','gen_validity_end','is_downloadable')
ORDER  BY column_name;
