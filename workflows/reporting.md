# Reporting & Analytics

## Objective
Comprehensive reference for all available reports — when to use each one, what data it returns, and what actions to take based on the results.

## When to Use
- Daily: daysheet, incomplete appointments
- Weekly: revenue, staff targets, low stock, overdue patients
- Monthly: full business review, retention, profit margins
- Ad-hoc: client lookups, marketing campaigns, financial audits

## Reports Reference

### Revenue & Financial

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Revenue Summary | GET /reports/revenue | Total revenue, by treatment, by practitioner | Weekly/monthly revenue tracking |
| Business Overview | GET /reports/business | Gross profit, profit margin, product costs | Monthly P&L review |
| Deposits Report | GET /reports/financial/deposits | Appointments with deposits paid | Cash flow tracking |
| Voided Payments | GET /reports/financial/voided | REFUNDED and FAILED payments | Financial audit, dispute tracking |

**Parameters:** `from`, `to` (date range for all financial reports)

### Patient & Client

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Patient Overview | GET /reports/patients | Total/new patients, retention rate, avg visits, avg spend | Monthly growth metrics |
| Top Spenders | GET /reports/clients/spend | Clients sorted by total revenue | VIP identification |
| Absent Since | GET /reports/clients/absent-since | Clients with no appointments after cutoff | Win-back campaigns |
| Not Retained | GET /reports/clients/not-retained | Clients seen in range but not returned in 90 days | Retention analysis |
| Clients by Service | GET /reports/clients/by-service | All clients who booked a specific treatment | Treatment-specific marketing |

### Appointment

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Daysheet | GET /reports/appointments/daysheet | All appointments for a date range | Daily operations |
| Cancelled | GET /reports/appointments/cancelled | Cancelled appointments with reasons | Identify cancellation patterns |
| No-Shows | GET /reports/appointments/no-shows | No-show appointments + per-client no-show count | Flag repeat no-shows |
| Incomplete | GET /reports/appointments/incomplete | CONFIRMED/PENDING past their end time | End-of-day cleanup |

### Treatment

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Treatment Popularity | GET /reports/treatments | Treatment booking counts, estimated revenue | Menu optimisation |

### Marketing

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Overdue Patients | GET /reports/marketing/overdue | Patients >90 days since last visit | Re-engagement |
| Non-Returning | GET /reports/marketing/non-returning | Patients with no appointment in N days | Retention campaigns |
| Birthdays | GET /reports/marketing/birthdays | Clients by birth month | Birthday promotions |
| Marketing Summary | GET /reports/marketing | Referrals, promo codes, loyalty points aggregated | Campaign ROI |
| SMS Stats | GET /reports/sms | Campaign delivery stats, credits remaining | SMS campaign tracking |

### Staff

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Staff Summary | GET /reports/staff/summary | Appointments and revenue per practitioner | Performance review |
| Target Progress | GET /reports/staff/targets | Goal vs actual, % achieved | Weekly target check-in |

### Products

| Report | Endpoint | Returns | Use Case |
|--------|----------|---------|----------|
| Product Usage | GET /reports/products | Usage by appointments, stock movements | Inventory planning |

## Recommended Review Schedule

### Daily
1. **Daysheet** — review today's appointments
2. **Incomplete appointments** — mark as COMPLETED or NO_SHOW before end of day

### Weekly
3. **Revenue summary** — track week-over-week growth
4. **Staff targets** — check progress against weekly goals
5. **Low stock** (GET /products/low-stock) — reorder before stockouts
6. **Overdue patients** — send rebooking reminders

### Monthly
7. **Business overview** — profit margins and cost analysis
8. **Patient overview** — new patients, retention rate, avg spend
9. **Treatment popularity** — identify top and underperforming treatments
10. **Staff summary** — full performance review
11. **Marketing summary** — referral and campaign ROI
12. **Not retained** — patients lost in the previous month

### Quarterly
13. **Top spenders** — VIP recognition and loyalty rewards
14. **Cancelled/no-show analysis** — policy adjustments
15. **Product usage** — stock ordering optimisation

## Edge Cases

| Scenario | Action |
|----------|--------|
| Date range returns no data | Verify dates are correct. Check if appointments exist in that period |
| Revenue discrepancy | Cross-reference with Stripe dashboard and voided payments report |
| Retention rate seems low | Check the calculation period — 30-day window compared to 60-90 days prior |
| Report is slow | Narrow the date range. Large ranges with many appointments may be slow |

## Related Workflows
- [Staff Targets](staff-targets.md) — KPI targets and dashboards
- [Follow-Up & Rebooking](follow-up-rebooking.md) — acting on marketing reports
- [Inventory Management](inventory-management.md) — stock reports
- [Payments & Billing](payments-billing.md) — financial report context
