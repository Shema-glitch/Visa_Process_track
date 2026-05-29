# Dual-Language File Upload & PDF Viewer Implementation

## Overview
Successfully implemented two major upgrades to the Visa Readiness Hub application:
1. **Dual-Language File Upload Per Requirement Card**
2. **Inline PDF Viewer (No Downloads)**

---

## UPGRADE 1: Dual-Language File Upload System

### Database Changes

#### New Table: `requirement_attachments`
```sql
CREATE TABLE requirement_attachments (
  id uuid PRIMARY KEY,
  requirement_id uuid REFERENCES requirements(id),
  user_id uuid REFERENCES auth.users(id),
  gdrive_file_id text NOT NULL,
  filename text NOT NULL,
  language_tag text CHECK (language_tag IN ('English', 'Kinyarwanda', 'Universal')),
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(requirement_id, language_tag)
);
```

**Key Features:**
- Supports multiple files per requirement
- Language tags: English, Kinyarwanda, Universal
- One file per language slot (unique constraint)
- Automatic cleanup on requirement deletion (CASCADE)

#### Modified Table: `requirements`
- **Added:** `requires_dual_language` boolean (default: false)
- **Removed:** `gdrive_file_id` (moved to attachments table)
- Auto-detection based on requirement name (birth certificate, criminal record, etc.)

### Migration Strategy
1. Created new attachments table
2. Migrated existing file IDs to attachments (as Universal)
3. Added dual-language flag to requirements
4. Marked specific requirements as dual-language
5. Removed old column from requirements table
6. Added RLS policies for attachments

---

### UI Implementation

#### ChecklistItem Component Enhancements

**Dual-Mode Upload Zones:**

**For Dual-Language Requirements** (requires_dual_language = true):
```
┌─────────────────────────────────────────┐
│  Phase 1: DIY Documents                 │
├─────────────────────────────────────────┤
│  🇬🇧 English Version     🇷🇼 Kinyarwanda │
│  ┌──────────────┐      ┌──────────────┐ │
│  │ Upload Zone  │      │ Upload Zone  │ │
│  └──────────────┘      └──────────────┘ │
└─────────────────────────────────────────┘
```

**For Single-File Requirements** (requires_dual_language = false):
```
┌─────────────────────────────────────────┐
│  Phase 1: DIY Documents                 │
├─────────────────────────────────────────┤
│         Universal Upload Zone           │
│       ┌─────────────────────┐          │
│       │   Drop file here    │          │
│       └─────────────────────┘          │
└─────────────────────────────────────────┘
```

**Upload Zone States:**

1. **Empty State:**
   - Dashed border
   - Upload icon
   - Language label (🇬🇧 English / 🇷🇼 Kinyarwanda / Universal)
   - Drag & drop support

2. **Uploading State:**
   - Pulsing upload icon
   - "Uploading..." text
   - Disabled interactions

3. **Uploaded State:**
   - Solid green border
   - File name displayed
   - Language badge
   - View button (opens PDF viewer)
   - Remove button (X)

**Completion Logic:**
A card is considered complete when **at least one file** is uploaded to any slot.
- English slot: Optional
- Kinyarwanda slot: Optional
- Universal slot: Single file

All slots remain available for future uploads.

---

### File Upload Flow

**1. User selects/drops file:**
```typescript
const handleFileSelect = async (
  files: FileList,
  languageTag: 'English' | 'Kinyarwanda' | 'Universal'
) => {
  // 1. Upload to Google Drive with language tag
  const result = await uploadFileToGoogleDrive(file, languageTag);

  // 2. Save to attachments table
  await supabase.from('requirement_attachments').upsert({
    requirement_id: id,
    gdrive_file_id: result.fileId,
    filename: file.name,
    language_tag: languageTag,
  }, { onConflict: 'requirement_id,language_tag' });

  // 3. Refresh attachments list
  await fetchAttachments();
};
```

**2. Google Drive Integration:**
- Files uploaded with metadata indicating language
- Stored in user's dedicated Google Drive folder
- Language tag passed through form data

**3. Database Storage:**
- One row per uploaded file
- Unique constraint prevents duplicate languages
- Automatic timestamp tracking

---

## UPGRADE 2: Inline PDF Viewer

### Component Architecture

**PDFViewer Component** (`src/components/PDFViewer.tsx`):

```typescript
interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  languageTag?: 'English' | 'Kinyarwanda' | 'Universal';
}
```

### Implementation Details

**1. File URL Retrieval:**
```typescript
// Edge Function: get-file-url
const fetchPDFUrl = async () => {
  // Get user's Google Drive tokens
  const authData = await getGoogleDriveAuth();

  // Request file metadata from Google Drive API
  const fileData = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`
  );

  // Return viewable URL
  return { url: fileData.webViewLink };
};
```

**2. Modal/Dialog UI:**
- Full-screen modal (max-width: 6xl, 90vh height)
- Header with file name, language badge, action buttons
- Embedded iframe for PDF rendering
- No navigation away from dashboard

**3. Action Buttons:**
- **View:** Opens inline (automatically when modal opens)
- **Open in Drive:** Opens in Google Drive (new tab)
- **Download:** Downloads file to device

**4. Loading States:**
- Spinner while fetching PDF URL
- Error handling with retry button
- Smooth transition into viewer

### Edge Function: get-file-url

**Purpose:** Retrieve Google Drive view URL for inline preview

**Implementation:**
```typescript
Deno.serve(async (req: Request) => {
  const { fileId } = await req.json();

  // 1. Get user's Google Drive access token
  const authData = await getGoogleDriveAuth();

  // 2. Request file metadata
  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`
  );

  // 3. Return URLs
  return { url: webViewLink, downloadUrl: webContentLink };
});
```

---

## Complete User Flow

### Example: Birth Certificate Upload

**Scenario:** User needs to upload both English and Kinyarwanda versions of birth certificate.

**Step 1:** Create requirement during onboarding
- Requirement marked as `requires_dual_language = true`
- UI automatically shows two upload zones

**Step 2:** Upload English version
- User clicks "🇬🇧 English Version" zone
- Selects or drops file
- File uploads to Google Drive
- Attachment saved with language_tag = 'English'
- Upload zone shows file name + "View" button

**Step 3:** Upload Kinyarwanda version (optional)
- User clicks "🇷🇼 Kinyarwanda Version" zone
- Uploads second file
- Attachment saved with language_tag = 'Kinyarwanda'
- Both zones now show uploaded files

**Step 4:** View PDF
- User clicks "View" on English file
- Modal opens with inline PDF viewer
- File renders in embedded iframe
- No download triggered

**Step 5:** Remove/Replace file
- User clicks X button on a file
- Confirmation dialog appears
- File removed from database
- Upload zone returns to empty state
- Other language file remains unaffected

---

## Security & RLS

### Row Level Security Policies

**requirement_attachments table:**
```sql
-- Users can only view their own attachments
CREATE POLICY "Users can view own attachments"
  ON requirement_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own attachments
CREATE POLICY "Users can insert own attachments"
  ON requirement_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own attachments
CREATE POLICY "Users can update own attachments"
  ON requirement_attachments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON requirement_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Data Isolation:**
- Each user sees only their own attachments
- No cross-user data access
- Secure by default

---

## Technical Implementation Details

### Files Modified

**1. Database Migration:**
- `supabase/migrations/add_dual_language_file_support.sql`
- Created attachments table
- Migrated existing data
- Updated requirements schema

**2. Edge Functions:**
- `supabase/functions/get-file-url/index.ts` (NEW)
- Retrieves Google Drive view URLs
- Supports inline preview

**3. Components:**
- `src/components/ChecklistItem.tsx` (MAJOR REWRITE)
  - Dual-zone upload UI
  - Attachment state management
  - PDF viewer integration
- `src/components/PDFViewer.tsx` (NEW)
  - Modal-based PDF viewer
  - Google Drive integration
  - Download/open options
- `src/components/RoadmapPipeline.tsx` (UPDATED)
  - Pass requires_dual_language prop
- `src/components/Dashboard.tsx` (UPDATED)
  - Updated Requirement interface
  - Removed obsolete handleFileUpload

**4. Utilities:**
- `src/lib/googleDrive.ts` (UPDATED)
  - Added languageTag parameter to uploadFileToGoogleDrive

**5. App Entry:**
- `src/App.tsx` (UPDATED)
  - Auto-detect dual-language requirements during onboarding

---

## Build Results

**Before Upgrade:**
```
✓ 1617 modules transformed
✓ CSS: 35.79 kB (gzip: 6.74 kB)
✓ JS: 528.48 kB (gzip: 153.80 kB)
```

**After Upgrade:**
```
✓ 1618 modules transformed
✓ CSS: 36.18 kB (gzip: 6.80 kB)  (+0.39 kB)
✓ JS: 534.75 kB (gzip: 155.97 kB) (+6.27 kB)
```

**Bundle Size Impact:**
- CSS: +0.39 kB (1.1% increase)
- JS: +6.27 kB (1.2% increase)
- Minimal overhead for significant feature addition

---

## Key Features Delivered

### 1. Dual-Language Upload Zones
✅ Two distinct upload zones per requirement (when needed)
✅ Language-specific labels (🇬🇧 English / 🇷🇼 Kinyarwanda)
✅ Independent upload per language
✅ One file per language slot (enforced by DB constraint)
✅ Universal fallback for single-file requirements

### 2. File Management UI
✅ Visual feedback per upload zone (empty/uploading/complete)
✅ Drag & drop support per zone
✅ File name display with language badge
✅ View button for inline preview
✅ Remove/replace functionality

### 3. Inline PDF Viewer
✅ Modal-based viewer (no navigation)
✅ Embedded iframe rendering
✅ No automatic downloads
✅ Action buttons (View, Open in Drive, Download)
✅ Loading states and error handling

### 4. Database Architecture
✅ Separate attachments table
✅ Language tag per file
✅ Dual-language flag per requirement
✅ Automatic detection and migration
✅ Full RLS security

### 5. Google Drive Integration
✅ Language-aware uploads
✅ Inline preview support
✅ View URL retrieval via edge function
✅ Backward compatible with existing files

---

## Auto-Detection Logic

Requirements automatically marked as dual-language if name contains:
- "birth certificate"
- "criminal record"
- "police clearance"
- "identity card"
- "national id"

This happens in:
1. **Migration:** Existing requirements detected during DB migration
2. **Onboarding:** New requirements detected during creation
3. **Manual:** Users can modify via database if needed

---

## Completion Status

**Card Completion Logic:**
- Card considered complete if **at least one file uploaded**
- English version: Fully optional
- Kinyarwanda version: Fully optional
- Both can be uploaded if user has them
- Neither required - completion based on user's needs

**Progress Tracking:**
- Progress counts requirements, not files
- Multiple files per requirement don't affect overall progress calculation
- Status can be manually set to "completed" regardless of uploads

---

## Future Enhancements (Optional)

1. **File Preview Thumbnails:** Show thumbnail previews before opening full viewer
2. **Batch Upload:** Allow uploading multiple language versions at once
3. **Version History:** Track previous file versions
4. **File Expiry Alerts:** Notify when documents need renewal
5. **OCR Integration:** Extract text from uploaded documents
6. **File Compression:** Optimize large PDF uploads
7. **Mobile Optimization:** Touch-friendly upload and viewing

---

## Testing Checklist

✅ Database migration applied successfully
✅ Dual-language flag set correctly on requirements
✅ Two upload zones appear for dual-language requirements
✅ Single upload zone appears for universal requirements
✅ File upload stores language tag correctly
✅ Viewed files open inline (no download)
✅ PDF renders in embedded iframe
✅ Remove file works without affecting other language file
✅ At least one file shows card as backed up
✅ Progress tracking works with new schema
✅ Build succeeds without errors

---

## Conclusion

Both upgrades have been successfully implemented with:
- **Complete database migration** for dual-language support
- **Full UI implementation** with dual upload zones
- **Inline PDF viewer** integrated into all file attachments
- **Security maintained** through RLS policies
- **Build successful** with minimal bundle size impact
- **No breaking changes** to existing functionality

The application now supports complex multi-language document management while maintaining simplicity for single-file requirements.
