# Patient Intake

## Objective
Onboard a new patient into the system with all required medical and consent information collected before their first appointment.

## When to Use
- New patient registers via the client portal or public booking page
- Admin creates a patient account manually
- Admin bulk-imports patients from CSV

## Prerequisites
- Default form templates seeded (run POST /forms/seed-defaults if not done)
- Email and/or SMS service configured for sending form requests

## Steps

### 1. Patient Registration

**Self-registration (client portal):**
- Patient submits POST /auth/register with name, email, phone, password
- Account created with role: CLIENT
- Patient is redirected to their dashboard

**Admin creation:**
- Admin navigates to Patients > Import
- Single patient: created via the admin UI
- Bulk import: POST /patients/import with CSV file (columns: firstName, lastName, email, phone, dateOfBirth)
  - Default password assigned: `Welcome123!`
  - Admin should notify patients to change their password on first login

### 2. Send Medical Questionnaire

- POST /forms/request
  - `clientId`: the new patient's user ID
  - `templateId`: the MEDICAL_QUESTIONNAIRE template ID
  - `method`: "email", "sms", or "both"
- Patient receives a link to complete the form on the client portal at /forms/[id]

### 3. Patient Completes Medical Questionnaire

- Patient fills out the form on the client portal
- POST /forms/submissions with completed field data
- **Automatic side effect:** When a MEDICAL_QUESTIONNAIRE is submitted, the system auto-populates the patient's MedicalHistory record with:
  - Allergies, medications, conditions, previous treatments, GP details
  - `intakeFormCompleted` is marked true on the patient record

### 4. Send Photo Consent Form

- POST /forms/request
  - `templateId`: the PHOTO_CONSENT template ID
  - `method`: "email" or "both"
- Patient reviews and signs the photo consent form
- Signature captured as a URL in the signature field

### 5. Send Treatment-Specific Consent Form (if applicable)

- If the patient has already booked a specific treatment, send the relevant consent form
- Available defaults: Botox, Plinest, Juvederm, Laser, IV Vitamin, Skin Peel
- POST /forms/request with the appropriate CONSENT template

### 6. Verify Intake Completion

- GET /patients/:id to check:
  - `intakeFormCompleted`: true
  - FormSubmissions include MEDICAL_QUESTIONNAIRE and PHOTO_CONSENT
- Patient is now ready for their first appointment

## Edge Cases

| Scenario | Action |
|----------|--------|
| Patient doesn't complete forms | Re-send via POST /forms/request. Check submissions list to confirm status |
| Incomplete medical questionnaire | Form can be re-submitted — new submission replaces previous medical history |
| CSV import duplicate email | Import will fail for that row — handle individually |
| Patient registered but never logged in | Admin can re-send welcome email or reset password |

## Related Workflows
- [Appointment Booking](appointment-booking.md) — book the patient's first appointment
- [Consent Forms](consent-forms.md) — detailed form template management
- [Patient Records](patient-records.md) — managing ongoing clinical records
