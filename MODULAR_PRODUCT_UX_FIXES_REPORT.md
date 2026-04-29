# Modular Product UX Fixes Report

## Scope

Frontend/admin entitlement-aware UX fixes for Reservas-only companies, focused on:

- Panel dashboard metrics state
- Reservas reminders CTA
- Team availability gating
- Booking settings messaging automation state
- Entitlement error localization and typed handling

## Implemented

### 1. Panel / dashboard metrics

- Prevented the dashboard from calling metrics when `OPERATIONAL_DASHBOARD` is not available.
- Added a locked metrics state instead of the generic error toast/card.
- Added fallback dashboard content so Reservas-only companies still see active modules and available add-ons.
- If the metrics API still returns an entitlement `403`, the page now renders the locked state instead of showing `No se pudieron cargar las métricas`.

### 2. Reservas reminders button

- Replaced the clickable error path with a locked pre-click state.
- `Enviar recordatorios de hoy` now renders as a locked CTA when `MENSAJERIA_REMINDERS` is missing.
- Clicking the locked control opens a controlled product-request dialog instead of triggering the API.

### 3. Team availability

- Replaced save-time discovery with a page-level locked state for companies without `RESERVAS_PRO`.
- Disabled:
  - add slot
  - copy business hours
  - save availability
- Prevented availability fetch/save flows from running when the capability is missing.

### 4. Booking settings / communication automation

- Removed the false green “Mensajería Pro está activa” state when `MENSAJERIA_PRO` is not active.
- Added a locked state with request CTA for the communication automation section.
- Kept automation rows visibly non-interactive.

### 5. Entitlement errors and i18n

- Added reusable entitlement copy in Spanish and English.
- Added typed frontend normalization for entitlement API errors.
- `403` entitlement responses now become localized UI-safe messages such as:
  - `Requiere Mensajería Pro`
  - `Requiere Reservas Pro`
  - `Este módulo no está activo para tu empresa.`
- Avoided surfacing raw backend English entitlement messages through shared admin fetch paths.

### 6. Reusable UI

- Added shared components:
  - `components/admin/product/EntitlementLockedCard.tsx`
  - `components/admin/product/EntitlementLockedBanner.tsx`
  - `components/admin/product/LockedFeatureButton.tsx`
- Improved:
  - `components/admin/product/RequestProductCTA.tsx`

## Shared plumbing added

- `lib/api-error.ts`
  - typed normalization for API errors
  - entitlement detection from `403` + capability payload
  - localized entitlement messages

- Updated shared fetch usage in:
  - `app/admin/lib/adminApi.ts`
  - `app/hooks/useApi.ts`

## Main files updated

- `app/admin/dashboard/page.tsx`
- `app/admin/dashboard/bookings/page.tsx`
- `app/admin/dashboard/availability/page.tsx`
- `app/admin/dashboard/settings/page.tsx`
- `app/admin/lib/adminApi.ts`
- `components/admin/product/RequestProductCTA.tsx`
- `lib/i18n/locales/es.ts`
- `lib/i18n/locales/en.ts`

## Validation

- `npm run lint`
  - passed with pre-existing warnings unrelated to this task

- `npm run build`
  - reached successful compile of the modified admin code
  - blocked by a pre-existing unrelated TypeScript error in:
    - `app/shop/[slug]/events/[eventId]/page.tsx`
    - missing symbol: `capturePublicEventInterest`

## QA expectations covered

- Panel no longer shows the generic metrics error for expected missing metrics entitlement.
- Reminders are locked before click.
- Team availability cannot be edited without Reservas Pro.
- Communication automation no longer shows a false active state.
- Shared entitlement errors no longer surface raw English backend copy in the targeted admin flows.
