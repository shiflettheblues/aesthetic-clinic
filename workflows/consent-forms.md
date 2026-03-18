# Consent Forms & Form Management

## Objective
Manage form templates, send forms to patients, collect submissions with signatures, and maintain version history. Forms cover medical questionnaires, treatment consent, photo consent, and aftercare instructions.

## When to Use
- Setting up the clinic's form templates for the first time
- Creating or updating a form template
- Sending a form to a patient before an appointment
- Reviewing submitted forms and signatures

## Prerequisites
- Admin account with form management permissions
- Email/SMS service configured for form delivery

## Steps

### 1. Seed Default Templates (First-Time Setup)

- POST /forms/seed-defaults (admin only)
- Creates the following default templates:

| Template | Type | Description |
|----------|------|-------------|
| Medical Questionnaire | MEDICAL_QUESTIONNAIRE | Health history, allergies, medications, conditions |
| Botox Consent | CONSENT | Botulinum toxin treatment consent |
| Plinest Consent | CONSENT | Polynucleotide treatment consent |
| Juvederm Consent | CONSENT | Dermal filler treatment consent |
| Laser Consent | CONSENT | Laser treatment consent |
| IV Vitamin Consent | CONSENT | IV vitamin infusion consent |
| Skin Peel Consent | CONSENT | Chemical peel treatment consent |
| Photo Consent | PHOTO_CONSENT | Photography/image storage consent |

### 2. Create a Custom Template

- POST /forms/templates
  - `name`: template name
  - `formType`: MEDICAL_QUESTIONNAIRE, CONSENT, PHOTO_CONSENT, or AFTERCARE
  - `treatmentId`: (optional) link to a specific treatment
  - `fields`: array of field definitions
  - `active`: true

**Field types supported:**
- `text` — single-line text input
- `textarea` — multi-line text
- `number` — numeric input
- `boolean` — yes/no checkbox
- `select` — dropdown with options
- `date` — date picker
- `signature` — signature capture pad
- `section` — visual section divider (label only)

**Conditional fields:**
- Fields can have `conditionalOn` property referencing another field's name
- The field only displays when the referenced boolean field is true
- Example: "Please list medications" only shows when "Are you on medication?" is checked

### 3. Update a Template

- PATCH /forms/templates/:id
  - Update fields, name, or active status
  - Increment `version` field for tracking
- **Important:** If a template has existing submissions and you deactivate it, the template is soft-deactivated (active: false) rather than deleted — preserving submission history

### 4. Send a Form to a Patient

- POST /forms/request
  - `clientId`: patient's user ID
  - `templateId`: the form template to send
  - `method`: "email", "sms", or "both"
- **Email:** Patient receives a link to /forms/[submissionId] on the client portal
- **SMS:** Patient receives a text with the form link
- Patient opens the link, fills out the form, and submits

### 5. Patient Submits the Form

- Patient completes the form on the client portal at /forms/[id]
- POST /forms/submissions
  - `templateId`: the form template
  - `appointmentId`: (optional) link to an upcoming appointment
  - `data`: JSON object with field responses
  - `signatureUrl`: URL of the captured signature image
  - `pdfUrl`: (optional) generated PDF of the submission

**Auto-population (MEDICAL_QUESTIONNAIRE only):**
- On submission, the system automatically creates/updates the patient's MedicalHistory record
- Fields mapped: allergies, medications, conditions, previous treatments, GP details
- Patient's `intakeFormCompleted` flag set to true

### 6. Review Submissions

- GET /forms/submissions — list all submissions (role-based filtering)
  - Admins/practitioners: see all or filtered by clientId, templateId
  - Clients: see only their own submissions
- GET /forms/submissions/:id — view a specific submission with all data and signature

### 7. Link Forms to Treatments

- When creating a template, set `treatmentId` to associate it with a specific treatment
- GET /forms/templates?treatmentId=xxx — retrieve forms for a specific treatment
- This allows automatic form sending when a patient books a treatment

## Edge Cases

| Scenario | Action |
|----------|--------|
| Patient submits form twice | Both submissions are stored — latest is used for medical history |
| Template updated after submissions exist | Old submissions reference the original template version |
| Form link expired or lost | Re-send via POST /forms/request |
| Signature field left empty | Submission may still be accepted — validate on frontend |
| Conditional field logic error | Check `conditionalOn` references match actual field names |
| Need to delete a template | If it has submissions, deactivate instead of delete |

## Related Workflows
- [Patient Intake](patient-intake.md) — forms are sent as part of intake
- [Appointment Day](appointment-day.md) — consent verified at check-in
- [Patient Records](patient-records.md) — submissions become part of the clinical record
