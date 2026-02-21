# Implementation Plan: Business Hours, Categories & Page Management

> **Generated:** 2026-01-22  
> **Project:** Reservas Frontend + Backend

---

## Table of Contents

1. [Feature 1: Open Days Display & Booking Restrictions](#feature-1-open-days-display--booking-restrictions)
2. [Feature 2: Service Categories with Global Service Types](#feature-2-service-categories-with-global-service-types)
3. [Feature 3: Page Management for Owners (Images & Texts)](#feature-3-page-management-for-owners-images--texts)

---

## Feature 1: Open Days Display & Booking Restrictions

### Overview
- Only show days that are open in the schedule display
- When a salon is currently closed but has open hours later that day, show a red "Closed" indicator
- In the booking screen, only allow customers to select open days

---

### Backend Prompt #1.1: Available Dates Endpoint

```
TASK: Create endpoint to return available booking dates with hours info

CONTEXT:
- Hours table: { id, company_id, day_of_week (0-6), open_time, close_time, is_closed }
- Need to support multiple time windows per day (e.g., 9-12, 14-18)

ENDPOINT: GET /api/booking/available-dates

QUERY PARAMS:
- company_id: number (required)
- start_date: string YYYY-MM-DD (optional, defaults to today)
- days: number (optional, defaults to 14)

RESPONSE:
{
  "code": 200,
  "error": false,
  "data": {
    "dates": [
      {
        "date": "2026-01-22",
        "day_of_week": 3,
        "is_open": true,
        "windows": [
          { "open_time": "09:00", "close_time": "12:00" },
          { "open_time": "14:00", "close_time": "18:00" }
        ]
      },
      {
        "date": "2026-01-23",
        "day_of_week": 4,
        "is_open": false,
        "windows": []
      }
    ],
    "timezone": "America/La_Paz"
  }
}

LOGIC:
1. Query Hours table for company_id
2. For each date in range, lookup day_of_week
3. Return is_open: false if is_closed=true or no windows exist
4. Sort windows by open_time
5. Include company timezone for frontend calculations
```

---

### Backend Prompt #1.2: Current Open Status Endpoint

```
TASK: Create endpoint to check if salon is currently open

ENDPOINT: GET /api/company/:slug/status

RESPONSE:
{
  "code": 200,
  "error": false,
  "data": {
    "is_open_now": false,
    "current_time": "08:30",
    "today_windows": [
      { "open_time": "09:00", "close_time": "12:00" },
      { "open_time": "14:00", "close_time": "18:00" }
    ],
    "next_open_time": "09:00",
    "next_open_today": true,
    "is_closed_today": false
  }
}

LOGIC:
1. Get company timezone
2. Calculate current local time
3. Get today's day_of_week
4. Query Hours for today's windows
5. Check if current_time falls within any window
6. If closed now but windows exist later, set next_open_time
7. If is_closed=true for today, set is_closed_today=true
```

---

### Frontend Implementation #1.1: DateTimeStep Component Update

**File:** `app/shop/[slug]/book/page.tsx` - DateTimeStep component

**Changes:**

1. **Fetch available dates on mount:**
   ```
   - Call GET /api/booking/available-dates?company_id={id}&days=14
   - Store in state: availableDates[]
   ```

2. **Filter date options:**
   ```
   - Current: generates next 14 days regardless of hours
   - New: filter dateOptions to only include dates where is_open=true
   - Add visual indicator for "closed" days if you want to show them grayed out
   ```

3. **Update date button rendering:**
   ```
   - If date.is_open === false: either hide or show disabled with "Closed" label
   - Preference: Hide closed days entirely from selection
   ```

4. **Add "Currently Closed" indicator:**
   ```
   - If selected date is today AND salon is closed now but opens later:
   - Show red banner: "Currently closed. Opens at {next_open_time}"
   - Use the /status endpoint or calculate from windows
   ```

**New helper function needed:**
```typescript
function isCurrentlyOpen(windows: {open_time: string, close_time: string}[], currentTime: string): boolean
function getNextOpenTime(windows: [], currentTime: string): string | null
```

---

### Frontend Implementation #1.2: Shop Hours Display Component

**File:** Create `components/shop/OpenStatusBadge.tsx`

**Purpose:** Reusable component showing open/closed status with red indicator

**Props:**
```typescript
interface OpenStatusBadgeProps {
  hours: ShopHours[];
  timezone: string;
  showNextOpen?: boolean;
}
```

**Rendering:**
- If open now: Green badge "Open"
- If closed but opens later today: Red badge "Closed" + "Opens at X:XX"
- If closed all day: Red badge "Closed today"

---

## Feature 2: Service Categories with Global Service Types

### Overview
- Owners can create categories for their salon
- Categories fall under a global service type (e.g., "Haircut", "Manicure")
- Super admin can create/edit global service types

---

### Backend Prompt #2.1: Update Category Schema

```
TASK: Add global_service_type_id to Category table

SCHEMA CHANGE (Prisma):
model Category {
  id                    Int       @id @default(autoincrement())
  company_id            Int
  global_service_type_id Int?     // NEW FIELD - nullable, links to GlobalServiceType
  name                  String
  slug                  String
  description           String?
  position              Int       @default(0)
  is_active             Boolean   @default(true)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  deleted_at            DateTime?
  
  company               Company   @relation(fields: [company_id], references: [id])
  global_service_type   GlobalServiceType? @relation(fields: [global_service_type_id], references: [id])
  services              Service[]
  
  @@unique([company_id, slug])
}

MIGRATION:
1. Add column global_service_type_id INT NULL
2. Add foreign key to GlobalServiceType
3. Create index on global_service_type_id
```

---

### Backend Prompt #2.2: Admin Categories CRUD with Service Type

```
TASK: Update admin categories endpoints to support global_service_type_id

ENDPOINTS:

1. GET /api/admin/categories?company_id={id}
   - Include global_service_type relation in response
   - Response should include:
     {
       id, name, slug, description, position, is_active,
       global_service_type_id,
       global_service_type: { id, key, name } | null
     }

2. POST /api/admin/categories
   Body: {
     company_id: number,
     name: string,
     description?: string,
     global_service_type_id?: number,  // NEW
     position?: number
   }
   - Auto-generate slug from name
   - Validate global_service_type_id exists if provided

3. PUT /api/admin/categories/:id
   - Allow updating global_service_type_id

4. GET /api/admin/global-service-types
   - Return all global service types for dropdown
   - Response: [{ id, key, name, description }]
```

---

### Backend Prompt #2.3: Super Admin Global Service Types CRUD

```
TASK: Create super admin endpoints for managing GlobalServiceType

PREREQUISITE:
- Middleware to check user.is_super_admin === true
- Return 403 if not super admin

ENDPOINTS:

1. GET /api/super-admin/service-types
   - List all global service types
   - Include usage count (how many categories use each)
   
2. POST /api/super-admin/service-types
   Body: {
     key: string,      // e.g., "HAIRCUT" - must be unique, uppercase
     name: string,     // e.g., "Corte de cabello"
     description?: string
   }
   - Validate key is unique
   - Auto-uppercase the key

3. PUT /api/super-admin/service-types/:id
   Body: { name?, description?, key? }
   - If changing key, validate uniqueness

4. DELETE /api/super-admin/service-types/:id
   - Soft delete or prevent if categories are using it
   - Return error if in use: "Cannot delete: X categories are using this type"
```

---

### Frontend Implementation #2.1: Update Services Page Category Modal

**File:** `app/admin/dashboard/services/page.tsx`

**Changes to Category Creation Modal:**

1. **Fetch global service types on mount:**
   ```
   GET /api/admin/global-service-types
   Store in state: globalServiceTypes[]
   ```

2. **Add dropdown to category modal:**
   ```
   <Label>Service Type (optional)</Label>
   <Select value={globalServiceTypeId} onChange={...}>
     <option value="">-- No specific type --</option>
     {globalServiceTypes.map(t => (
       <option value={t.id}>{t.name}</option>
     ))}
   </Select>
   <p className="text-xs text-slate-500">
     Categorize under a global service type for better search visibility
   </p>
   ```

3. **Update form submission:**
   - Include global_service_type_id in POST/PUT body

---

### Frontend Implementation #2.2: Categories Management Section

**File:** Create `app/admin/dashboard/services/components/CategoriesSection.tsx`

**Purpose:** Dedicated section on Services page for managing categories

**Features:**
- List all categories with their global service type
- Edit category name, description, service type
- Reorder categories (drag or up/down arrows)
- Delete category (with confirmation if has services)

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Categories                              [+ Add]     │
├─────────────────────────────────────────────────────┤
│ ☰ Haircuts          Type: Haircut        [Edit][🗑] │
│ ☰ Coloring          Type: Hair Coloring  [Edit][🗑] │
│ ☰ Treatments        Type: --             [Edit][🗑] │
└─────────────────────────────────────────────────────┘
```

---

### Frontend Implementation #2.3: Super Admin Service Types Page

**File:** Create `app/super-admin/service-types/page.tsx`

**Prerequisites:**
- Create super admin layout: `app/super-admin/layout.tsx`
- Add auth check for is_super_admin
- Add navigation link in super admin sidebar

**Page Features:**
- Table listing all global service types
- Columns: Key, Name, Description, Categories Using, Actions
- Add new service type modal
- Edit service type modal
- Delete with confirmation (disabled if in use)

**UI Components:**
- Reuse existing Table, Dialog, Input, Button components
- Similar pattern to admin services page

---

## Feature 3: Page Management for Owners (Images & Texts)

### Overview
- Owners can modify all texts and images for their shop pages
- Images stored in backend filesystem: `/storage/uploads/[company_id]/[type]/[filename]`
- Images served through backend API (no CDN)
- Staff images follow pattern: `/storage/uploads/[company_id]/staff/[staff_id].[ext]`

---

### Backend Prompt #3.1: File Storage Setup

```
TASK: Set up file storage infrastructure for company uploads

DIRECTORY STRUCTURE:
/storage/uploads/
  └── [company_id]/
      ├── logo/
      │   └── logo.[ext]
      ├── hero/
      │   ├── home.[ext]
      │   └── about.[ext]
      ├── about/
      │   ├── image1.[ext]
      │   ├── image2.[ext]
      │   └── image3.[ext]
      ├── staff/
      │   ├── [staff_id].[ext]
      │   └── ...
      └── gallery/
          └── ...

CONFIGURATION:
1. Create storage directory at project root or configurable path
2. Set STORAGE_PATH in .env: STORAGE_PATH=/path/to/storage
3. Ensure directory is writable by Node process
4. Add /storage to .gitignore

IMPORTANT: All images will be served through the backend API, NOT a CDN.
The frontend will request images via API endpoints that read from this filesystem.
```

---

### Backend Prompt #3.2: Image Upload Endpoint

```
TASK: Create image upload endpoint for company assets

ENDPOINT: POST /api/admin/uploads/image

MIDDLEWARE:
- multer for multipart/form-data
- File size limit: 5MB
- Allowed types: image/jpeg, image/png, image/webp, image/gif

REQUEST (multipart/form-data):
- file: File (the image)
- company_id: number
- type: 'logo' | 'hero_home' | 'hero_about' | 'about_1' | 'about_2' | 'about_3' | 'staff'
- entity_id?: number (required if type='staff', this is the staff_id)

LOGIC:
1. Validate user has admin access to company_id
2. Determine target directory based on type:
   - logo -> /storage/uploads/{company_id}/logo/
   - hero_home -> /storage/uploads/{company_id}/hero/
   - hero_about -> /storage/uploads/{company_id}/hero/
   - about_1,2,3 -> /storage/uploads/{company_id}/about/
   - staff -> /storage/uploads/{company_id}/staff/
3. Generate filename:
   - logo: logo.{ext}
   - hero_home: home.{ext}
   - hero_about: about.{ext}
   - about_N: imageN.{ext}
   - staff: {staff_id}.{ext}
4. Delete existing file if replacing
5. Save new file
6. Update company/staff record with new image_url
7. Return the serving URL

RESPONSE:
{
  "code": 200,
  "error": false,
  "message": "Image uploaded successfully",
  "data": {
    "url": "/api/uploads/company/123/logo/logo.jpg",
    "type": "logo"
  }
}
```

---

### Backend Prompt #3.3: Image Serving Endpoint

```
TASK: Create endpoint to serve uploaded images

ENDPOINT: GET /api/uploads/company/:company_id/:type/:filename

EXAMPLES:
- GET /api/uploads/company/123/logo/logo.jpg
- GET /api/uploads/company/123/staff/45.jpg
- GET /api/uploads/company/123/hero/home.webp

LOGIC:
1. Validate company_id exists
2. Construct file path: {STORAGE_PATH}/uploads/{company_id}/{type}/{filename}
3. Check file exists, return 404 if not
4. Determine content-type from extension
5. Set cache headers: Cache-Control: public, max-age=86400 (1 day)
6. Stream file to response

SECURITY:
- Sanitize filename to prevent directory traversal
- Only allow known type values
- Consider rate limiting

OPTIONAL FEATURES:
- On-the-fly image resizing with query params: ?w=200&h=200
- WebP conversion for browsers that support it
```

---

### Backend Prompt #3.4: Image Delete Endpoint

```
TASK: Create endpoint to delete uploaded images

ENDPOINT: DELETE /api/admin/uploads/image

REQUEST BODY:
{
  "company_id": number,
  "type": "logo" | "hero_home" | "hero_about" | "about_1" | "about_2" | "about_3" | "staff",
  "entity_id"?: number (for staff)
}

LOGIC:
1. Validate user has admin access to company_id
2. Construct file path based on type
3. Delete file from filesystem
4. Update company/staff record to set image_url = null
5. Return success

RESPONSE:
{
  "code": 200,
  "error": false,
  "message": "Image deleted successfully"
}
```

---

### Backend Prompt #3.5: Company Content Update Endpoint

```
TASK: Create/update endpoint for company text content

ENDPOINT: PUT /api/admin/company/:id/content

REQUEST BODY:
{
  "about_us_text"?: string,
  "our_story_text"?: string,
  "about_us_hero_text"?: string
}

LOGIC:
1. Validate user has admin/owner access to company
2. Update only provided fields
3. Sanitize HTML if allowing rich text (or strip tags)
4. Return updated company

RESPONSE:
{
  "code": 200,
  "error": false,
  "message": "Content updated successfully",
  "data": { /* updated company */ }
}
```

---

### Backend Prompt #3.6: Get All Editable Content

```
TASK: Create endpoint to get all editable content for page management

ENDPOINT: GET /api/admin/company/:id/content

RESPONSE:
{
  "code": 200,
  "error": false,
  "data": {
    "texts": {
      "about_us_text": "...",
      "our_story_text": "...",
      "about_us_hero_text": "..."
    },
    "images": {
      "logo_url": "/api/uploads/company/123/logo/logo.jpg",
      "home_hero_image_url": "/api/uploads/company/123/hero/home.jpg",
      "about_hero_image_url": "/api/uploads/company/123/hero/about.jpg",
      "about_image_1_url": "/api/uploads/company/123/about/image1.jpg",
      "about_image_2_url": null,
      "about_image_3_url": null
    },
    "staff": [
      {
        "id": 1,
        "display_name": "John",
        "image_url": "/api/uploads/company/123/staff/1.jpg"
      },
      {
        "id": 2,
        "display_name": "Jane",
        "image_url": null
      }
    ]
  }
}
```

---

### Frontend Implementation #3.1: Image URL Helper

**File:** Create `utils/image-url.ts`

```typescript
/**
 * All images are served through the backend API.
 * This helper constructs the correct URL for any image type.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // If already a full URL, return as-is (for backwards compatibility)
  if (path.startsWith('http')) return path;
  
  // If it's an API path, prepend base URL
  if (path.startsWith('/api/')) {
    return `${API_BASE}${path}`;
  }
  
  return path;
}

export function getCompanyImageUrl(
  companyId: number,
  type: 'logo' | 'hero_home' | 'hero_about' | 'about_1' | 'about_2' | 'about_3',
  filename: string
): string {
  const typeMap = {
    logo: 'logo',
    hero_home: 'hero',
    hero_about: 'hero',
    about_1: 'about',
    about_2: 'about',
    about_3: 'about'
  };
  return `${API_BASE}/api/uploads/company/${companyId}/${typeMap[type]}/${filename}`;
}

export function getStaffImageUrl(companyId: number, staffId: number, ext: string = 'jpg'): string {
  return `${API_BASE}/api/uploads/company/${companyId}/staff/${staffId}.${ext}`;
}
```

---

### Frontend Implementation #3.2: ImageUpload Component

**File:** Create `components/admin/ImageUpload.tsx`

**Props:**
```typescript
interface ImageUploadProps {
  companyId: number;
  type: 'logo' | 'hero_home' | 'hero_about' | 'about_1' | 'about_2' | 'about_3' | 'staff';
  entityId?: number; // Required for staff
  currentUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onDelete?: () => void;
  aspectRatio?: '1:1' | '16:9' | '4:3' | 'free';
  maxSizeMB?: number;
}
```

**Features:**
- Drag & drop zone
- Click to browse
- Preview current image
- Upload progress indicator
- Delete button (if currentUrl exists)
- File type validation (jpg, png, webp)
- Size validation
- Aspect ratio guidelines

**UI:**
```
┌─────────────────────────────────────┐
│  [Current Image Preview]            │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  📁 Drag & drop or click to upload  │
│  JPG, PNG, WebP up to 5MB           │
│                                     │
│  [Delete Image]                     │
└─────────────────────────────────────┘
```

---

### Frontend Implementation #3.3: Page Management Page

**File:** Create `app/admin/dashboard/page-management/page.tsx`

**Layout:** Tabbed interface or accordion sections

**Sections:**

1. **Logo & Branding**
   - Logo upload (square, recommended 200x200)

2. **Home Page**
   - Hero image upload (16:9, recommended 1920x1080)
   - About Us text (textarea or rich text)

3. **About Page**
   - Hero image upload
   - Hero overlay text
   - Our Story text (longer textarea)
   - Gallery images (3 slots)

4. **Team/Staff**
   - List all staff members
   - Each with image upload option
   - Edit staff bio inline or via modal

**State Management:**
- Fetch all content on mount via GET /api/admin/company/:id/content
- Track unsaved changes
- Save individual sections or all at once
- Show success/error toasts

---

### Frontend Implementation #3.4: Update All Image References

**Files to Update:**
- `app/shop/[slug]/page.tsx` - Shop home page
- `app/shop/[slug]/about/page.tsx` - About page
- `app/shop/[slug]/team/page.tsx` - Team page
- `components/shop/*` - Any component using images

**Changes:**
Replace all direct image URL usage with the `getImageUrl()` helper:

```typescript
// Before
<img src={company.logo_url} />

// After
import { getImageUrl } from '@/utils/image-url';
<img src={getImageUrl(company.logo_url)} />
```

Also update `next.config.js` to allow images from the API domain:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '3001',
      pathname: '/api/uploads/**',
    },
    // Add production domain
  ],
},
```

---

### Frontend Implementation #3.5: Add Navigation Link

**File:** `app/admin/dashboard/layout.tsx`

Add new navigation item:
```typescript
{
  name: "Page Management",
  href: "/admin/dashboard/page-management",
  icon: FileEdit, // or Layout icon from lucide-react
}
```

---

## Implementation Order

### Phase 1: Backend Foundation
1. [ ] #3.1 File storage setup
2. [ ] #3.2 Image upload endpoint
3. [ ] #3.3 Image serving endpoint
4. [ ] #3.4 Image delete endpoint
5. [ ] #3.5 Company content update endpoint
6. [ ] #3.6 Get all editable content endpoint

### Phase 2: Business Hours
7. [ ] #1.1 Available dates endpoint
8. [ ] #1.2 Current open status endpoint

### Phase 3: Categories & Service Types
9. [ ] #2.1 Update Category schema
10. [ ] #2.2 Admin categories CRUD update
11. [ ] #2.3 Super admin service types CRUD

### Phase 4: Frontend - Core Components
12. [ ] #3.1 Image URL helper
13. [ ] #3.2 ImageUpload component
14. [ ] #1.2 OpenStatusBadge component

### Phase 5: Frontend - Pages
15. [ ] #3.3 Page Management page
16. [ ] #3.4 Update all image references
17. [ ] #1.1 DateTimeStep update for booking
18. [ ] #2.1 Services page category modal update
19. [ ] #2.2 Categories management section
20. [ ] #2.3 Super admin service types page

### Phase 6: Final Integration
21. [ ] #3.5 Add navigation links
22. [ ] Test all image uploads/serving
23. [ ] Test booking with hours restrictions
24. [ ] Test category/service type management

---

## Testing Checklist

### Feature 1: Hours & Booking
- [ ] Closed days not shown in booking calendar
- [ ] "Currently Closed" banner shows when applicable
- [ ] "Opens at X:XX" shows next opening time
- [ ] Cannot select slots on closed days
- [ ] Multiple time windows per day work correctly

### Feature 2: Categories
- [ ] Owner can create category with service type
- [ ] Owner can edit category service type
- [ ] Super admin can create new service types
- [ ] Super admin can edit service types
- [ ] Super admin cannot delete in-use service types
- [ ] Categories show service type in admin list

### Feature 3: Page Management
- [ ] Can upload logo image
- [ ] Can upload hero images
- [ ] Can upload about page images
- [ ] Can upload staff images
- [ ] Can delete any uploaded image
- [ ] Can edit all text fields
- [ ] Images display correctly on public pages
- [ ] Old image replaced when uploading new one
- [ ] File size validation works
- [ ] File type validation works

---

## Notes

### Image Storage Path
```
/storage/uploads/[company_id]/staff/[staff_id].[ext]
```
This follows the user's requested format. All images served via backend API, no CDN.

### Security Considerations
- Validate file types server-side (not just extension, check magic bytes)
- Sanitize filenames
- Prevent directory traversal attacks
- Rate limit upload endpoints
- Validate user permissions for each company

### Performance Considerations
- Consider adding image optimization on upload (resize, compress)
- Set appropriate cache headers for served images
- Consider lazy loading for image galleries
