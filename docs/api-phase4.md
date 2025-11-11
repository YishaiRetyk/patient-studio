# Phase 4 API Documentation: Practitioner Calendar Management

**Version**: 1.0
**Last Updated**: 2025-11-07
**Feature**: Practitioner Calendar Management & Scheduling

## Overview

Phase 4 introduces comprehensive practitioner calendar management features, including availability configuration, waitlist management with auto-notification, and RFC 5545-compliant iCal feed export for external calendar integration.

## Table of Contents

- [Practitioners API](#practitioners-api)
- [Waitlist API](#waitlist-api)
- [Calendar Export API](#calendar-export-api)
- [Appointments API Updates](#appointments-api-updates)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

---

## Practitioners API

### Update Available Hours

Configure a practitioner's weekly available hours for appointment booking.

**Endpoint**: `PATCH /api/v1/practitioners/:id/hours`

**Authentication**: Required (JWT)
**Authorization**: `PRACTITIONER` or `ADMIN` role

**Path Parameters**:
- `id` (string, required): Practitioner ID

**Request Body**:
```json
{
  "availableHours": {
    "monday": [
      { "start": "09:00", "end": "12:00" },
      { "start": "13:00", "end": "17:00" }
    ],
    "tuesday": [
      { "start": "09:00", "end": "17:00" }
    ],
    "wednesday": [],
    "thursday": [
      { "start": "10:00", "end": "16:00" }
    ],
    "friday": [
      { "start": "09:00", "end": "15:00" }
    ],
    "saturday": [],
    "sunday": []
  }
}
```

**Validation Rules**:
- Time format: `HH:MM` (24-hour format)
- Valid days: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
- End time must be after start time
- Minimum slot duration: 30 minutes
- Maximum slot duration: 24 hours
- Slots must not overlap within the same day

**Response** (200 OK):
```json
{
  "id": "practitioner-123",
  "userId": "user-456",
  "fullName": "Dr. Sarah Johnson",
  "specialization": "Physical Therapy",
  "licenseNumber": "PT12345",
  "availableHours": {
    "monday": [
      { "start": "09:00", "end": "12:00" },
      { "start": "13:00", "end": "17:00" }
    ]
  },
  "calendarToken": "abc123...",
  "tenantId": "tenant-789",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-11-07T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid time format or overlapping slots
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Practitioner not found

**Example**:
```bash
curl -X PATCH https://api.patient-studio.com/api/v1/practitioners/practitioner-123/hours \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "availableHours": {
      "monday": [{"start": "09:00", "end": "17:00"}]
    }
  }'
```

---

### Generate Calendar Token

Generate a new secure token for iCal feed access. This invalidates any previous token.

**Endpoint**: `PATCH /api/v1/practitioners/:id/calendar-token`

**Authentication**: Required (JWT)
**Authorization**: `PRACTITIONER` or `ADMIN` role

**Path Parameters**:
- `id` (string, required): Practitioner ID

**Response** (200 OK):
```json
{
  "calendarToken": "c7f9a8b2e4d1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
  "calendarUrl": "https://api.patient-studio.com/api/v1/calendar/export/c7f9a8b2e4d1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
}
```

**Security Notes**:
- Token is 64 characters (32 bytes, hex-encoded)
- Generated using `crypto.randomBytes(32)`
- Previous tokens are immediately invalidated
- Tokens do not expire but can be regenerated

**Example**:
```bash
curl -X PATCH https://api.patient-studio.com/api/v1/practitioners/practitioner-123/calendar-token \
  -H "Authorization: Bearer <token>"
```

---

## Waitlist API

### Add to Waitlist

Add a patient to the waitlist for a specific practitioner and date range.

**Endpoint**: `POST /api/v1/waitlist`

**Authentication**: Required (JWT)
**Authorization**: `PATIENT` or `ADMIN` role

**Request Body**:
```json
{
  "patientId": "patient-123",
  "practitionerId": "practitioner-456",
  "desiredDateStart": "2025-11-10T00:00:00.000Z",
  "desiredDateEnd": "2025-11-15T23:59:59.999Z",
  "preferredTimeOfDay": "MORNING"
}
```

**Fields**:
- `patientId` (string, required): Patient ID
- `practitionerId` (string, optional): Specific practitioner ID (null for any practitioner)
- `desiredDateStart` (ISO 8601, required): Start of desired date range
- `desiredDateEnd` (ISO 8601, required): End of desired date range
- `preferredTimeOfDay` (enum, optional): `MORNING`, `AFTERNOON`, `EVENING`

**Response** (201 Created):
```json
{
  "id": "waitlist-789",
  "patientId": "patient-123",
  "practitionerId": "practitioner-456",
  "status": "ACTIVE",
  "desiredDateStart": "2025-11-10T00:00:00.000Z",
  "desiredDateEnd": "2025-11-15T23:59:59.999Z",
  "preferredTimeOfDay": "MORNING",
  "notifiedAt": null,
  "claimedAt": null,
  "tenantId": "tenant-789",
  "createdAt": "2025-11-07T12:00:00.000Z",
  "updatedAt": "2025-11-07T12:00:00.000Z"
}
```

**Example**:
```bash
curl -X POST https://api.patient-studio.com/api/v1/waitlist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-123",
    "practitionerId": "practitioner-456",
    "desiredDateStart": "2025-11-10T00:00:00.000Z",
    "desiredDateEnd": "2025-11-15T23:59:59.999Z"
  }'
```

---

### Get Patient Waitlist Entries

Retrieve all waitlist entries for a specific patient.

**Endpoint**: `GET /api/v1/waitlist/patient/:patientId`

**Authentication**: Required (JWT)
**Authorization**: `PATIENT` (own entries), `PRACTITIONER`, or `ADMIN` role

**Path Parameters**:
- `patientId` (string, required): Patient ID

**Response** (200 OK):
```json
[
  {
    "id": "waitlist-789",
    "patientId": "patient-123",
    "practitionerId": "practitioner-456",
    "status": "ACTIVE",
    "desiredDateStart": "2025-11-10T00:00:00.000Z",
    "desiredDateEnd": "2025-11-15T23:59:59.999Z",
    "preferredTimeOfDay": "MORNING",
    "notifiedAt": null,
    "claimedAt": null,
    "position": 3,
    "practitioner": {
      "fullName": "Dr. Sarah Johnson",
      "specialization": "Physical Therapy"
    },
    "createdAt": "2025-11-07T12:00:00.000Z"
  }
]
```

---

### Get Practitioner Waitlist Entries

Retrieve all waitlist entries for a specific practitioner (FIFO order).

**Endpoint**: `GET /api/v1/waitlist/practitioner/:practitionerId`

**Authentication**: Required (JWT)
**Authorization**: `PRACTITIONER` (own waitlist) or `ADMIN` role

**Path Parameters**:
- `practitionerId` (string, required): Practitioner ID

**Response** (200 OK):
```json
[
  {
    "id": "waitlist-789",
    "patientId": "patient-123",
    "status": "ACTIVE",
    "desiredDateStart": "2025-11-10T00:00:00.000Z",
    "desiredDateEnd": "2025-11-15T23:59:59.999Z",
    "preferredTimeOfDay": "MORNING",
    "notifiedAt": null,
    "patient": {
      "fullName": "John Doe",
      "email": "john.doe@example.com"
    },
    "createdAt": "2025-11-07T12:00:00.000Z"
  }
]
```

**Note**: Entries are returned in FIFO order (oldest first)

---

### Claim Waitlist Slot

Patient claims a waitlist slot after receiving notification.

**Endpoint**: `PATCH /api/v1/waitlist/:id/claim`

**Authentication**: Required (JWT)
**Authorization**: `PATIENT` (own entry) or `ADMIN` role

**Path Parameters**:
- `id` (string, required): Waitlist entry ID

**Response** (200 OK):
```json
{
  "id": "waitlist-789",
  "status": "CLAIMED",
  "claimedAt": "2025-11-07T13:00:00.000Z",
  "message": "Waitlist slot claimed successfully"
}
```

**Business Rules**:
- Can only be claimed within 1 hour of notification (`notifiedAt` + 60 minutes)
- If claim window expires, status automatically changes to `EXPIRED`
- Claiming does NOT create an appointment (patient must still book)

**Error Responses**:
- `409 Conflict`: Claim window expired
- `400 Bad Request`: Entry not notified or already claimed

---

### Remove from Waitlist

Remove a patient from the waitlist.

**Endpoint**: `DELETE /api/v1/waitlist/:id`

**Authentication**: Required (JWT)
**Authorization**: `PATIENT` (own entry), `PRACTITIONER`, or `ADMIN` role

**Path Parameters**:
- `id` (string, required): Waitlist entry ID

**Response** (200 OK):
```json
{
  "message": "Waitlist entry removed successfully"
}
```

---

## Calendar Export API

### Export iCal Feed

Public endpoint (token-authenticated) to export practitioner calendar as iCal feed.

**Endpoint**: `GET /api/v1/calendar/export/:token`

**Authentication**: Token-based (no JWT required)
**Authorization**: Public access with valid calendar token

**Path Parameters**:
- `token` (string, required): Calendar token (64-character hex string)

**Response** (200 OK):
```
Content-Type: text/calendar
Content-Disposition: attachment; filename="calendar.ics"

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Patient Studio//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appointment-123@patient-studio.com
DTSTAMP:20251107T120000Z
DTSTART:20251110T090000Z
DTEND:20251110T100000Z
SUMMARY:Appointment - Physical Therapy
DESCRIPTION:1-hour appointment
CLASS:PRIVATE
TRANSP:OPAQUE
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

**iCal Properties**:
- `CLASS:PRIVATE` - HIPAA compliance (no patient names exposed)
- `TRANSP:OPAQUE` - Shows as busy in calendar
- `STATUS:CONFIRMED` - Only includes SCHEDULED and COMPLETED appointments
- `UID` format: `appointment-{id}@patient-studio.com`

**Integration Examples**:

**Google Calendar**:
```
1. Open Google Calendar
2. Settings → Add calendar → From URL
3. Paste: https://api.patient-studio.com/api/v1/calendar/export/{token}
```

**Apple Calendar**:
```
1. Open Calendar app
2. File → New Calendar Subscription
3. Paste URL and set refresh frequency
```

**Outlook**:
```
1. Open Outlook Calendar
2. Add calendar → From Internet
3. Enter URL
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Practitioner not found

---

## Appointments API Updates

### Cancel Appointment

Cancel an existing appointment and trigger waitlist notifications.

**Endpoint**: `PATCH /api/v1/appointments/:id/cancel`

**Authentication**: Required (JWT)
**Authorization**: `PATIENT` (own appointment), `PRACTITIONER`, or `ADMIN` role

**Path Parameters**:
- `id` (string, required): Appointment ID

**Request Body**:
```json
{
  "cancellationReason": "Patient requested reschedule"
}
```

**Response** (200 OK):
```json
{
  "id": "appointment-123",
  "status": "CANCELLED",
  "cancellationReason": "Patient requested reschedule",
  "cancelledAt": "2025-11-07T12:00:00.000Z"
}
```

**Side Effects**:
- Sets appointment status to `CANCELLED`
- Triggers waitlist notification to first matching ACTIVE entry (FIFO)
- Sends email to waitlisted patient with claim link
- Sets `notifiedAt` timestamp on waitlist entry
- Starts 1-hour claim window

**Waitlist Matching Logic**:
1. Find ACTIVE entries where:
   - `practitionerId` matches OR `practitionerId` is null (any practitioner)
   - `desiredDateStart` <= cancelled appointment start
   - `desiredDateEnd` >= cancelled appointment start
2. Order by `createdAt` ASC (FIFO)
3. Take first entry
4. Send notification email

---

## Data Models

### AvailableHours (JSONB)

Stored in `Practitioner.availableHours` as JSONB.

```typescript
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
  end: string;   // Format: "HH:MM" (24-hour)
}
```

### WaitlistEntry

```typescript
enum WaitlistStatus {
  ACTIVE = 'ACTIVE',       // Waiting for slot
  CLAIMED = 'CLAIMED',     // Patient claimed notification
  EXPIRED = 'EXPIRED'      // Claim window expired
}

enum PreferredTimeOfDay {
  MORNING = 'MORNING',     // 6am-12pm
  AFTERNOON = 'AFTERNOON', // 12pm-6pm
  EVENING = 'EVENING'      // 6pm-10pm
}

interface WaitlistEntry {
  id: string;
  patientId: string;
  practitionerId: string | null; // null = any practitioner
  status: WaitlistStatus;
  desiredDateStart: Date;
  desiredDateEnd: Date;
  preferredTimeOfDay?: PreferredTimeOfDay;
  notifiedAt?: Date;
  claimedAt?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "availableHours.monday.0.end",
    "issue": "End time must be after start time"
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | Bad Request | Invalid input or validation failure |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Business rule violation (e.g., expired claim window) |
| 500 | Internal Server Error | Server error |

### Validation Errors

Time validation:
```json
{
  "statusCode": 400,
  "message": "Invalid time format (use HH:MM)",
  "error": "Bad Request"
}
```

Overlap detection:
```json
{
  "statusCode": 400,
  "message": "Time slots overlap",
  "error": "Bad Request",
  "details": {
    "day": "monday",
    "slots": ["09:00-12:00", "11:00-13:00"]
  }
}
```

---

## Rate Limiting

All authenticated endpoints are rate-limited:
- **Practitioner/Patient**: 100 requests per minute
- **Admin**: 200 requests per minute
- **Public endpoints** (calendar export): 60 requests per minute per token

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699380000
```

---

## Changelog

### Version 1.0 (2025-11-07)
- Initial Phase 4 API release
- Practitioners: Available hours management, calendar token generation
- Waitlist: FIFO queue with auto-notification, 1-hour claim window
- Calendar: RFC 5545-compliant iCal export
- Appointments: Cancel with waitlist trigger

---

## Support

For API support, please contact:
- **Email**: api-support@patient-studio.com
- **Documentation**: https://docs.patient-studio.com
- **Status Page**: https://status.patient-studio.com
