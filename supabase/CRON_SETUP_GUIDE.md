# GeoIP Cron Setup Guide

This guide explains how to set up and configure the GeoIP database update cron jobs after running the `20241222000001_setup_geoip_cron.sql` migration.

## Prerequisites

1. ✅ Run the migration: `supabase db push`
2. ✅ Deploy the `update-geoip-database` Edge Function
3. ✅ Set up your MaxMind license key in Edge Function secrets

## Step 1: Configure Database Settings

> **Note**: If you're using the GitHub Actions deployment workflow (`.github/workflows/deploy-supabase.yml`), this step is **automatically handled** during deployment. Skip to Step 2.

After running the migration, you need to set the Supabase URL and Service Role Key as database configuration parameters.

### Option A: Using Supabase Dashboard SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Run the following SQL commands (replace with your actual values):

```sql
-- Set your Supabase project URL
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- Set your service role key (get this from Project Settings > API)
ALTER DATABASE postgres SET app.service_role_key = 'eyJ...your-service-role-key';

-- Reload configuration to apply changes
SELECT pg_reload_conf();
```

### Option B: Using Supabase CLI

```bash
# Connect to your database
supabase db connect

# Run the configuration commands
psql -c "ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';"
psql -c "ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';"
psql -c "SELECT pg_reload_conf();"
```

## Step 2: Verify Cron Job Setup

Check that the cron job was created successfully:

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- Check specifically for the GeoIP update job
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'weekly-geoip-update';
```

Expected output:

```
     jobname        | schedule  | active
--------------------+-----------+--------
 weekly-geoip-update| 0 2 * * 0 | t
```

## Step 3: Test Manual Trigger

Test the setup by manually triggering an update:

```sql
-- Test the basic trigger function
SELECT trigger_geoip_update('test');

-- Test the force update function
SELECT force_geoip_update();

-- Test with logging
SELECT trigger_geoip_update_with_logging('manual_test');
```

## Step 4: Monitor Execution

### Check Cron Job History

```sql
-- View recent cron job executions
SELECT * FROM cron.job_run_details
WHERE jobname = 'weekly-geoip-update'
ORDER BY start_time DESC
LIMIT 10;
```

### Check GeoIP Update Logs

```sql
-- View recent GeoIP update attempts
SELECT * FROM public.geoip_update_status
LIMIT 10;

-- Check for any errors
SELECT * FROM public.geoip_update_log
WHERE success = false
ORDER BY triggered_at DESC;
```

### Check HTTP Request Status

```sql
-- Check pg_net HTTP response logs
SELECT id, status_code, content, error_msg, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
```

## Available Functions

After the migration, you have these functions available:

### 1. `trigger_geoip_update(source)`

```sql
-- Trigger an update with a custom source identifier
SELECT trigger_geoip_update('manual');
SELECT trigger_geoip_update('admin');
```

### 2. `force_geoip_update()`

```sql
-- Quick force update (convenience function)
SELECT force_geoip_update();
```

### 3. `trigger_geoip_update_with_logging(source)`

```sql
-- Trigger update with automatic logging to geoip_update_log table
SELECT trigger_geoip_update_with_logging('manual');
```

## Scheduling Details

- **Schedule**: Every Sunday at 2:00 AM UTC (`0 2 * * 0`)
- **Timeout**: 2.5 minutes (150,000 milliseconds)
- **Retry**: No automatic retry (you can implement this if needed)

## Troubleshooting

### Cron Job Not Running

1. **Check if cron extension is enabled:**

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check if job is active:**

   ```sql
   UPDATE cron.job SET active = true WHERE jobname = 'weekly-geoip-update';
   ```

3. **Check database configuration:**
   ```sql
   SELECT name, setting FROM pg_settings
   WHERE name IN ('app.supabase_url', 'app.service_role_key');
   ```

### HTTP Requests Failing

1. **Check Edge Function is deployed:**

   - Go to Supabase Dashboard > Edge Functions
   - Verify `update-geoip-database` is deployed and active

2. **Check service role key permissions:**

   - Go to Project Settings > API
   - Verify the service role key is correct

3. **Check function logs:**
   ```sql
   SELECT * FROM net._http_response
   WHERE status_code >= 400
   ORDER BY created DESC;
   ```

### Configuration Issues

1. **Reset configuration:**

   ```sql
   ALTER DATABASE postgres RESET app.supabase_url;
   ALTER DATABASE postgres RESET app.service_role_key;
   -- Then set them again with correct values
   ```

2. **Check current settings:**
   ```sql
   SHOW app.supabase_url;
   SHOW app.service_role_key;
   ```

## Security Notes

- ✅ Service role key is stored as database configuration (not in code)
- ✅ Functions use `SECURITY DEFINER` for controlled access
- ✅ RLS policies protect the log table
- ✅ Only authenticated users can execute functions
- ✅ HTTP requests include proper authorization headers

## Next Steps

1. **Monitor the first scheduled run** (next Sunday at 2:00 AM UTC)
2. **Set up alerting** for failed updates (optional)
3. **Review logs regularly** to ensure smooth operation
4. **Update MaxMind license key** before it expires

## Useful Queries

```sql
-- Check next scheduled run
SELECT jobname, schedule,
       CASE
         WHEN schedule = '0 2 * * 0' THEN
           date_trunc('week', now()) + interval '1 week' + interval '2 hours'
         ELSE 'Custom schedule'
       END as next_run
FROM cron.job
WHERE jobname = 'weekly-geoip-update';

-- View all GeoIP-related tables and functions
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE tablename LIKE '%geoip%';

SELECT schemaname, proname, proowner
FROM pg_proc
WHERE proname LIKE '%geoip%';
```
