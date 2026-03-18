# Appointment Booking

## Objective
Book a confirmed appointment for a patient, including availability check, slot locking, deposit payment, and confirmation notifications.

## When to Use
- Patient books via the public booking page or client portal
- Admin/practitioner books on behalf of a patient from the calendar

## Prerequisites
- Patient account exists and is registered
- Treatment catalogue has active treatments with pricing and duration
- Practitioner has working hours and days configured
- Stripe configured (or cash payment selected)
- Notification templates active for BOOKING_CONFIRMED

## Steps

### 1. Select Treatment and Practitioner

- Patient or admin selects a treatment and preferred practitioner
- Treatment data includes: name, duration (minutes), price (cents), category

### 2. Check Availability

- GET /appointments/availability
  - `practitionerId`: selected practitioner
  - `date`: desired date (YYYY-MM-DD)
  - `treatmentId`: selected treatment (used for duration)
- Returns array of available slots: `[{ startsAt, endsAt }]`
- **How availability is calculated:**
  - Start with practitioner's working hours for that day of week
  - Subtract: existing appointments, blocked slots, clinic closed dates, Redis-locked slots
  - Generate 15-minute interval slots matching the treatment duration
  - Exclude slots in the past

### 3. Lock the Slot

- POST /appointments/lock-slot
  - `practitionerId`, `startsAt`, `endsAt`
- Slot is locked in Redis for **10 minutes**
- If locked by a different client → returns error, patient must choose another slot
- Lock prevents double-booking during the checkout flow

### 4. Collect Deposit Payment

- POST /payments/create-intent
  - `appointmentId`: (created after or during this step)
  - `amountCents`: deposit amount (based on `booking_deposit_percent` setting × treatment price)
  - `type`: "DEPOSIT"
  - `method`: STRIPE, KLARNA, CLEARPAY, or CASH
- **Stripe:** Returns `client_secret` for frontend Stripe Elements checkout
- **Cash:** Payment recorded immediately as CAPTURED
- Patient completes payment on the frontend

### 5. Create the Appointment

- POST /appointments
  - `clientId`, `practitionerId`, `treatmentId`
  - `startsAt`, `endsAt`
  - `depositPaid`: true (if deposit collected)
  - `depositAmountCents`: the deposit amount
  - `notes`: optional booking notes
- Appointment created with status: **CONFIRMED**
- Redis slot lock is released

### 6. Automatic Side Effects

On successful appointment creation:
- **10 loyalty points** awarded to the patient
- **Booking confirmation notification** sent to both client and practitioner:
  - Email (via SendGrid) using BOOKING_CONFIRMED template
  - SMS (via Twilio) if template active
  - In-app notification created for both users
- Template variables: `{name}`, `{treatment}`, `{date}`, `{time}`, `{practitioner}`

## Edge Cases

| Scenario | Action |
|----------|--------|
| Slot already locked by another client | Show "slot unavailable" — patient picks another time |
| Redis lock expires (10 min) | Slot becomes available again — patient must restart checkout |
| Stripe payment fails | Appointment not created, slot lock released. Patient retries or selects new slot |
| Patient books without deposit | Appointment created with depositPaid: false |
| Practitioner not available on selected day | Availability endpoint returns empty array |
| Clinic closed on selected date | Availability endpoint excludes closed dates automatically |

## Related Workflows
- [Patient Intake](patient-intake.md) — ensure patient is onboarded before booking
- [Payments & Billing](payments-billing.md) — detailed payment processing
- [Appointment Day](appointment-day.md) — what happens on the day
- [Staff Scheduling](staff-scheduling.md) — practitioner availability setup
