# Admin Pages Context for Claude

This document provides architectural and UI/UX context for the `/admin` routes in the Reservas Frontend, detailing the structure, authentication flows, and configuration of the back-office interfaces.

## Architecture & Layouts
The `/admin` section is divided into three primary zones, each with its own layout and access controls:

### 1. Global Admin Root (`/admin/layout.tsx`)
- **State Management:** Wraps the entire admin segment in `AdminAuthProvider`.
- **Context API (`AdminAuthContext.tsx`):**
  - Manages session state via hitting `/admin/auth/session` on mount and periodically (every 2 minutes) or on window focus.
  - Distinguishes between standard user representation (`AdminUser` details like name, email, `is_super_admin`) and context-specific roles (`CompanyUser` mapping a user to a specific shop with roles like `OWNER`, `ADMIN`, `STAFF`).
  - Provides `signIn`, `signOut`, and `refreshSession` helpers.

### 2. Shop Dashboard (`/admin/dashboard/layout.tsx`)
This is the main management interface for individual barbershops/salons.
- **Layout Structure:**
  - A responsive sidebar navigation that collapses into a hamburger menu on mobile.
  - A fixed top header showing the current page title and user/auth actions.
- **Role-Based Access Control (RBAC):** Navigation items (and underlying pages) restrict access based on the `CompanyUser` role:
  - `OWNER` / `ADMIN`: Access to Services, Staff, Hours, Theme, Pages, Settings.
  - `STAFF`: Restricted mostly to Dashboard and Bookings views.

### 3. Super Admin Panel (`/admin/super-admin/layout.tsx`)
System-wide management for the platform operators.
- **Access Guard:** Strictly requires `isAuthenticated === true` AND `isSuperAdmin === true`. Redirects standard shop owners back to `/admin/dashboard`.
- **Key Features:** Manages global entities like "Shops" (creating new tenants) and "Service Types" (global taxonomy).

## Core Flows & Pages

### Authentication (`/admin/login/page.tsx`)
- **Flow:** On successful login, routes Super Admins without a shop to `/admin/super-admin`, otherwise routes to `/admin/dashboard`.

### Dashboard Sections (`/admin/dashboard/*`)
The shop management relies on 8 primary sections in the dashboard:

1. **Dashboard Home (`/page.tsx`)**:
   - Greets the user and shows their role.
   - Contains a grid for statistics (Bookings, Services, Staff counts) and quick links to their public shop page.
2. **Bookings (`/bookings/page.tsx`)**:
   - The operational core for staff. Includes Calendar and List view toggles.
   - Filtering by Staff and Booking Status (Pending, Confirmed, Completed, Cancelled, No Show).
   - Interactive modals for creating new bookings and viewing/updating details in a slide-out sheet.
3. **Services (`/services/page.tsx`)**:
   - Manages service offerings and categories.
   - Features a desktop table view and a mobile-friendly card view.
   - Handles pricing, durations, descriptions, and active/inactive toggles.
4. **Staff (`/staff/page.tsx`)**:
   - Manages team members.
   - Allows inviting new staff by email, configuring their bio, uploading profile photos, assigning services they can perform, and setting them as "bookable".
5. **Hours (`/hours/page.tsx`)**:
   - Configures the standard 7-day business hours.
   - Supports multiple open/close time slots per day and full-day "closed" toggles. Includes overlap and logic validation.
6. **Theme (`/theme/page.tsx`)**:
   - Configures the visual identity of the public shop page.
   - Allows setting primary `brandColor`, `pageBackgroundColor` and `pageBackgroundPreset` (Light/Dark/Auto), `fontPreset`, and structural styling like `cornerRadius` and `cardsElevated`.
   - Includes a live `ThemePreview` component to see changes immediately.
7. **Pages (`/page-management/page.tsx`)**:
   - Manages branding and content text/images.
   - Tabbed interface to edit Hero images, "About Us" and "Our Story" text, gallery pictures, and the company logo. Handles image uploads seamlessly.
8. **Settings (`/settings/page.tsx`)**:
   - **General:** Company name, slug, contact info (email, phone), address, and active status.
   - **Location:** Google Maps embed URL integration (auto-extracts lat/long).
   - **Booking Rules:** Configures limits like buffer times, time slot intervals, and cancellation/reschedule limits.
   - **Payments & Notifications:** Toggles cash and QR payments (with QR upload) and enables email/WhatsApp notifications.

## UI/UX & Visual Feel
The admin panels contrast with the highly-themed public shop pages by prioritizing productivity, data density, and a neutral, professional aesthetic.

- **Clean & Utilitarian Design:** Uses a cool `slate` color palette (`bg-slate-100` backgrounds, `slate-900` text) to ensure data is easy to read. 
- **Component System:** Heavily relies on shadcn/ui components (Cards, Tabs, Select dropdowns, Badges, Sheets) for consistent interactions.
- **Mobile Responsiveness:** Dense grids (like the Calendar or Services table) gracefully fallback to stackable lists or scrollable cards on narrow viewports.
- **Action-Oriented:** Primary actions use the dynamic `brand` (typically an energetic orange/brand color) to draw the eye naturally, while secondary filters use subtle outlines.
- **Data Validation & Feedback:** Uses standardized `Loader2` spinners, inline red error text, and toast/notification banners to confirm successful saves or prevent invalid configurations (especially in Hours and Settings).
