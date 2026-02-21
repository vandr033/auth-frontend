# Shop Pages Context for Claude

This document provides architectural context for the `/shop` routes in the Reservas Frontend, detailing the structure of pages, sections, configuration points, and how the white-labeled theme is applied.

## Architecture & Layout
The `/shop/[slug]` routes serve as a public-facing, white-labeled storefront for barbershops. All data fetching and theming are managed globally at the layout level via `ShopContext`.

**Files:**
- `app/shop/[slug]/layout.tsx` - Wraps all shop paths with `ShopProvider` and `ShopNavbar`.
- `app/shop/contexts/ShopContext.tsx` - Fetches the `/company/${slug}` payload from the API. Populates the global state with `company`, `categories`, `services`, `staff`, `hours`, `settings`, and `theme`, then dynamically applies the theme CSS.
- `components/ShopNavbar.tsx` - Responsive navbar supporting Desktop and Mobile menus, displaying the company logo, navigation links, and the authenticated user's dropdown.

## Theming & Styling
The shop pages are styled dynamically based on the company's preferences to provide a white-labeled experience.

- **How it's applied:** The `ShopProvider` reads the `data.theme` object and calls `computeTheme()` (from `@/utils/themepicker`). This function calculates contrast colors and injects specific CSS variables directly into the root element (`document.documentElement.style`). When unmounted, it resets to the main site theme.
- **CSS Variables:** The Tailwind setup uses semantic variables like `--brand`, `--page`, `--surface`, `--section`, `--text-main`, `--text-muted`, and `--surface-border`. These override default globals allowing customized looks per shop.
- **Configurable Theme Fields:**
  - `brand_color`: Primary background/text color for buttons, active links, checkmarks.
  - `page_background_color`: Custom background color.
  - `page_background_preset`: Auto/Light/Dark mode bias.
  - `cards_elevated`: Boolean determining if cards have drop shadows.
  - `corner_radius`: Used to set rounded corners for cards and inputs.

## Pages & Sections

### 1. Home Page (`/shop/[slug]/page.tsx`)
The main landing page for a shop.
- **Hero Section:** Displays `company.name`, `company.city`, overall review stats (`average` and `count`), and a "Book Now" CTA. Configurable via `company.home_hero_image_url` (with a default fallback).
- **How it works:** A static 3-step informative section.
- **Quick Info Cards:** Displays dynamic Status (Open/Closed calculated against real-time and shop `hours`), `address`, `phone`, and `email`.
- **About Us Snippet:** Conditionally shows `company.about_us_text` if provided.
- **Location & Hours:** Shows an embedded Google Map (`company.google_maps_url`) and a detailed 7-day schedule generated from the `hours` grouping.
- **Our Services:** Summarizes available services grouped by category. Shows price and duration, and links directly to booking for a specific service.
- **Team:** Lists `staff` members with their `image_url` (or initial fallback), name, and `bio`, with direct booking links per barber.
- **Reviews:** Summary banner highlighting the shop's rating.
- **CTA:** Action box inviting other businesses to sign up.

### 2. About Page (`/shop/[slug]/about/page.tsx`)
Deep dive into the shop's identity.
- **Hero:** Uses `company.hero_about_url` (or falls back to the home hero) and `company.hero_overlay_text`.
- **Our Story:** Renders `company.our_story_text`.
- **Gallery:** Displays up to 3 static images (`company.about_image_1_url`, `2_url`, `3_url`).
- **Meet Our Team:** Shows the full staff list.
- **Where to Find Us:** Renders the map and detailed static info on address, parking, and public transport.

### 3. Services & Pricing (`/shop/[slug]/services/page.tsx`)
A dedicated menu for all services.
- **Sidebar Navigation:** Allows filtering services by category. Icons for categories are mapped statically based on category name keywords (e.g., 'haircut', 'beard', 'color').
- **Services List:** Displays each service within the selected category, showing `name`, `description`, formatted `price_cents`, and `duration_minutes`. Includes "Book" buttons for each item.

### 4. Booking Flow (`/shop/[slug]/book/page.tsx`)
A 4-step interactive booking wizard built within a single page component.
- **Step 1: Services:** Users select one or multiple services. Grouped by category.
- **Step 2: Staff:** Users choose a specific staff member or "Any available".
- **Step 3: Date & Time:**
  - Fetches available dates from `/booking/available-dates` (14-day window).
  - Displays a horizontal scroller of open dates. If today is closed, a `ClosedBanner` is shown.
  - Based on date, selected services, and staff, fetches exact time slots from `/booking/slots`.
- **Step 4: Confirm Booking:**
  - Reviews selected items and calculates total price/duration.
  - **Payment Integration:** Displays "Pay with Cash" and/or "Pay with QR Code" based on `settings.allow_cash_payment` and `settings.allow_qr_payment`.
  - **QR Code Flow:** If QR is selected, displays `settings.qr_image_url` and provides a widget for the user to upload a payment proof screenshot (`qrProofFile`).
  - Finalizes booking with optional user `notes`.

## UI/UX & Visual Feel
The `/shop` pages are designed with a **modern, premium, and mobile-first** aesthetic.

- **Clean & Minimalist Layout:** The interface relies heavily on generous whitespace, clean typography (likely a modern sans-serif like Inter or Roboto), and high-contrast elements.
- **Card-Based UI:** Almost all content (services, staff members, stats, hours) is presented within elevated cards (`<Card>` components from shadcn/ui). These cards typically have subtle borders (`border-surface-border`), soft backgrounds (`bg-surface`), and optional drop shadows based on the theme configuration (`cards_elevated: true`).
- **Dynamic Theming:**
  - The use of semantic CSS variables (`bg-page`, `text-text-main`, `text-text-muted`) ensures seamless adapting between light and dark modes (or arbitrary color schemes defined by the shop).
  - The `brand_color` serves as the primary accent, used for active states, checkmarks, primary buttons, and subtle background tints (e.g., `bg-brand-soft-bg`, which uses the brand color at a low opacity).
- **Interactive Elements:**
  - **Hover Effects:** Cards and buttons feature subtle hover states (e.g., `hover:-translate-y-0.5`, `hover:shadow-lg`, `hover:border-brand/50`) to provide tactile feedback and make the interface feel responsive.
  - **Avatars & Imagery:** Staff members are displayed with circular avatars. If an image is missing, a color-coordinated fallback with their initial is shown. Galleries and hero sections use edge-to-edge images with full-cover sizing, often with a dark overlay (`bg-slate-950/70`) to ensure text readability on top.
- **Booking Flow UX:** The booking process acts like a step-by-step wizard.
  - A visual `StepIndicator` using Pills and Checkmarks shows progress.
  - Selections (like choosing a service or a date) use large, touch-friendly hit areas formatted as selectable cards that highlight with a brand-colored border and checkmark when active.
  - The Date & Time selection heavily utilizes horizontal scrolling for dates and clean grid layouts for time slots, making it highly intuitive on mobile devices.
- **Refined Touches:**
  - Icons (from `lucide-react`) are used consistently across categories, payment methods, and contact info to break up text visually.
  - Loading states use smooth, pulsing spinners or skeleton loaders (`animate-pulse`) rather than abrupt changes, keeping the perceived performance high.
  - Typography features like `uppercase tracking-wide` or `tracking-[0.3em]` are used for small section headers to give a sophisticated, editorial look.
