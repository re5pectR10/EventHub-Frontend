# Supabase Deployment Guide

This guide covers deploying migrations, edge functions, and setting up automated processes for the booking application.

## Prerequisites

1. **Supabase CLI** installed globally
2. **GitHub repository** with appropriate secrets configured
3. **MaxMind GeoLite2 License Key** (free from MaxMind)

## Quick Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 4. Deploy migrations

```bash
supabase db push
```

### 5. Deploy edge functions

```bash
# Deploy all functions
supabase functions deploy update-geoip-database --verify-jwt false
supabase functions deploy process-booking
supabase functions deploy send-booking-confirmation
supabase functions deploy webhooks
```

### 6. Set environment variables

```bash
# Set MaxMind license key for GeoIP updates
supabase secrets set MAXMIND_LICENSE_KEY="your_maxmind_license_key"

# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY="your_stripe_secret_key"
```

## Database Schema

The current database includes:

- ✅ **PostGIS Extension**: For geospatial queries
- ✅ **Location Enhancement**: Geography column for accurate distance calculations
- ✅ **Spatial Indexing**: GIST index for efficient nearby event queries
- ✅ **Sync Triggers**: Automatic synchronization between coordinate formats
- ✅ **Nearby Events Function**: SQL function for distance-based event discovery

## Edge Functions

### 1. update-geoip-database

**Purpose**: Downloads and updates GeoLite2 databases weekly

**Features**:

- Downloads GeoLite2-City and GeoLite2-Country databases
- Stores compressed files in Supabase Storage
- Comprehensive logging and error handling
- Automatic bucket creation
- Metadata tracking

**Endpoint**: `https://your-project.supabase.co/functions/v1/update-geoip-database`

**Schedule**: Weekly (Sundays at 2:00 AM UTC) via GitHub Actions

### 2. process-booking & send-booking-confirmation

**Purpose**: Handle booking processing and email confirmations

**Features**:

- Stripe integration for payments
- Ticket generation
- Email notifications
- Database updates

### 3. webhooks

**Purpose**: Handle external webhooks (Stripe, etc.)

## Storage Buckets

### geoip

**Purpose**: Store GeoLite2 database files

**Structure**:

```
geoip/
├── GeoLite2-City.tar.gz      # City-level geolocation data
├── GeoLite2-Country.tar.gz   # Country-level geolocation data
└── metadata.json             # Update metadata and timestamps
```

**Security**: Private bucket, server-side access only

## GitHub Actions Setup

### Required Secrets

Add these secrets to your GitHub repository:

```
# Supabase Configuration
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_PROJECT_ID=your_production_project_id
SUPABASE_STAGING_PROJECT_ID=your_staging_project_id (optional)
SUPABASE_DB_PASSWORD=your_db_password
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STAGING_SERVICE_ROLE_KEY=your_staging_service_role_key (optional)
SUPABASE_STAGING_DB_PASSWORD=your_staging_db_password (optional)

# External Services
MAXMIND_LICENSE_KEY=your_maxmind_license_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Automated Deployments

The GitHub Actions workflow `.github/workflows/deploy-supabase.yml` handles:

- ✅ **Validation**: Checks migration compatibility
- ✅ **Staging Deployment**: Deploys to staging on PRs
- ✅ **Production Deployment**: Deploys to production on main branch
- ✅ **Database Configuration**: Automatically sets cron job settings
- ✅ **Function Deployment**: Deploys all edge functions
- ✅ **Secret Management**: Sets environment variables
- ✅ **Testing**: Validates deployments

## Weekly GeoIP Updates

### Database Cron Jobs (Recommended)

The preferred approach uses Supabase's built-in `pg_cron` extension:

**1. Apply the cron setup migration:**

```bash
supabase db push
```

**2. Configure database settings:**

**Option A: Automatic via GitHub Actions (Recommended)**
If you're using the provided GitHub Actions workflow, the database settings are configured automatically during deployment using the secrets you've set up.

**Option B: Manual configuration**

```sql
-- Set in Supabase Dashboard SQL Editor
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
SELECT pg_reload_conf();
```

**3. Verify and test:**

```sql
-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'weekly-geoip-update';

-- Test manual trigger
SELECT force_geoip_update();
```

**Benefits:**

- ✅ Runs directly in database (no external dependencies)
- ✅ Automatic logging and monitoring
- ✅ Simple manual triggers available
- ✅ Integrated with Supabase ecosystem

📖 **Detailed Setup**: See [CRON_SETUP_GUIDE.md](./CRON_SETUP_GUIDE.md)

### Alternative: GitHub Actions Cron

For external monitoring and enhanced error handling, use the provided GitHub Actions workflow in `.github/workflows/geoip-update.yml`. This runs weekly and provides:

- Smart update detection (skips recent updates)
- Comprehensive status reporting
- Manual trigger capability
- Workflow summaries

### Alternative: External Cron Services

You can also use external services like:

- **Uptime Robot** with webhook monitoring
- **Zapier** with scheduled webhooks
- **IFTTT** with time-based triggers
- **Netlify Functions** with scheduled triggers

## Manual Operations

### Trigger GeoIP Update

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://your-project.supabase.co/functions/v1/update-geoip-database"
```

### Check GeoIP Status

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  "https://your-project.supabase.co/functions/v1/update-geoip-database?action=status"
```

### Database Backup

```bash
supabase db dump --data-only > backup.sql
```

### View Logs

```bash
supabase functions logs update-geoip-database
```

## API Integration

### Location Detection API

The Vercel API routes automatically use the Supabase-stored GeoIP databases:

**Endpoint**: `/api/location/detect`

**Priority Order**:

1. Vercel geolocation headers (production)
2. GeoIP lookup via Supabase storage
3. Fallback to unknown location

### Nearby Events API

**Endpoint**: `/api/events/nearby`

**Parameters**:

- `latitude` (required)
- `longitude` (required)
- `radius` (optional, default: 50km)
- `limit` (optional, default: 20)
- `page` (optional, default: 1)

## Monitoring & Health Checks

### Function Health

Monitor edge function status:

```bash
# Check function deployment
supabase functions list

# View function logs
supabase functions logs update-geoip-database --follow
```

### Database Health

```bash
# Check migration status
supabase migration list

# Validate schema
supabase db diff
```

### Storage Health

```bash
# List storage buckets
supabase storage ls

# Check geoip bucket contents
supabase storage ls geoip
```

## Troubleshooting

### Common Issues

1. **GeoIP Update Fails**

   - Check MaxMind license key
   - Verify storage bucket permissions
   - Check function logs

2. **Migration Errors**

   - Ensure PostGIS extension is enabled
   - Check for conflicting schema changes
   - Verify RLS policies

3. **Function Deployment Fails**
   - Check TypeScript errors
   - Verify import statements
   - Check function timeouts

### Debug Commands

```bash
# Test local functions
supabase functions serve update-geoip-database

# Check local database
supabase db start
supabase db status

# Reset local environment
supabase stop
supabase start
```

## Security Notes

- 🔒 **Service Role Key**: Never expose in client-side code
- 🔒 **GeoIP Storage**: Keep bucket private
- 🔒 **Function Authentication**: Verify JWT tokens where appropriate
- 🔒 **Environment Variables**: Use Supabase secrets for sensitive data

## Performance Optimization

- 📊 **Database Indexing**: Spatial indexes for location queries
- 📊 **Function Caching**: Memory caching for GeoIP data
- 📊 **Storage CDN**: Utilize Supabase CDN for static assets
- 📊 **Query Optimization**: Use geography columns for distance calculations

## Support

For issues with this deployment:

1. Check function logs in Supabase dashboard
2. Review GitHub Actions workflow logs
3. Validate environment variables and secrets
4. Test functions individually with curl

## Next Steps

1. **Set up monitoring** with health check endpoints
2. **Configure alerts** for failed GeoIP updates
3. **Implement backup strategies** for critical data
4. **Scale functions** based on usage patterns
