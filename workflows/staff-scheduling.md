# Staff Scheduling & Roster Management

## Objective
Configure practitioner availability, manage working hours, handle time blocking, and maintain the clinic's operational schedule.

## When to Use
- Setting up a new practitioner's schedule
- Modifying working hours or days
- Blocking practitioner time (holidays, training, breaks)
- Closing the clinic for specific dates
- Reviewing timesheets

## Prerequisites
- Practitioner accounts created with role: PRACTITIONER
- Admin access for roster management

## Steps

### 1. View the Roster

- GET /staff/roster
- Returns all practitioners with:
  - Name, email, specialties, avatar
  - Working hours (start/end time per day)
  - Working days (array of day numbers, 0=Sunday through 6=Saturday)
  - Active status

### 2. Configure Working Hours

- PATCH /staff/:id/working-hours (admin only)
  - `workingHoursStart`: start time (e.g., "09:00")
  - `workingHoursEnd`: end time (e.g., "17:00")
  - `workingDays`: array of day numbers (e.g., [1, 2, 3, 4, 5] for Mon-Fri)
- These hours determine when the practitioner appears as available for bookings
- Changes take effect immediately for future availability queries

### 3. Block Practitioner Time

- POST /blocked-slots
  - `practitionerId`: the practitioner
  - `startsAt`: block start (ISO datetime)
  - `endsAt`: block end (ISO datetime)
  - `reason`: (optional) e.g., "Holiday", "Training", "Lunch"
- Blocked slots are excluded from availability calculation
- Practitioners can block their own time; admins can block anyone's
- GET /blocked-slots — view all blocks (practitioners see own, admins see all)
- DELETE /blocked-slots/:id — remove a block

### 4. Close the Clinic

- Clinic-wide closures managed via closed dates
- When a date is marked as closed, NO practitioners show availability for that day
- Availability service checks closed dates before generating slots

### 5. How Availability is Calculated

The availability service (used by GET /appointments/availability) follows this logic:

```
Available Slots = Working Hours
  - Existing Appointments (CONFIRMED/PENDING)
  - Blocked Slots
  - Clinic Closed Dates
  - Redis-Locked Slots (10-min checkout locks)
  - Past Time Slots (can't book in the past)
```

Slots are generated at **15-minute intervals** matching the treatment duration.

### 6. View Timesheets

- GET /staff/timesheet
  - `from`, `to`: date range
  - `practitionerId`: (optional) specific practitioner
- Returns appointments grouped by practitioner
- Shows: appointment count, time worked, treatments performed
- Useful for payroll and productivity review

### 7. Practitioner Profile Management

- Each practitioner has:
  - `bio`: professional biography
  - `specialties`: array of treatment specialties
  - `avatarUrl`: profile photo
- These display on the public booking page for patient selection

## Edge Cases

| Scenario | Action |
|----------|--------|
| Practitioner blocks time that has existing appointments | Block is created but appointments remain — admin must reschedule conflicts manually |
| Working hours changed with future bookings | Existing appointments unaffected — only new availability queries reflect the change |
| Practitioner works different hours on different days | Set standard hours, use blocked slots for day-specific adjustments |
| Bank holiday not in closed dates | Add as closed date to prevent bookings |
| Practitioner leaves the clinic | Archive their account — existing records preserved |
| Mid-day break needed | Create a blocked slot for the break period (e.g., 12:00-13:00 daily) |

## Related Workflows
- [Appointment Booking](appointment-booking.md) — availability drives the booking flow
- [Staff Targets](staff-targets.md) — performance tracking for practitioners
- [Appointment Day](appointment-day.md) — daysheet and schedule review
- [Settings & Configuration](settings-configuration.md) — clinic-wide settings
