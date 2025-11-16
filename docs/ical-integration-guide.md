# iCal Feed Integration Guide

**Version**: 1.0
**Last Updated**: 2025-11-07
**Feature**: RFC 5545-Compliant Calendar Export

## Overview

Patient Studio provides HIPAA-compliant iCal feed export for practitioners to sync their appointments to external calendar applications (Google Calendar, Apple Calendar, Outlook, etc.). The feed is token-authenticated for security and refreshes automatically to reflect real-time appointment changes.

## Table of Contents

- [Quick Start](#quick-start)
- [Generating Your Calendar URL](#generating-your-calendar-url)
- [Calendar Application Setup](#calendar-application-setup)
- [Technical Specifications](#technical-specifications)
- [Security & Privacy](#security--privacy)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Quick Start

**For Practitioners**:

1. Log into Patient Studio practitioner dashboard
2. Navigate to **Calendar** page
3. Click **"Copy iCal URL"** button
4. Paste URL into your preferred calendar application
5. Set refresh interval (recommended: every hour)

**5-Minute Setup**: Most practitioners can complete integration in under 5 minutes.

---

## Generating Your Calendar URL

### Step 1: Access the Calendar Page

Navigate to the practitioner calendar management page:
```
https://app.patient-studio.com/calendar
```

### Step 2: Generate Token

Click the **"Generate Calendar URL"** or **"Copy iCal URL"** button in the top-right corner.

**What happens**:
- A new secure token is generated (64-character hex string)
- Previous tokens are immediately invalidated
- The URL is automatically copied to your clipboard
- Success message: "Calendar URL copied to clipboard!"

**Your Calendar URL format**:
```
https://api.patient-studio.com/api/v1/calendar/export/YOUR_TOKEN_HERE
```

### Step 3: Security Reminders

⚠️ **Important Security Notes**:
- **Do not share your calendar URL** - it grants read access to your appointment schedule
- **Keep it private** - treat it like a password
- **Regenerate if compromised** - you can generate a new token anytime
- **HIPAA compliance** - patient names are NOT included in feed (appointments show as "Appointment - [Type]")

---

## Calendar Application Setup

### Google Calendar

**Desktop (Web)**:

1. Open [Google Calendar](https://calendar.google.com)
2. Click the **"+"** next to "Other calendars" (left sidebar)
3. Select **"From URL"**
4. Paste your Patient Studio calendar URL
5. Click **"Add calendar"**
6. Done! Your appointments will appear in Google Calendar

**Settings** (Optional):
- **Name**: Right-click the calendar → Settings → Rename to "Patient Studio Appointments"
- **Color**: Choose a distinct color for easy identification
- **Notifications**: Configure reminder preferences

**Refresh Frequency**: Google Calendar checks the feed approximately every 8-12 hours.

---

### Apple Calendar (macOS / iOS)

**macOS**:

1. Open **Calendar** app
2. Go to **File** → **New Calendar Subscription** (or press ⌘⌥S)
3. Paste your Patient Studio calendar URL
4. Click **"Subscribe"**
5. Configure subscription settings:
   - **Name**: "Patient Studio Appointments"
   - **Location**: "iCloud" (recommended) or "On My Mac"
   - **Auto-refresh**: "Every hour" (recommended)
   - **Remove**: "After 1 month" (optional, cleans up old appointments)
6. Click **"OK"**

**iOS (iPhone/iPad)**:

1. Open **Settings** app
2. Scroll down to **Calendar** → **Accounts**
3. Tap **"Add Account"** → **"Other"**
4. Tap **"Add Subscribed Calendar"**
5. Paste your Patient Studio calendar URL
6. Tap **"Next"**
7. Configure:
   - **Description**: "Patient Studio Appointments"
   - **Use SSL**: ON (automatic)
8. Tap **"Save"**

**Refresh Frequency**: Can be set to 15 minutes, 30 minutes, 1 hour, etc.

---

### Microsoft Outlook

**Outlook on the Web**:

1. Go to [Outlook Calendar](https://outlook.office.com/calendar)
2. Click **"Add calendar"** (left sidebar)
3. Select **"Subscribe from web"**
4. Paste your Patient Studio calendar URL
5. Name: "Patient Studio Appointments"
6. (Optional) Choose a color and charm
7. Click **"Import"**

**Outlook Desktop (Windows/Mac)**:

1. Open Outlook
2. Go to **Calendar** view
3. Right-click **"My Calendars"** → **"Add Calendar"** → **"From Internet"**
4. Paste your Patient Studio calendar URL
5. Click **"OK"**
6. Confirm the subscription

**Refresh Frequency**: Outlook checks the feed every 1-3 hours by default.

---

### Other Calendar Applications

**Mozilla Thunderbird**:
1. Calendar tab → Right-click in calendar list
2. "New Calendar" → "On the Network" → "iCalendar (ICS)"
3. Paste URL → Configure name and color

**Fantastical (macOS/iOS)**:
1. Preferences → Accounts → Add Account
2. Choose "Subscriptions"
3. Paste URL and configure settings

**BusyCal (macOS)**:
1. File → New Calendar Subscription
2. Paste URL → Set refresh frequency

**Any RFC 5545-compliant calendar app**: Use the "Subscribe to calendar" or "Add calendar from URL" feature with your Patient Studio calendar URL.

---

## Technical Specifications

### RFC 5545 Compliance

Patient Studio's iCal feed fully complies with RFC 5545 (Internet Calendaring and Scheduling Core Object Specification).

**Calendar Properties**:
```
BEGIN:VCALENDAR
VERSION:2.0                              # iCalendar version
PRODID:-//Patient Studio//Calendar//EN   # Product identifier
CALSCALE:GREGORIAN                       # Gregorian calendar
METHOD:PUBLISH                           # Read-only subscription
```

**Event Properties**:
```
BEGIN:VEVENT
UID:appointment-{id}@patient-studio.com  # Unique identifier
DTSTAMP:20251107T120000Z                 # Timestamp (UTC)
DTSTART:20251110T090000Z                 # Start time (UTC)
DTEND:20251110T100000Z                   # End time (UTC)
SUMMARY:Appointment - Physical Therapy   # Title (no patient name)
DESCRIPTION:1-hour appointment           # Generic description
CLASS:PRIVATE                            # HIPAA compliance
TRANSP:OPAQUE                            # Shows as busy
STATUS:CONFIRMED                         # Appointment status
END:VEVENT
```

### Time Zones

- All times are in **UTC** (Coordinated Universal Time)
- Format: `YYYYMMDDTHHmmssZ` (ISO 8601)
- Calendar applications automatically convert to your local time zone

**Example**:
- Appointment stored as: `20251110T090000Z` (9:00 AM UTC)
- Displayed in New York: 4:00 AM EST (UTC-5)
- Displayed in London: 9:00 AM GMT (UTC+0)
- Displayed in Tokyo: 6:00 PM JST (UTC+9)

### Appointment Filtering

Only the following appointment statuses are included in the feed:
- ✅ **SCHEDULED**: Confirmed upcoming appointments
- ✅ **COMPLETED**: Past appointments (for record keeping)

**Excluded statuses**:
- ❌ CANCELLED
- ❌ NO_SHOW

### Feed Size & Performance

- **Feed size**: Approximately 1-2 KB per appointment
- **Typical feed**: 100 appointments = ~150 KB
- **Load time**: < 500ms for typical feeds
- **Caching**: Calendar apps cache feeds to minimize server requests

---

## Security & Privacy

### HIPAA Compliance

Patient Studio's iCal feed is designed with HIPAA compliance in mind:

**What is NOT included** (Protected Health Information - PHI):
- ❌ Patient names
- ❌ Patient contact information
- ❌ Diagnosis or treatment details
- ❌ Medical record numbers
- ❌ Any personally identifiable information (PII)

**What IS included**:
- ✅ Appointment date and time
- ✅ Appointment type (e.g., "Physical Therapy", "Initial Consultation")
- ✅ Duration
- ✅ Generic descriptions ("1-hour appointment")

**Event Privacy**:
- `CLASS:PRIVATE` - Marks all events as private
- `TRANSP:OPAQUE` - Shows as "busy" in free/busy lookups
- No patient-specific details in any field

### Token Security

**Token Properties**:
- **Length**: 64 characters (32 bytes, hex-encoded)
- **Generation**: Cryptographically secure (`crypto.randomBytes(32)`)
- **Entropy**: 256 bits (highly secure)
- **Expiration**: No automatic expiration
- **Invalidation**: Previous tokens immediately invalidated on new generation

**Best Practices**:
1. **Keep private**: Don't share your calendar URL
2. **Use HTTPS**: Always access via HTTPS (enforced by Patient Studio)
3. **Regenerate if exposed**: Generate new token if URL is accidentally shared
4. **Monitor access**: Review calendar sync settings periodically
5. **Revoke if needed**: Generate new token to revoke old access

### Network Security

- **HTTPS only**: All calendar feeds served over TLS 1.2+
- **No authentication required**: Token in URL provides access (URL-based security)
- **Rate limiting**: 60 requests per minute per token
- **Server-side logs**: All access attempts are logged for security auditing

---

## Troubleshooting

### Feed Not Updating

**Problem**: Calendar app shows old appointments or missing new ones.

**Solutions**:
1. **Check refresh interval**: Most apps refresh every 1-3 hours by default
2. **Manual refresh**:
   - Google Calendar: No manual option (wait for auto-refresh)
   - Apple Calendar: Right-click calendar → "Refresh"
   - Outlook: Right-click calendar → "Update Folder"
3. **Verify URL**: Make sure you're using the latest token (regenerate if unsure)
4. **Network connectivity**: Ensure calendar app has internet access

**Expected refresh delays**:
- Apple Calendar: 15 minutes - 1 hour (based on your setting)
- Google Calendar: 8-12 hours
- Outlook: 1-3 hours
- Thunderbird/Fantastical: 15 minutes - 1 hour

---

### "Cannot Subscribe" or "Invalid URL" Error

**Problem**: Calendar app rejects the subscription URL.

**Solutions**:
1. **Check URL format**: Ensure URL starts with `https://` and is complete
2. **Remove trailing spaces**: Paste into text editor first to verify no extra characters
3. **Try incognito/private**: Some browsers interfere with URL copying
4. **Regenerate token**: Generate a fresh URL from Patient Studio
5. **Check app version**: Ensure calendar app is up-to-date

**Common mistakes**:
- Missing `https://` prefix
- Extra spaces or line breaks in URL
- Incomplete token (should be 64 characters)

---

### Appointments Showing Wrong Time

**Problem**: Appointments appear at incorrect times in your calendar.

**Solutions**:
1. **Check time zone settings**: Ensure calendar app is set to correct time zone
2. **System time zone**:
   - macOS: System Preferences → Date & Time → Time Zone
   - Windows: Settings → Time & Language → Date & time
   - iOS: Settings → General → Date & Time
3. **Calendar app time zone**: Check app-specific time zone settings
4. **Daylight Saving Time**: Verify DST is correctly configured

**Note**: Patient Studio stores all appointments in UTC and relies on calendar apps to convert to local time.

---

### 401 Unauthorized Error

**Problem**: Calendar app shows "401 Unauthorized" or "Access Denied" error.

**Cause**: Invalid or expired calendar token.

**Solutions**:
1. **Regenerate token**: Go to Patient Studio → Calendar → "Generate Calendar URL"
2. **Update subscription**: Remove old subscription and add new one with fresh URL
3. **Verify account status**: Ensure your Patient Studio account is active

---

### Feed Empty / No Appointments

**Problem**: Calendar feed loads but shows no appointments.

**Possible causes**:
1. **No scheduled appointments**: Check Patient Studio dashboard
2. **All appointments cancelled**: Only SCHEDULED and COMPLETED show in feed
3. **Token mismatch**: Ensure you're using correct practitioner's token
4. **Sync delay**: Wait up to 1 hour for initial sync

**Solutions**:
1. Verify appointments exist in Patient Studio
2. Check appointment statuses (must be SCHEDULED or COMPLETED)
3. Wait for calendar app to refresh
4. Try manual refresh (if supported by app)

---

## FAQ

### Can patients access the calendar feed?

No. Calendar feed is practitioner-only. Patients cannot generate tokens or access appointment schedules.

### What happens if I generate a new token?

- Old token immediately stops working
- All calendar subscriptions using old token will fail to refresh
- You must update calendar apps with new URL

### Can I have multiple calendar subscriptions?

Yes. You can subscribe to the same feed in multiple calendar apps (e.g., Google Calendar on phone, Outlook on computer). They all use the same token.

### How do I stop sharing my calendar?

1. Generate a new token in Patient Studio (invalidates old URL)
2. OR: Unsubscribe/remove calendar from calendar app

### Does the feed work offline?

No. Calendar apps need internet connection to fetch feed updates. However, once synced, appointments are cached locally and visible offline until next refresh attempt.

### Can I customize appointment titles?

Not currently. Appointment titles are standardized for HIPAA compliance. Future versions may allow practitioner-defined templates.

### How many appointments can the feed handle?

No practical limit. Feeds with 1000+ appointments work fine. Calendar apps handle large feeds efficiently through caching.

### Can I share my calendar URL with my assistant?

**Caution**: Sharing gives full read access to your appointment schedule. For assistant access, consider:
1. Creating a dedicated practitioner account for your assistant
2. Using Patient Studio's role-based access instead (if available)
3. If you must share, regenerate token when access is no longer needed

### Will cancelled appointments disappear from my calendar?

Yes. When you cancel an appointment in Patient Studio, it's excluded from the feed. On next refresh (1-12 hours), it will disappear from your calendar app.

### Can I sync multiple practitioner calendars?

Yes. Each practitioner has their own unique token. Subscribe to multiple feeds and use different colors to distinguish them.

---

## Advanced Configuration

### Custom Refresh Intervals

**Apple Calendar**:
```bash
# Set to 5 minutes (300 seconds)
defaults write com.apple.iCal.plist "CalDAVRefreshRate" -int 300
```

**Google Calendar**:
- No user-configurable setting (automatic 8-12 hour interval)

**Outlook Desktop**:
1. File → Account Settings → Internet Calendars
2. Select subscription → Change
3. Adjust "Update Limit" slider

### Filtering by Date Range

Some calendar apps allow filtering subscriptions to specific date ranges:

**Apple Calendar**:
- Subscription settings → "Remove" → "After X months"
- Automatically removes old appointments from view

**BusyCal**:
- Subscription settings → Date range filter
- Custom start/end date constraints

### Webhook Integration (Coming Soon)

For real-time updates, Patient Studio will support webhook notifications:
- Immediate push on appointment changes
- No need to wait for periodic refresh
- Supported by CalDAV-capable apps

---

## Support

### Contact Support

- **Email**: calendar-support@patient-studio.com
- **Help Center**: https://help.patient-studio.com/calendar-integration
- **Status Page**: https://status.patient-studio.com

### Reporting Issues

When contacting support, please provide:
1. Calendar application name and version
2. Operating system
3. Error message (if any)
4. Screenshot of subscription settings
5. Whether manual refresh works

---

## Changelog

### Version 1.0 (2025-11-07)
- Initial iCal feed release
- RFC 5545 compliance
- HIPAA-compliant privacy (CLASS:PRIVATE)
- Token-based authentication
- Support for major calendar applications

---

## Additional Resources

- [RFC 5545 Specification](https://tools.ietf.org/html/rfc5545)
- [HIPAA Compliance Guide](https://docs.patient-studio.com/hipaa)
- [API Documentation](https://docs.patient-studio.com/api)
- [Calendar Application Compatibility Matrix](https://docs.patient-studio.com/calendar-compatibility)

---

**Last Updated**: 2025-11-07
**Document Version**: 1.0
**Next Review**: 2025-12-07
