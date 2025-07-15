-- This migration schedules the event-aggregator function to run hourly.

-- Up Migration
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'event-aggregator-job',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:=(SELECT
          CASE
            WHEN current_setting('app.supabase_url') IS NOT NULL AND current_setting('app.service_role_key') IS NOT NULL THEN
              current_setting('app.supabase_url') || '/functions/v1/event-aggregator'
            ELSE
              'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/event-aggregator' -- Placeholder for local development
          END
        ),
        headers:=(SELECT
          CASE
            WHEN current_setting('app.supabase_url') IS NOT NULL AND current_setting('app.service_role_key') IS NOT NULL THEN
              '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
            ELSE
              '{"Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb -- Placeholder for local development
          END
        )
    );
    $$
);

-- Down Migration
SELECT cron.unschedule('event-aggregator-job');