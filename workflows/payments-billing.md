# Payments & Billing

## Objective
Process all payment types — deposits, balance payments, refunds, gift cards, promo codes, and packages — across multiple payment methods (Stripe, Klarna, Clearpay, Cash).

## When to Use
- Collecting a deposit during appointment booking
- Collecting balance payment after treatment
- Processing a refund
- Handling gift card purchases or redemptions
- Applying promo codes or package credits

## Prerequisites
- Stripe API keys configured in .env (or dev mode for mock payments)
- Stripe webhook endpoint registered for payment_intent.succeeded and payment_intent.payment_failed
- Booking deposit percentage configured in settings (`booking_deposit_percent`)

## Steps

### 1. Deposit Payment (During Booking)

- Calculate deposit: treatment price × `booking_deposit_percent` / 100
- POST /payments/create-intent
  - `appointmentId`: the appointment being booked
  - `amountCents`: calculated deposit amount
  - `type`: "DEPOSIT"
  - `method`: one of STRIPE, KLARNA, CLEARPAY, CASH
- **Stripe flow:**
  - Returns `{ id, client_secret, amount, status }`
  - Frontend uses `client_secret` with Stripe Elements to complete checkout
  - Webhook confirms payment → marks as CAPTURED
  - Appointment's `depositPaid` set to true, `depositAmountCents` recorded
- **Cash flow:**
  - Payment recorded immediately as CAPTURED (no webhook needed)
  - Admin marks cash received in the system
- **Dev mode:** Returns mock payment intent (no Stripe API call)

### 2. Balance Payment (After Treatment)

- Calculate balance: treatment price - depositAmountCents
- POST /payments/create-intent
  - `type`: "BALANCE"
  - `amountCents`: remaining balance
  - `method`: patient's preferred method
- Same Stripe/Cash flow as deposit

### 3. Stripe Webhook Processing

- POST /payments/webhook (raw body, Stripe signature header)
- Events handled:
  - **payment_intent.succeeded:**
    - Payment status → CAPTURED
    - If DEPOSIT type → appointment.depositPaid = true
    - In-app notification created: PAYMENT_SUCCESS
  - **payment_intent.payment_failed:**
    - Payment status → FAILED
    - In-app notification created: PAYMENT_REFUNDED (failure notification)

### 4. Refund Processing

- POST /payments/:id/refund (admin only)
  - `amountCents`: (optional) for partial refund. Omit for full refund
- Calls Stripe refund API
- Payment status → REFUNDED
- In-app notification sent to client
- **Partial refunds** supported — specify the exact amount in cents

### 5. Gift Card Payments

- **Purchase:** Gift card created with balance in cents, unique code generated
- **Redemption:** Apply gift card code during checkout
  - Deduct from gift card balance
  - If gift card covers full amount → no Stripe payment needed
  - If partial → create Stripe intent for the remainder

### 6. Promo Code Application

- Promo codes provide either percentage or fixed-amount discounts
- Apply during checkout:
  - Validate code is active and not expired
  - Calculate discounted amount
  - Create payment intent with the reduced amount

### 7. Package Payments

- Packages are pre-purchased bundles of treatment sessions
- **Purchase:** Pay for the full package upfront
  - Payment type: PACKAGE
  - Creates PackageTemplate-based package for the client
- **Redemption:** Each session deducted from the package
  - No additional payment needed for covered sessions
  - Track remaining sessions and expiry date

### 8. View Payment History

- GET /payments
  - Admins: see all payments with filters
  - Practitioners: see payments for their appointments
  - Clients: see only their own payments
- Each payment record includes: amount, type, method, status, associated appointment

## Payment Methods Reference

| Method | Flow | Settlement |
|--------|------|------------|
| STRIPE | Card via Stripe Elements → webhook confirmation | Stripe dashboard |
| KLARNA | Pay-later via Klarna integration | Klarna settlement |
| CLEARPAY | Buy-now-pay-later via Clearpay | Clearpay settlement |
| CASH | Recorded immediately as CAPTURED | In-clinic |

## Edge Cases

| Scenario | Action |
|----------|--------|
| Stripe webhook fails/delayed | Payment stays PENDING until webhook arrives. Retry mechanism on Stripe side |
| Double webhook delivery | Idempotent — payment already CAPTURED, no duplicate processing |
| Client disputes charge | Handle via Stripe dashboard, update payment status manually |
| Gift card insufficient balance | Charge remainder via Stripe/Cash |
| Promo code expired mid-checkout | Validate at payment creation time, not just at display |
| Package expired | Check expiry date before allowing session redemption |
| Cash payment with no change | Record exact amount — no change-tracking in system |

## Related Workflows
- [Appointment Booking](appointment-booking.md) — deposit collection during booking
- [Appointment Day](appointment-day.md) — balance collection after treatment
- [Settings & Configuration](settings-configuration.md) — deposit percentage configuration
- [Reporting](reporting.md) — financial reports (deposits, voided payments)
