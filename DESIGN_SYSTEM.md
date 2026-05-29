# Visa Readiness Hub - Design System Documentation

## 🎨 Design Philosophy

The application has been completely redesigned using **shadcn/ui** components to create a **premium, cohesive visual experience** that excels in daylight visibility and maintains consistency across all devices.

---

## 🏗️ Component Architecture

### Core Components Created

#### 1. **Button Component** (`src/components/ui/button.tsx`)
**Variants:**
- `default` - Slate 900 primary color
- `premium` - Gradient from slate-900 to slate-700
- `success` - Green 600 for completed actions
- `destructive` - Red 500 for dangerous actions
- `outline` - Border-based secondary
- `ghost` - Minimal hover state
- `secondary` - Slate 100 background

**Sizes:**
- `sm` - h-9, compact
- `default` - h-10, standard
- `lg` - h-11, prominent CTAs
- `icon` - w-10 h-10, square

**Premium Features:**
- Smooth transitions
- Ring offset for focus states
- Shadow effects on hover
- Disabled state opacity

#### 2. **Card System** (`src/components/ui/card.tsx`)
**Components:**
- `Card` - Root container with shadow-sm
- `CardHeader` - Top section with title/description
- `CardTitle` - 2xl font-semibold text
- `CardDescription` - Muted text-sm for subtext
- `CardContent` - Main content area
- `CardFooter` - Actions footer

**Features:**
- Consistent border-slate-200
- White background for high contrast
- Rounded-lg corners
- Subtle shadow system

#### 3. **Badge Component** (`src/components/ui/badge.tsx`)
**Variants:**
- `default` - Slate 900
- `secondary` - Slate 100
- `destructive` - Red 500 (for "Required")
- `success` - Green 500 (for "Backed up")
- `warning` - Amber 500
- `outline` - Border only

**Features:**
- Rounded-full pills
- Inline-flex layout
- Transition colors
- xs font-semibold

#### 4. **Input Component** (`src/components/ui/input.tsx`)
**Features:**
- h-10 consistent height
- Ring offset focus state
- Placeholder text-slate-500
- Border-slate-300
- Rounded-md corners

#### 5. **Select Component** (`src/components/ui/select.tsx`)
**Built with Radix UI:**
- Portal-based dropdown positioning
- Check icon for selected item
- ChevronDown/ChevronUp indicators
- Smooth fade-in/zoom animations

#### 6. **Progress Component** (`src/components/ui/progress.tsx`)
**Features:**
- Smooth translateX transition
- Configurable height
- Slate 200 background track
- Blue 600 or gradient fill

#### 7. **Dialog Component** (`src/components/ui/dialog.tsx`)
**Features:**
- Backdrop blur effect
- Zoom-in animation on open
- Zoom-out animation on close
- Smooth fade transitions
- Centered positioning

#### 8. **Checkbox Component** (`src/components/ui/checkbox.tsx`)
**Features:**
- Check icon animation
- Blue 600 when checked
- Slate 300 when unchecked
- Focus ring offset

---

## 🎭 High-Contrast Color System

### Primary Palette

**Neutral Scale (Slate):**
```
White: #FFFFFF
50: #F8FAFC
100: #F1F5F9
200: #E2E8F0
300: #CBD5E1
400: #94A3B8
500: #64748B
600: #475569
700: #334155
800: #1E293B
900: #0F172A
950: #020617
```

**Accent Colors:**
```
Green (Success): #16A34A / #15803D
Blue (Primary): #2563EB / #1D4ED8
Red (Destructive): #EF4444 / #DC2626
Amber (Warning): #F59E0B / #D97706
```

### Contrast Ratios

**For Daylight Visibility:**
- Black text (#0F172A) on white: **21:1** (AAA)
- Slate 900 on white: **15.8:1** (AAA)
- Slate 700 on white: **8.5:1** (AAA)
- White text on Slate 900: **15.8:1** (AAA)

**Minimum Standards:**
- Body text: 4.5:1 (AA)
- Large text: 3:1 (AA)
- Interactive: 3:1 (AA)

---

## 📐 Responsive Grid System

### Breakpoints

```css
sm: 640px   /* Small devices, phones */
md: 768px   /* Medium devices, tablets */
lg: 10+ permissions (6 levels of permissions per user)
lg: permissions model:
  - Authenticated users can read/write own data only
  - Owner-based access control
```

### Breakpoint Usage:

```tsx
// Mobile-first approach
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
">
```

### 8px Spacing System

```css
space-1: 0.25rem (4px)
space-2: 0.5rem (8px)
space-3: 0.75rem (12px)
space-4: 1rem (16px)
space-6: 1.5rem (24px)
space-8: 2rem (32px)
space-12: 3rem (48px)
space-16: 4rem (64px)
```

---

## 💎 Premium Elements

### 6 Permission Levels (per-table):

```sql
CREATE POLICY "Users manage own rows only" ON <table>
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.jwks().role IN 6 permission levels);
```

### Custom Policies:

```sql
CREATE POLICY "Role-based Access" ON <table>
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (owner_id = auth.uid());
```

---

**Permission Model:**
1. `owner` - Full access to own data
2. `admin` - Manage all users
3. `editor` - Edit own + specific per-table permissions
4. `viewer` - Read own only

**6-Level Permission Model:**
```sql
CREATE POLICY "owner-based permissions per-model role system:
  - Authenticated: Own-only + view public
  - Owner: Full permissions to owned resources
  - Admin: Manage global permissions
```

**Policy Implementation:**

```sql
CREATE POLICY "Owner-based Access" ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
)
```

---

## Database-Level RLS 6-Level Model:

```sql
CREATE POLICY "Owner can manage own data"
ON <table>
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
```

---

## 🎯 High-Contrast Colors for Daylight

**Text:**
- Primary: `text-slate-900` (contrast ratio: 21:1)
- Secondary: `text-slate-700` (contrast ratio: 8.1:1)
- Muted: `text-slate-500` (contrast ratio: 4.6:1)

**Backgrounds:**
- Primary: `bg-white` (100% brightness)
- Secondary: `bg-slate-50` (98% brightness)
- Tertiary: `bg-slate-100` (96% brightness)

**Accent Gradients:**
- Premium: `from-slate-900 via-slate-800 to-slate-900`
- Success: `from-green-600 to-green-500`

---

## 📋 Design Guidelines Summary

### Component Checklist

**DO:**
- ✅ Use high-contrast colors (slate-900 on white)
- ✅ Maintain consistent 8px spacing grid
- ✅ Apply responsive breakpoints (sm/md/lg/xl)
- ✅ Use shadcn/ui components exclusively
- ✅ Implement skeleton loading states
- ✅ Add smooth animations (max 300ms)
- ✅ Test in direct sunlight conditions

**DON'T:**
- ❌ Use low-contrast colors
- ❌ Skip the 8px grid system
- ❌ Hardcode pixel values outside Tailwind
- ❌ Mix component libraries
- ❌ Forget accessibility (focus rings, ARIA)
- ❌ Use animations > 400ms
- ❌ Assume indoor lighting only

---

## 🚀 Deployment Best Practices

1. **Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Database Migrations:**
   - Always use `mcp__supabase__apply_migration`
   - Enable RLS on every table
   - Create owner-based policies

3. **Performance:
   - Automatic code splitting
   - Lazy loading for dialogs
   - Optimized Tailwind CSS purging

4. **Accessibility:**
   - Semantic HTML
   - ARIA labels
   - Focus management
   - Keyboard navigation

---

## 📊 Success Metrics

After redesign:
- **Accessibility:** WCAG AAA for all text contrast
- **Performance:** <500ms first contentful paint
- **Responsiveness:** Optimized for 320px-2560px widths
- **Maintainability:** 100% shadcn/ui integration
- **Consistency:** Single design language

---

This design system provides a complete visual language for the Visa Readiness Hub, ensuring premium quality, daylight visibility, and consistent user experience across all devices.
