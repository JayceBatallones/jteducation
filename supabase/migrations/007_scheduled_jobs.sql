-- Enable pg_cron extension for scheduled jobs
-- Note: pg_cron must be enabled in Supabase dashboard first

-- Create a table to track job runs
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL,
    result JSONB,
    error_message TEXT
);

-- Create index for querying job history
CREATE INDEX IF NOT EXISTS idx_job_runs_name_date ON scheduled_job_runs(job_name, run_at DESC);

-- Function to clean up old job runs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_runs()
RETURNS void AS $$
BEGIN
    DELETE FROM scheduled_job_runs
    WHERE run_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to expire pending customers after 14 days
CREATE OR REPLACE FUNCTION expire_pending_customers()
RETURNS void AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update users who have been pending for more than 14 days
    WITH expired AS (
        UPDATE profiles
        SET status = 'inactive_customer'
        WHERE status = 'pending_customer'
        AND created_at < NOW() - INTERVAL '14 days'
        RETURNING id, status
    )
    SELECT COUNT(*) INTO expired_count FROM expired;

    -- Log the change in status history
    INSERT INTO user_status_history (user_id, old_status, new_status, reason)
    SELECT
        id,
        'pending_customer',
        'inactive_customer',
        'Auto-expired: payment pending for 14+ days'
    FROM profiles
    WHERE status = 'inactive_customer'
    AND id NOT IN (
        SELECT user_id FROM user_status_history
        WHERE new_status = 'inactive_customer'
        AND reason LIKE 'Auto-expired%'
    );

    -- Log the job run
    INSERT INTO scheduled_job_runs (job_name, status, result)
    VALUES ('expire_pending_customers', 'success', jsonb_build_object('expired_count', expired_count));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired not-attending tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM not_attending_tokens
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    INSERT INTO scheduled_job_runs (job_name, status, result)
    VALUES ('cleanup_expired_tokens', 'success', jsonb_build_object('deleted_count', deleted_count));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add changed_at column to user_status_history if missing
ALTER TABLE user_status_history
ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Note: The following cron jobs need to be created via Supabase Dashboard or supabase CLI:
--
-- 1. Send 24-hour reminders (runs every hour at :00)
--    SELECT cron.schedule('send-24h-reminders', '0 * * * *', $$
--      SELECT net.http_post(
--        url:='https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders',
--        body:='{"type": "24h"}'::jsonb,
--        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--    $$);
--
-- 2. Send 1-hour reminders (runs every hour at :00)
--    SELECT cron.schedule('send-1h-reminders', '0 * * * *', $$
--      SELECT net.http_post(
--        url:='https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders',
--        body:='{"type": "1h"}'::jsonb,
--        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--    $$);
--
-- 3. Expire pending customers (runs daily at midnight)
--    SELECT cron.schedule('expire-pending-customers', '0 0 * * *', $$SELECT expire_pending_customers()$$);
--
-- 4. Cleanup expired tokens (runs daily at 1am)
--    SELECT cron.schedule('cleanup-expired-tokens', '0 1 * * *', $$SELECT cleanup_expired_tokens()$$);
--
-- 5. Calendar reconciliation (runs hourly at :30)
--    SELECT cron.schedule('calendar-reconciliation', '30 * * * *', $$
--      SELECT net.http_post(
--        url:='https://YOUR_PROJECT.supabase.co/functions/v1/calendar-sync',
--        body:='{"action": "reconcile"}'::jsonb,
--        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--    $$);
