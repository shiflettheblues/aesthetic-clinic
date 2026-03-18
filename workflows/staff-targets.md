# Staff Targets & KPIs

## Objective
Set performance targets for practitioners, track progress against goals, and review key performance indicators across the team.

## When to Use
- Setting weekly or monthly targets for practitioners
- Reviewing staff performance dashboards
- Generating staff summary reports
- Evaluating retention and rebooking rates

## Prerequisites
- Practitioners active in the system with appointments
- Admin access for target management

## Steps

### 1. Set a Target

- POST /staff/targets (admin only)
  - `practitionerId`: the practitioner
  - `type`: REVENUE or APPOINTMENTS
  - `period`: WEEKLY or MONTHLY
  - `goal`: target value
    - REVENUE: amount in cents (e.g., 500000 = £5,000)
    - APPOINTMENTS: number of appointments (e.g., 40)
- **Date range auto-calculated:**
  - WEEKLY: current Monday to Sunday
  - MONTHLY: 1st to last day of current month
- DELETE /staff/targets/:id — remove a target (admin only)

### 2. View All Targets

- GET /staff/targets (admin)
- Returns all active targets with:
  - Practitioner details
  - Target type, period, goal
  - Start and end dates
  - Current progress (calculated from completed appointments/revenue)
  - Percentage completion

### 3. Staff Dashboard (Admin View)

- GET /staff/dashboard
- Returns all practitioners with calculated stats:

| Stat | Calculation |
|------|-------------|
| Today's appointments | Count of today's appointments for the practitioner |
| Monthly revenue | Sum of treatment prices for COMPLETED appointments this month |
| Retention rate | % of clients from last 30 days who were also seen 60-90 days prior |
| Rebooked rate | % of clients from last 30 days who have a future appointment booked |
| Target progress | Current value / goal × 100 |

### 4. Individual Practitioner Dashboard

- GET /staff/my-dashboard (practitioner's own view)
- Same stats as admin view but scoped to the authenticated practitioner
- Practitioners can track their own performance without admin access

### 5. Staff Summary Report

- GET /reports/staff/summary
  - `from`, `to`: date range
- Returns per-practitioner:
  - Total appointments (by status)
  - Total revenue from completed appointments
  - Breakdown by treatment type

### 6. Target Progress Report

- GET /reports/staff/targets
- Shows all targets with:
  - Goal vs actual
  - Percentage achieved
  - Days remaining in period
- Use for weekly team reviews and monthly performance evaluations

## Target Setting Guidelines

| Role | Suggested REVENUE Target (Monthly) | Suggested APPOINTMENTS Target (Weekly) |
|------|-------------------------------------|---------------------------------------|
| Senior practitioner | Based on historical average + 10% | 8-12 per week |
| Junior practitioner | Based on historical average | 5-8 per week |
| New practitioner | Ramp-up: 50% of senior target | 3-5 per week |

*Adjust based on treatment types, pricing, and clinic capacity.*

## Edge Cases

| Scenario | Action |
|----------|--------|
| Target set mid-period | Goal applies from creation date — progress may already exist |
| Practitioner on holiday during target period | Consider adjusting goal or excluding holiday weeks |
| Revenue target in cents confusion | Always specify in cents: £5,000 = 500000 |
| Multiple targets for same practitioner | Supported — can have both REVENUE and APPOINTMENTS targets |
| Cancelled appointments affect metrics | Only COMPLETED appointments count toward revenue and appointment targets |

## Related Workflows
- [Staff Scheduling](staff-scheduling.md) — working hours and availability
- [Reporting](reporting.md) — comprehensive analytics
- [Appointment Day](appointment-day.md) — appointment completion drives metrics
