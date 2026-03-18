# Appointment Day

## Objective
Manage the full day-of-appointment flow from reminders through treatment completion, including check-in, treatment notes, payment collection, and post-treatment actions.

## When to Use
- 24 hours before an appointment (reminder)
- On the day of a scheduled appointment
- When marking an appointment as completed, cancelled, or no-show

## Prerequisites
- Appointment exists with status CONFIRMED
- Notification templates configured for BOOKING_REMINDER_24H
- Consent forms completed for the treatment (see [Consent Forms](consent-forms.md))

## Steps

### 1. 24-Hour Reminder (Automated)

- POST /appointments/send-reminders (triggered by cron job)
- Finds all appointments in the next 24 hours where `reminderSent` is false
- For each appointment:
  - Sends templated notification (email + SMS) using BOOKING_REMINDER_24H template
  - Creates in-app notification for the client
  - Marks `reminderSent: true` on the appointment
- Template variables: `{name}`, `{treatment}`, `{date}`, `{time}`, `{practitioner}`

### 2. Patient Check-In

- Admin/practitioner verifies patient has arrived
- Check consent form status:
  - GET /forms/submissions filtered by clientId and treatmentId
  - Ensure treatment-specific CONSENT form is completed and signed
  - If not complete → send form immediately via POST /forms/request
- Review medical history: GET /patients/:id includes full medical history

### 3. Treatment Delivery

- Practitioner performs the treatment
- Capture treatment notes during or after:
  - PATCH /appointments/:id with `notes` field
- Update face map if applicable (treatment location annotations)
- Take before/after photos if consent given:
  - POST /patients/:id/images with base64 image data

### 4. Mark Appointment as COMPLETED

- PATCH /appointments/:id with `status: "COMPLETED"`
- **Automatic side effects on completion:**
  1. **Follow-up notification** sent to client
  2. **Aftercare SOP** emailed to client (treatment-specific aftercare guide)
  3. **Google review request** sent to client
  4. Patient's last visit date updated

### 5. Collect Balance Payment (if deposit-only)

- If appointment had depositPaid: true but balance remains:
  - Calculate balance: treatment price - depositAmountCents
  - POST /payments/create-intent with type: "BALANCE"
  - Process via Stripe, Klarna, Clearpay, or Cash
- See [Payments & Billing](payments-billing.md) for full payment flow

### 6. Handle No-Shows

- If patient doesn't arrive:
  - PATCH /appointments/:id with `status: "NO_SHOW"`
  - No-show is tracked on the patient's record
  - View no-show history: GET /reports/appointments/no-shows (includes per-client no-show count)
  - Consider: deposit may be non-refundable per cancellation policy

### 7. Handle Cancellations

- Patient cancellation (clients can only cancel, not reschedule):
  - PATCH /appointments/:id with `status: "CANCELLED"`
  - Cancellation notification sent to both client and practitioner
  - Template: BOOKING_CANCELLED
- Admin/practitioner can also cancel or reschedule:
  - Reschedule: update startsAt/endsAt fields
  - Overlap detection runs automatically on update

### 8. End-of-Day Review

- Check for incomplete appointments:
  - GET /reports/appointments/incomplete — CONFIRMED/PENDING appointments past their end time
  - These need to be marked as COMPLETED or NO_SHOW
- Review daysheet: GET /reports/appointments/daysheet for the date range

## Edge Cases

| Scenario | Action |
|----------|--------|
| Consent form not signed at check-in | Send form immediately, have patient complete on-site before treatment |
| Patient arrives late | Practitioner decides whether to proceed or reschedule |
| Treatment runs over scheduled time | Update notes, check next appointment for overlap |
| Patient wants to rebook immediately | Start [Appointment Booking](appointment-booking.md) flow |
| Multiple treatments in one visit | Each treatment has its own appointment record |

## Related Workflows
- [Appointment Booking](appointment-booking.md) — how the appointment was created
- [Consent Forms](consent-forms.md) — form verification at check-in
- [Payments & Billing](payments-billing.md) — balance collection
- [Follow-Up & Rebooking](follow-up-rebooking.md) — post-treatment retention
- [Patient Records](patient-records.md) — clinical documentation
