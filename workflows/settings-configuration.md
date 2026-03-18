# Settings & Configuration

## Objective
Configure clinic-wide settings, notification templates, and third-party integrations that control how the system behaves.

## When to Use
- Initial clinic setup
- Changing business policies (deposit percentage, cancellation policy)
- Setting up or modifying notification templates
- Configuring third-party integrations

## Prerequisites
- Admin access

## Steps

### 1. Core Clinic Settings

- PUT /settings/:key or PUT /settings (bulk update)
- GET /settings — view all settings (admin)
- GET /settings/:key — view single setting

**Public settings** (accessible without auth):

| Key | Description | Example |
|-----|-------------|---------|
| `clinic_name` | Clinic display name | "Glow Aesthetics" |
| `clinic_address` | Physical address | "123 High Street, London" |
| `clinic_phone` | Contact phone | "+44 20 1234 5678" |
| `booking_deposit_percent` | Deposit % of treatment price | 50 |
| `cancellation_policy` | Policy text shown to clients | "24-hour cancellation required..." |

**Private settings** (admin only):
- Additional business configuration stored as key-value JSON pairs
- Add custom settings as needed for clinic-specific requirements

### 2. Notification Templates

Notification templates define the content of automated emails and SMS messages.

**Template Types:**

| Type | Trigger | Variables |
|------|---------|-----------|
| BOOKING_CONFIRMED | Appointment created | {name}, {treatment}, {date}, {time}, {practitioner} |
| BOOKING_REMINDER_24H | 24h before appointment | {name}, {treatment}, {date}, {time}, {practitioner} |
| BOOKING_CANCELLED | Appointment cancelled | {name}, {treatment}, {date}, {time}, {practitioner} |
| FOLLOW_UP | Appointment completed | {name}, {treatment}, {date}, {practitioner} |
| NEW_BOOKING | New booking (practitioner notification) | {name}, {treatment}, {date}, {time} |
| PAYMENT_SUCCESS | Payment captured | {name}, {amount} |
| PAYMENT_REFUNDED | Payment refunded/failed | {name}, {amount} |

**Channels:**
- `EMAIL` — sent via SendGrid
- `SMS` — sent via Twilio

**How templates work:**
- Each template has a type, channel, subject (email), body, and active flag
- Variables in curly braces are replaced with actual values at send time
- Templates can be activated/deactivated per channel
- The notification service checks for active templates before sending

### 3. SOP Templates

Standard Operating Procedure templates for treatment guidance and aftercare.

**SOP Types:**

| Type | Use Case |
|------|----------|
| TREATMENT_PLAN | Pre-treatment planning guide |
| SKINCARE_ROUTINE | Personalised skincare regimen |
| BRIDAL_PACKAGE | Multi-session bridal preparation |
| AFTERCARE_GUIDE | Post-treatment care instructions |
| OTHER | Custom SOP |

- SOPs can be linked to specific treatments
- AFTERCARE_GUIDE SOPs are automatically emailed when an appointment is completed
- Create via POST /sop-templates, manage via PATCH/DELETE

### 4. Integration Configuration

Third-party integrations managed via IntegrationConfig model.

**Available Integrations:**

| Integration | Purpose | Key Config |
|-------------|---------|------------|
| Stripe | Payment processing | API keys in .env |
| Mailchimp | Email marketing | API key, list ID |
| Klarna | Pay-later option | API credentials |
| Clearpay | Buy-now-pay-later | API credentials |
| Xero | Accounting sync | OAuth credentials |
| Google Reviews | Review aggregation | Place ID, API key |

- Each integration has: provider name, API key, config JSON, active flag
- Toggle integrations on/off without removing configuration
- Manage via integrations endpoints

### 5. Closed Dates

- Clinic-wide closure dates (bank holidays, planned closures)
- When a date is closed, no availability shown for any practitioner
- Manage via closed-dates endpoints

## Initial Setup Checklist

1. [ ] Set clinic_name, clinic_address, clinic_phone
2. [ ] Set booking_deposit_percent (e.g., 50)
3. [ ] Write cancellation_policy text
4. [ ] Create notification templates for all types (EMAIL + SMS)
5. [ ] Seed default form templates (POST /forms/seed-defaults)
6. [ ] Configure practitioner working hours
7. [ ] Add closed dates for upcoming holidays
8. [ ] Create aftercare SOP templates for each treatment
9. [ ] Set up Stripe (API keys in .env)
10. [ ] Configure email service (SendGrid)
11. [ ] Configure SMS service (Twilio)

## Edge Cases

| Scenario | Action |
|----------|--------|
| Notification template missing for a type | Notification silently skipped — create the template |
| Template variable not found | Variable placeholder left as-is in the message — check variable names |
| Integration API key expired | Update via integration config — toggle active: false until resolved |
| Setting value is invalid JSON | Settings store values as JSON — ensure proper formatting |
| Multiple templates for same type+channel | System uses the first active match — keep only one active per type+channel |

## Related Workflows
- [Appointment Booking](appointment-booking.md) — uses deposit percentage and notification templates
- [Appointment Day](appointment-day.md) — uses reminder templates and aftercare SOPs
- [Payments & Billing](payments-billing.md) — Stripe and payment method configuration
- [Follow-Up & Rebooking](follow-up-rebooking.md) — follow-up notification templates
- [Staff Scheduling](staff-scheduling.md) — closed dates affect availability
