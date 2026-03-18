# Follow-Up & Rebooking

## Objective
Retain patients through systematic follow-up after treatments, identify patients due for rebooking, and use marketing reports to drive re-engagement.

## When to Use
- After a treatment is marked as COMPLETED
- When reviewing patient retention metrics
- When running re-engagement campaigns
- When managing the waitlist

## Prerequisites
- Notification templates configured for FOLLOW_UP
- Aftercare SOP templates created for relevant treatments
- SMS service configured for campaign messaging

## Steps

### 1. Automatic Post-Treatment Actions

When an appointment is marked COMPLETED, the system automatically:

1. **Sends aftercare SOP** — treatment-specific aftercare guide emailed to the client
   - SOP templates are managed via POST /sop-templates
   - Types: TREATMENT_PLAN, SKINCARE_ROUTINE, BRIDAL_PACKAGE, AFTERCARE_GUIDE
2. **Sends Google review request** — prompts the client to leave a review
3. **Sends follow-up notification** — check-in message to the client
   - Uses FOLLOW_UP notification template
   - Variables: `{name}`, `{treatment}`, `{date}`, `{practitioner}`

### 2. Identify Overdue Patients

- GET /reports/marketing/overdue
- Returns patients whose last appointment was more than **90 days ago**
- These patients are due for a rebooking reminder
- Use this report weekly to stay on top of re-engagement

### 3. Identify Non-Returning Patients

- GET /reports/marketing/non-returning
  - `days`: number of days without an appointment (e.g., 60, 90, 120)
- Returns patients who haven't booked within the specified period
- Different from "overdue" — these patients have no future appointments either

### 4. Identify Not-Retained Patients

- GET /reports/clients/not-retained
  - `from`, `to`: date range when patients were last seen
- Returns patients seen in that range who did NOT return within 90 days
- Useful for measuring retention effectiveness of specific periods

### 5. Absent Since Report

- GET /reports/clients/absent-since
  - `cutoffDate`: patients with no appointments after this date
- Identifies long-term inactive patients for win-back campaigns

### 6. Birthday Marketing

- GET /reports/marketing/birthdays
  - `month`: birth month (1-12)
- Send birthday offers to patients with upcoming birthdays
- Combine with promo codes or loyalty point bonuses

### 7. Run SMS Re-Engagement Campaign

- Use reports above to build target patient lists
- Create SMS campaign: POST /sms-campaigns
  - `name`: campaign name
  - `message`: SMS body (keep under 160 chars for single SMS)
  - `recipients`: patient IDs from the report
- Send campaign and track delivery stats
- Monitor via GET /reports/sms

### 8. Waitlist Management

- Patients can be added to the waitlist for popular treatments or practitioners
- Waitlist statuses: WAITING → NOTIFIED → BOOKED or CANCELLED
- When a slot opens up:
  - Notify the waitlisted patient
  - Update status to NOTIFIED
  - If they book: mark as BOOKED
  - If they don't respond: move to next in queue

### 9. Loyalty & Incentives for Rebooking

- Patients earn 10 loyalty points per booking automatically
- Use loyalty program to incentivise rebooking:
  - Check points balance via loyalty endpoints
  - Offer redemption discounts for returning patients
- Combine with:
  - Promo codes for returning patients
  - Membership discounts
  - Referral bonuses (patient refers a friend)

## Edge Cases

| Scenario | Action |
|----------|--------|
| Patient opts out of marketing | Respect preferences — exclude from SMS campaigns |
| Aftercare SOP doesn't exist for treatment | No aftercare sent — create the SOP template |
| Patient on waitlist for cancelled practitioner | Reassign or notify with alternatives |
| SMS credits exhausted | Check GET /reports/sms for credit balance before sending campaigns |
| Patient already has future appointment | Exclude from "overdue" re-engagement — they're already booked |

## Key Metrics to Track

| Metric | Source | Target |
|--------|--------|--------|
| Retention rate | Staff dashboard stats | >60% |
| Rebooked rate | Staff dashboard stats | >40% |
| Overdue patients | /reports/marketing/overdue | Decreasing trend |
| SMS campaign response | /reports/sms | >5% conversion |

## Related Workflows
- [Appointment Day](appointment-day.md) — triggers the follow-up flow
- [Appointment Booking](appointment-booking.md) — where rebooking happens
- [Settings & Configuration](settings-configuration.md) — notification template setup
- [Reporting](reporting.md) — full analytics reference
