# Supabase Authentication Setup

This guide will help you set up Supabase authentication for the Local Events Hub application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and npm installed

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: "Local Events Hub" (or your preferred name)
   - Database Password: Generate a secure password
   - Region: Choose the closest to your users
5. Click "Create new project"

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL
   - Project API Key (anon, public)

### 3. Configure Environment Variables

Create a `.env.local` file in the `apps/web` directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

### 4. Configure Authentication Providers

#### Email Authentication (Default)

Email authentication is enabled by default. Users can sign up and sign in with email/password.

#### Google OAuth (Optional)

To enable Google sign-in:

1. In Supabase dashboard, go to Authentication > Providers
2. Find Google and click the toggle to enable it
3. You'll need to set up Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### 5. Configure Email Templates (Optional)

1. Go to Authentication > Email Templates
2. Customize the email templates for:
   - Confirm signup
   - Reset password
   - Magic link

### 6. Set Up Row Level Security (RLS)

If you're storing user data in Supabase, set up RLS policies:

```sql
-- Enable RLS on your tables
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON your_table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON your_table_name
  FOR UPDATE USING (auth.uid() = user_id);
```

## Features Implemented

### Authentication Pages

- **Sign In** (`/auth/signin`): Email/password and Google OAuth
- **Sign Up** (`/auth/signup`): User registration with email confirmation
- **Error Page** (`/error`): Handles authentication errors

### Authentication Flow

1. User signs up with email/password or Google
2. Email confirmation sent (for email signup)
3. User confirms email via link
4. User can sign in and access protected features
5. Authentication state managed globally via header component

### Protected Features

- Event booking requires authentication
- User profile information auto-populated in forms
- Persistent login state across page refreshes

### Security Features

- Secure token management via HTTP-only cookies
- Automatic token refresh via middleware
- Protected routes redirect to sign-in when needed

## Testing Authentication

1. Start your development server: `npm run dev`
2. Navigate to `/auth/signup`
3. Create a test account
4. Check your email for confirmation (if using email auth)
5. Sign in at `/auth/signin`
6. Verify the header shows your user info
7. Try booking an event to test protected functionality

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check your environment variables
2. **Email not sending**: Verify email settings in Supabase dashboard
3. **Google OAuth not working**: Check redirect URIs and credentials
4. **User not persisting**: Check middleware configuration

### Debug Mode

Add this to your component to debug auth state:

```tsx
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event, session);
  });
}, []);
```

## Production Deployment

1. Update environment variables with production Supabase URL
2. Configure production OAuth redirect URIs
3. Set up custom domain for email templates
4. Review and test all authentication flows
5. Monitor authentication metrics in Supabase dashboard

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
