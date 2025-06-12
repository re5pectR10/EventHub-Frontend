# Local Events Hub - Web Application

This is the Next.js web application for the Local Events Hub platform, providing a modern and responsive interface for discovering and booking local events.

## Features Implemented

### Pages

- **Home Page** (`/`) - Landing page with hero section, featured events, and category grid
- **Events Listing** (`/events`) - Comprehensive event search and filtering with pagination
- **Event Detail** (`/events/[slug]`) - Detailed event information with booking options
- **Event Booking** (`/events/[slug]/book`) - Complete ticket booking flow with payment integration
- **Categories** (`/categories`) - Browse events by category
- **Organizers** (`/organizers`) - Browse and search event organizers
- **Sign In** (`/auth/signin`) - User authentication with Supabase
- **Sign Up** (`/auth/signup`) - User registration with email confirmation
- **Error Page** (`/error`) - Authentication error handling

### Components

#### Layout Components

- **Header** - Navigation with responsive mobile menu
- **Footer** - Site footer with links and information

#### UI Components

- **Button** - Reusable button component with variants
- **Input** - Form input component
- **Card** - Content card component
- **Form** - Form components for authentication

#### Feature Components

- **EventCard** - Event display card with image, details, and pricing
- **FeaturedEvents** - Home page featured events section
- **CategoryGrid** - Category browsing grid

### API Integration

The application uses a custom API service (`/lib/api.ts`) that connects to the backend API:

- **Events API** - Fetch events with search, filtering, and pagination
- **Categories API** - Retrieve event categories
- **Organizers API** - Fetch and search event organizers
- **Featured Events** - Get highlighted events for the homepage

### Key Features

#### Event Search & Filtering

- Text search across event titles and descriptions
- Category filtering
- Date range filtering
- Location-based filtering
- Price sorting
- Grid/list view toggle
- Pagination

#### Event Details

- Comprehensive event information
- Image gallery
- Ticket types and pricing
- Organizer information
- Location details
- Social sharing buttons

#### Authentication (Supabase Integration)

- Email/password sign in and sign up with Supabase Auth
- Google OAuth integration
- Email confirmation flow
- Automatic token refresh via middleware
- Protected routes and authentication state management
- User profile data integration
- Form validation and error handling

#### Event Booking

- Interactive ticket selection with quantity controls
- Real-time price calculation
- Attendee information collection
- Authentication-required booking flow
- Order summary and confirmation
- Special requests handling

#### Responsive Design

- Mobile-first approach
- Responsive navigation
- Optimized for all screen sizes
- Touch-friendly interactions

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Supabase** - Authentication and backend services
- **React Query** - Data fetching (ready for implementation)
- **Zustand** - State management (ready for implementation)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   # Create .env.local file
   NEXT_PUBLIC_API_URL=http://localhost:3002/api
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   See `SUPABASE_SETUP.md` for detailed Supabase configuration instructions.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Configuration

The application expects the backend API to be running on `http://localhost:3002/api` by default. This can be configured via the `NEXT_PUBLIC_API_URL` environment variable.

### API Endpoints Used

- `GET /events` - List events with search and filtering
- `GET /events/featured` - Get featured events
- `GET /events/:identifier` - Get single event by ID or slug
- `GET /categories` - List all categories
- `GET /organizers` - List all organizers
- `GET /organizers/:id` - Get single organizer

## Authentication Integration

Full Supabase authentication is implemented with:

- Email/password authentication with email confirmation
- Google OAuth integration (configurable)
- Automatic token refresh via Next.js middleware
- Protected routes and authentication state management
- User profile integration in forms and UI
- Comprehensive error handling and loading states

See `SUPABASE_SETUP.md` for complete setup instructions.

## Styling

The application uses a clean, modern design with:

- Consistent color scheme using CSS custom properties
- Responsive typography
- Smooth animations and transitions
- Accessible form controls
- Loading states and error handling

## Next Steps

1. **Payment Integration** - Add Stripe for actual ticket purchasing (booking flow is ready)
2. **User Dashboard** - Create user profile and booking management pages
3. **Event Creation** - Add organizer dashboard for event management
4. **Real-time Features** - Implement live updates for event availability
5. **Search Enhancement** - Add location-based search with maps integration
6. **Performance Optimization** - Add caching and image optimization
7. **Email Notifications** - Booking confirmations and event reminders

## File Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages (signin, signup, confirm)
│   ├── categories/        # Categories page
│   ├── events/           # Events pages (listing, detail, booking)
│   ├── organizers/       # Organizers page
│   ├── error/            # Error page
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── events/          # Event-specific components
│   ├── home/            # Home page components
│   ├── layout/          # Layout components (header with auth state)
│   └── ui/              # Reusable UI components
├── lib/                 # Utilities and API
│   ├── api.ts          # API service with organizers support
│   └── utils.ts        # Utility functions
├── utils/              # Supabase utilities
│   └── supabase/       # Client, server, and middleware utilities
├── middleware.ts       # Next.js middleware for auth
└── public/             # Static assets
```

This implementation provides a solid foundation for a modern event discovery platform with room for future enhancements and integrations.
