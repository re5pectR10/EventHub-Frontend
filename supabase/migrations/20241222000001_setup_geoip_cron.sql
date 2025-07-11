-- Enable pg_cron extension for scheduling recurring jobs
-- This extension allows us to schedule database-driven cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from database
-- This is required for making HTTP calls to Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to trigger GeoIP database updates
-- This function can be called manually or by cron jobs
CREATE OR REPLACE FUNCTION trigger_geoip_update(
  p_source TEXT DEFAULT 'manual'
)
RETURNS jsonb AS $$
DECLARE
  v_request_id bigint;
  v_function_url text;
  v_service_key text;
BEGIN
  -- Get the Supabase project URL and service role key from pg_settings
  -- These should be set as database configuration parameters
  SELECT setting INTO v_function_url 
  FROM pg_settings 
  WHERE name = 'app.supabase_url';
  
  SELECT setting INTO v_service_key 
  FROM pg_settings 
  WHERE name = 'app.service_role_key';
  
  -- If settings are not found, return error
  IF v_function_url IS NULL OR v_service_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing Supabase configuration. Please set app.supabase_url and app.service_role_key',
      'timestamp', now()
    );
  END IF;
  
  -- Construct the full Edge Function URL
  v_function_url := v_function_url || '/functions/v1/update-geoip-database';
  
  -- Make HTTP request to the GeoIP update Edge Function
  SELECT net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'source', p_source,
      'timestamp', now()
    ),
    timeout_milliseconds := 150000  -- 2.5 minutes timeout
  ) INTO v_request_id;
  
  -- Return success response with request details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'GeoIP update request initiated',
    'source', p_source,
    'request_id', v_request_id,
    'timestamp', now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any errors and return them
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment to the function
COMMENT ON FUNCTION trigger_geoip_update(TEXT) IS 
'Triggers GeoIP database update via Edge Function. Can be called manually or by cron jobs.';

-- Create a convenience function for manual force updates
CREATE OR REPLACE FUNCTION force_geoip_update()
RETURNS jsonb AS $$
BEGIN
  RETURN trigger_geoip_update('force_update');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION force_geoip_update() IS 
'Manually triggers a force update of GeoIP databases.';

-- Schedule the weekly GeoIP update cron job
-- This runs every Sunday at 2:00 AM UTC
-- Note: The cron job will be created but won't work until the configuration is set
SELECT cron.schedule(
  'weekly-geoip-update',           -- Job name
  '0 2 * * 0',                     -- Sunday at 2:00 AM UTC
  $$
    SELECT trigger_geoip_update('cron');
  $$
);

-- Create a table to track GeoIP update history (optional but useful)
CREATE TABLE IF NOT EXISTS public.geoip_update_log (
  id SERIAL PRIMARY KEY,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL,
  request_id BIGINT,
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB
);

-- Add RLS policy for the log table (only accessible by authenticated users)
ALTER TABLE public.geoip_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read geoip logs" 
ON public.geoip_update_log 
FOR SELECT 
TO authenticated 
USING (true);

-- Create a function to log update attempts
CREATE OR REPLACE FUNCTION log_geoip_update(
  p_source TEXT,
  p_request_id BIGINT DEFAULT NULL,
  p_success BOOLEAN DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.geoip_update_log (
    source, request_id, success, error_message, metadata
  ) VALUES (
    p_source, p_request_id, p_success, p_error_message, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a view to easily check recent update status
CREATE OR REPLACE VIEW public.geoip_update_status AS
SELECT 
  id,
  triggered_at,
  source,
  request_id,
  success,
  error_message,
  metadata,
  triggered_at::date as update_date,
  CASE 
    WHEN triggered_at > now() - interval '7 days' THEN 'recent'
    WHEN triggered_at > now() - interval '30 days' THEN 'old'
    ELSE 'very_old'
  END as recency
FROM public.geoip_update_log
ORDER BY triggered_at DESC;

COMMENT ON VIEW public.geoip_update_status IS 
'Shows GeoIP update history with recency indicators';

-- Create an enhanced trigger function that includes logging
CREATE OR REPLACE FUNCTION trigger_geoip_update_with_logging(
  p_source TEXT DEFAULT 'manual'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_request_id bigint;
BEGIN
  -- Call the main trigger function
  SELECT trigger_geoip_update(p_source) INTO v_result;
  
  -- Extract request_id if available
  SELECT (v_result->>'request_id')::bigint INTO v_request_id;
  
  -- Log the attempt
  PERFORM log_geoip_update(
    p_source,
    v_request_id,
    (v_result->>'success')::boolean,
    v_result->>'error',
    v_result
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the cron job to use the logging version
SELECT cron.unschedule('weekly-geoip-update');

SELECT cron.schedule(
  'weekly-geoip-update',           -- Job name
  '0 2 * * 0',                     -- Sunday at 2:00 AM UTC
  $$
    SELECT trigger_geoip_update_with_logging('cron');
  $$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_geoip_update(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION force_geoip_update() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_geoip_update_with_logging(TEXT) TO authenticated;
GRANT SELECT ON public.geoip_update_log TO authenticated;
GRANT SELECT ON public.geoip_update_status TO authenticated; 