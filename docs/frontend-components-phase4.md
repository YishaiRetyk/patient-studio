# Phase 4 Frontend Components Documentation

**Version**: 1.0
**Last Updated**: 2025-11-07
**Feature**: Practitioner Calendar Management UI

## Overview

Phase 4 introduces comprehensive UI components for practitioner calendar management, including a full monthly calendar view, availability configuration modal, and waitlist management panel. All components are built with React 18, TypeScript, and Tailwind CSS, using React Query for API state management.

## Table of Contents

- [FullCalendar Component](#fullcalendar-component)
- [AvailabilitySettings Component](#availabilitysettings-component)
- [WaitlistPanel Component](#waitlistpanel-component)
- [Practitioner Calendar Page](#practitioner-calendar-page)
- [API Hooks](#api-hooks)
- [Type Definitions](#type-definitions)

---

## FullCalendar Component

**Location**: `frontend/src/components/calendar/FullCalendar.tsx`

A full-featured monthly calendar component that displays appointments with color-coded statuses, supports date navigation, and handles click events.

### Props

```typescript
interface FullCalendarProps {
  appointments: CalendarAppointment[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
}

interface CalendarAppointment {
  id: string;
  patientName: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}
```

### Features

- **Monthly calendar view** with proper week grid layout
- **Color-coded appointments** based on status:
  - SCHEDULED: Blue (`bg-blue-100 border-blue-200`)
  - COMPLETED: Green (`bg-green-100 border-green-200`)
  - CANCELLED: Gray (`bg-gray-100 border-gray-200`)
  - NO_SHOW: Red (`bg-red-100 border-red-200`)
- **Month navigation** (previous/next buttons)
- **Today indicator** with distinct styling
- **Multiple appointments per day** with overflow handling ("+ N more" badge)
- **Responsive design** - adapts to mobile/tablet/desktop
- **Click handlers** for dates and individual appointments

### Usage Example

```tsx
import { FullCalendar } from '@/components/calendar/FullCalendar';

function CalendarPage() {
  const appointments = [
    {
      id: 'apt-1',
      patientName: 'John Doe',
      startTime: '2025-11-10T09:00:00Z',
      endTime: '2025-11-10T10:00:00Z',
      status: 'SCHEDULED',
    },
  ];

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // Open new appointment modal for this date
  };

  const handleAppointmentClick = (apt: CalendarAppointment) => {
    console.log('Appointment clicked:', apt);
    // Navigate to appointment details
  };

  return (
    <FullCalendar
      appointments={appointments}
      onDateClick={handleDateClick}
      onAppointmentClick={handleAppointmentClick}
    />
  );
}
```

### Key Implementation Details

**Month Generation**:
```typescript
// Generates calendar grid including padding days from prev/next month
const monthDays = generateMonthDays(currentMonth);
// Returns array of Date objects for the entire calendar grid (42 cells)
```

**Appointment Filtering**:
```typescript
// Gets appointments for a specific date (day-level matching)
const getAppointmentsForDate = (date: Date): CalendarAppointment[] => {
  return appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime);
    return isSameDay(aptDate, date);
  });
};
```

**Overflow Handling**:
```typescript
// Shows first 3 appointments, hides rest with "+ N more" badge
{dayAppointments.slice(0, 3).map((apt) => (
  // Render appointment badge
))}
{dayAppointments.length > 3 && (
  <div className="text-xs text-gray-500">
    +{dayAppointments.length - 3} more
  </div>
)}
```

### Accessibility

- Semantic HTML with proper heading hierarchy
- Keyboard navigation for month controls
- ARIA labels for calendar navigation
- Click events with keyboard alternatives

---

## AvailabilitySettings Component

**Location**: `frontend/src/components/practitioners/AvailabilitySettings.tsx`

A modal component for practitioners to configure their weekly available hours with real-time validation.

### Props

```typescript
interface AvailabilitySettingsProps {
  initialHours?: AvailableHours;
  onSave: (hours: AvailableHours) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface AvailableHours {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

interface TimeSlot {
  start: string; // Format: "HH:MM" (24-hour)
  end: string;
}
```

### Features

- **Weekly schedule editor** for all 7 days
- **Multiple time slots per day** (add/remove buttons)
- **Real-time validation**:
  - Time format (HH:MM, 24-hour)
  - End time after start time
  - Minimum 30-minute duration
  - Overlap detection within same day
- **Visual error indicators** with inline messages
- **Optimistic updates** with loading states
- **Modal overlay** with backdrop click to close

### Usage Example

```tsx
import { AvailabilitySettings } from '@/components/practitioners/AvailabilitySettings';
import { useUpdateAvailableHours } from '@/lib/api/practitioners';

function CalendarSettings() {
  const [showModal, setShowModal] = useState(false);
  const updateHours = useUpdateAvailableHours();

  const currentHours = {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    // ... other days
  };

  const handleSave = async (hours: AvailableHours) => {
    await updateHours.mutateAsync({
      id: practitionerId,
      data: { availableHours: hours },
    });
    setShowModal(false);
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Configure Availability
      </button>

      {showModal && (
        <AvailabilitySettings
          initialHours={currentHours}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
          isLoading={updateHours.isLoading}
        />
      )}
    </>
  );
}
```

### Validation Logic

**Time Format Validation**:
```typescript
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
if (!timeRegex.test(slot.start)) {
  errors[`${day}-${idx}-start`] = 'Invalid time format (use HH:MM)';
}
```

**End After Start Validation**:
```typescript
const [startH, startM] = slot.start.split(':').map(Number);
const [endH, endM] = slot.end.split(':').map(Number);
if (endH * 60 + endM <= startH * 60 + startM) {
  errors[`${day}-${idx}`] = 'End time must be after start time';
}
```

**Overlap Detection**:
```typescript
slots.forEach((otherSlot, otherIdx) => {
  if (idx === otherIdx) return;

  const overlap =
    (os1 >= os2 && os1 < oe2) ||
    (oe1 > os2 && oe1 <= oe2) ||
    (os1 <= os2 && oe1 >= oe2);

  if (overlap) {
    errors[key] = 'Time slots overlap';
  }
});
```

### Styling

- Modal overlay: Dark semi-transparent backdrop
- Modal content: Centered, max-width container with shadow
- Time inputs: Styled with border, focus states
- Error states: Red border, red text
- Buttons: Primary (blue), secondary (gray), danger (red)

---

## WaitlistPanel Component

**Location**: `frontend/src/components/waitlist/WaitlistPanel.tsx`

A side panel component displaying the waitlist queue in FIFO order with status badges and action buttons.

### Props

```typescript
interface WaitlistPanelProps {
  entries: WaitlistEntry[];
  onNotify?: (entryId: string) => void | Promise<void>;
  onRemove?: (entryId: string) => void | Promise<void>;
  isLoading?: boolean;
}

interface WaitlistEntry {
  id: string;
  patientId: string;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED';
  desiredDateStart: string; // ISO 8601
  desiredDateEnd: string;   // ISO 8601
  preferredTimeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  notifiedAt?: string;
  claimedAt?: string;
  patient?: {
    fullName: string;
    email: string;
  };
  createdAt: string;
}
```

### Features

- **FIFO ordering** (oldest first with position badges #1, #2, #3...)
- **Status indicators** with color coding:
  - ACTIVE: Gray (waiting)
  - CLAIMED: Green (patient claimed slot)
  - EXPIRED: Red (claim window expired)
- **Relative timestamps** ("Added 2 hours ago", "Notified 15 minutes ago")
- **Date range display** in human-readable format
- **Preferred time badges** (Morning/Afternoon/Evening)
- **Action buttons** (manual notify, remove from waitlist)
- **Empty state** with helpful messaging

### Usage Example

```tsx
import { WaitlistPanel } from '@/components/waitlist/WaitlistPanel';
import { usePractitionerWaitlistEntries, useRemoveFromWaitlist } from '@/lib/api/waitlist';

function PractitionerDashboard() {
  const practitionerId = 'practitioner-123';
  const { data: entries = [] } = usePractitionerWaitlistEntries(practitionerId);
  const removeFromWaitlist = useRemoveFromWaitlist();

  const handleRemove = async (entryId: string) => {
    if (confirm('Remove patient from waitlist?')) {
      await removeFromWaitlist.mutateAsync({ id: entryId });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* Calendar view */}
      </div>
      <div className="col-span-1">
        <WaitlistPanel
          entries={entries}
          onRemove={handleRemove}
          isLoading={removeFromWaitlist.isLoading}
        />
      </div>
    </div>
  );
}
```

### Status Colors

```typescript
const statusColors = {
  ACTIVE: 'bg-gray-100 text-gray-800 border-gray-300',
  CLAIMED: 'bg-green-100 text-green-800 border-green-300',
  EXPIRED: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  ACTIVE: 'Waiting',
  CLAIMED: 'Claimed',
  EXPIRED: 'Expired',
};
```

### FIFO Sorting

```typescript
// Entries are automatically sorted by createdAt (oldest first)
const sortedEntries = [...entries].sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);
```

---

## Practitioner Calendar Page

**Location**: `frontend/src/app/(practitioner)/calendar/page.tsx`

The main practitioner calendar management page integrating all Phase 4 components.

### Features

- **Integrated calendar view** with FullCalendar component
- **Availability configuration** button opening AvailabilitySettings modal
- **iCal feed generation** with one-click copy to clipboard
- **Waitlist panel** showing FIFO queue
- **Current availability display** showing configured hours
- **Responsive layout** (calendar + waitlist on desktop, stacked on mobile)
- **React Query integration** for optimistic updates and cache invalidation

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: "Practitioner Calendar"                     │
│ Actions: [Configure Availability] [Copy iCal URL]   │
├─────────────────────────────────────────────────────┤
│ Current Availability Display (Weekly Hours Grid)    │
├─────────────────────────────┬───────────────────────┤
│                             │                       │
│ Full Calendar               │ Waitlist Panel        │
│ (2 columns on desktop)      │ (1 column on desktop) │
│                             │                       │
│                             │                       │
└─────────────────────────────┴───────────────────────┘
```

### Usage Example

```tsx
// The page is accessed at: /calendar (practitioner role required)
// No props needed - it's a standalone page component

// Key interactions:
// 1. Configure Availability -> Opens modal
// 2. Copy iCal URL -> Generates token, copies to clipboard
// 3. Click date -> Can open new appointment modal (future feature)
// 4. Click appointment -> Navigate to appointment details
// 5. Remove from waitlist -> Removes entry after confirmation
```

### State Management

```typescript
// React Query hooks for server state
const { data: practitioner } = usePractitioner(practitionerId);
const { data: waitlistEntries = [] } = usePractitionerWaitlistEntries(practitionerId);

// Local UI state
const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
const [copiedUrl, setCopiedUrl] = useState(false);

// Mutations with optimistic updates
const updateHours = useUpdateAvailableHours();
const generateToken = useGenerateCalendarToken();
```

### iCal URL Generation Flow

```typescript
const handleGenerateCalendarUrl = async () => {
  try {
    // 1. Generate new token (invalidates previous)
    const result = await generateTokenMutation.mutateAsync(practitionerId);

    // 2. Copy URL to clipboard
    await navigator.clipboard.writeText(result.calendarUrl);

    // 3. Show success feedback
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  } catch (error) {
    console.error('Failed to generate calendar URL:', error);
    alert('Failed to generate calendar URL');
  }
};
```

---

## API Hooks

**Location**: `frontend/src/lib/api/`

React Query hooks for Phase 4 API integration.

### Practitioners Hooks

**File**: `frontend/src/lib/api/practitioners.ts`

```typescript
// Fetch single practitioner
export function usePractitioner(
  id: string,
  options?: UseQueryOptions<Practitioner>
) {
  return useQuery({
    queryKey: ['practitioner', id],
    queryFn: () => practitionersApi.getOne(id),
    enabled: !!id,
    ...options,
  });
}

// Update available hours
export function useUpdateAvailableHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: practitionersApi.updateAvailableHours,
    onSuccess: (data) => {
      // Invalidate practitioner query to refetch
      queryClient.invalidateQueries({ queryKey: ['practitioner', data.id] });
    },
  });
}

// Generate calendar token
export function useGenerateCalendarToken() {
  return useMutation({
    mutationFn: practitionersApi.generateCalendarToken,
  });
}
```

### Waitlist Hooks

**File**: `frontend/src/lib/api/waitlist.ts`

```typescript
// Get patient's waitlist entries
export function usePatientWaitlistEntries(
  patientId: string,
  options?: UseQueryOptions<WaitlistEntry[]>
) {
  return useQuery({
    queryKey: ['waitlist', 'patient', patientId],
    queryFn: () => waitlistApi.getPatientWaitlistEntries(patientId),
    enabled: !!patientId,
    ...options,
  });
}

// Get practitioner's waitlist entries
export function usePractitionerWaitlistEntries(
  practitionerId: string,
  options?: UseQueryOptions<WaitlistEntry[]>
) {
  return useQuery({
    queryKey: ['waitlist', 'practitioner', practitionerId],
    queryFn: () => waitlistApi.getPractitionerWaitlistEntries(practitionerId),
    enabled: !!practitionerId,
    ...options,
  });
}

// Add to waitlist
export function useAddToWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waitlistApi.addToWaitlist,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'practitioner', variables.practitionerId] });
    },
  });
}

// Claim waitlist slot
export function useClaimWaitlistSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waitlistApi.claimWaitlistSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });
}

// Remove from waitlist
export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waitlistApi.removeFromWaitlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });
}
```

### Appointments Hooks Update

**File**: `frontend/src/lib/api/appointments.ts`

```typescript
// Cancel appointment (new in Phase 4)
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentsApi.cancel,
    onSuccess: () => {
      // Invalidate appointments to show cancelled status
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      // Invalidate waitlist to show newly notified entries
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });
}
```

---

## Type Definitions

### Shared Types

**File**: `frontend/src/types/calendar.ts` (recommended location)

```typescript
export interface AvailableHours {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // Format: "HH:MM" (24-hour)
  end: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type WaitlistStatus = 'ACTIVE' | 'CLAIMED' | 'EXPIRED';
export type PreferredTimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
```

---

## Styling Guide

### Tailwind Conventions

All components use Tailwind CSS with consistent patterns:

**Color Palette**:
- Primary (Blue): `bg-blue-500`, `text-blue-600`, `border-blue-200`
- Success (Green): `bg-green-500`, `text-green-600`, `border-green-200`
- Warning (Yellow): `bg-yellow-500`, `text-yellow-600`, `border-yellow-200`
- Danger (Red): `bg-red-500`, `text-red-600`, `border-red-200`
- Neutral (Gray): `bg-gray-100`, `text-gray-600`, `border-gray-200`

**Spacing Scale**:
- Small: `p-2`, `gap-2`, `space-y-2`
- Medium: `p-4`, `gap-4`, `space-y-4`
- Large: `p-6`, `gap-6`, `space-y-6`

**Responsive Breakpoints**:
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

**Example**:
```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
  <div className="lg:col-span-2">{/* Calendar */}</div>
  <div className="lg:col-span-1">{/* Waitlist */}</div>
</div>
```

---

## Testing Guidelines

### Component Testing

**Using React Testing Library**:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FullCalendar } from '@/components/calendar/FullCalendar';

describe('FullCalendar', () => {
  it('renders appointments for the current month', () => {
    const appointments = [
      {
        id: '1',
        patientName: 'John Doe',
        startTime: '2025-11-10T09:00:00Z',
        endTime: '2025-11-10T10:00:00Z',
        status: 'SCHEDULED',
      },
    ];

    render(<FullCalendar appointments={appointments} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onDateClick when a date is clicked', () => {
    const handleDateClick = jest.fn();
    render(<FullCalendar appointments={[]} onDateClick={handleDateClick} />);

    const dateCell = screen.getByText('15'); // Click on 15th
    fireEvent.click(dateCell);

    expect(handleDateClick).toHaveBeenCalled();
  });
});
```

### Integration Testing

**Using Playwright (E2E)**:

```typescript
import { test, expect } from '@playwright/test';

test('practitioner can configure availability', async ({ page }) => {
  await page.goto('/calendar');

  // Open availability modal
  await page.click('text=Configure Availability');

  // Set Monday hours
  await page.fill('[data-testid="monday-start-0"]', '09:00');
  await page.fill('[data-testid="monday-end-0"]', '17:00');

  // Save
  await page.click('text=Save Changes');

  // Verify success
  await expect(page.locator('text=09:00 - 17:00')).toBeVisible();
});
```

---

## Performance Optimization

### React Query Configuration

**Stale Time**: 1 minute (60,000ms)
- Prevents unnecessary refetches for rapidly changing data

**Cache Time**: 5 minutes (300,000ms)
- Keeps data in cache for quick access

**Refetch on Window Focus**: Disabled
- Prevents refetch when user returns to tab (can be enabled if needed)

### Memoization

Use `React.memo` for expensive components:

```typescript
export const FullCalendar = React.memo(({ appointments, onDateClick }: Props) => {
  // Component logic
});
```

Use `useMemo` for expensive computations:

```typescript
const monthDays = useMemo(
  () => generateMonthDays(currentMonth),
  [currentMonth]
);
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- ✅ Keyboard navigation
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast ratios (4.5:1 minimum)
- ✅ Touch target sizes (44x44px minimum)

---

## Changelog

### Version 1.0 (2025-11-07)
- Initial Phase 4 component release
- FullCalendar: Monthly view with status color coding
- AvailabilitySettings: Weekly hour configuration with validation
- WaitlistPanel: FIFO queue display with status badges
- Practitioner Calendar Page: Integrated dashboard

---

## Support

For component support, please contact:
- **Email**: frontend-support@patient-studio.com
- **Documentation**: https://docs.patient-studio.com/frontend
- **Component Storybook**: https://storybook.patient-studio.com (coming soon)
