# Patient Records & Clinical Documentation

## Objective
Maintain comprehensive clinical records for each patient including medical history, consent forms, treatment photos, face maps, and appointment history.

## When to Use
- Reviewing a patient's full clinical history before treatment
- Updating medical information after a consultation
- Uploading before/after photos
- Annotating treatment areas on a face map
- Archiving inactive patients

## Prerequisites
- Patient exists in the system
- Practitioner or admin access

## Steps

### 1. View Full Patient Record

- GET /patients/:id
- Returns comprehensive patient data:
  - **Profile:** name, email, phone, DOB, emergency contact
  - **Appointments:** full history with status, treatment, practitioner, notes
  - **Medical history:** allergies, medications, conditions, GP details
  - **Consent forms:** all signed consent records
  - **Form submissions:** all completed forms
  - **Payments:** transaction history
  - **Images:** before/after photos
  - **Intake status:** intakeFormCompleted flag

### 2. Update Medical History

- PUT /patients/:id/medical-history
  - `allergies`: list of known allergies
  - `medications`: current medications
  - `conditions`: medical conditions
  - `previousTreatments`: prior aesthetic treatments
  - `gpName`, `gpAddress`, `gpPhone`: GP details
  - `notes`: additional clinical notes
- This can also be auto-populated via medical questionnaire submission (see [Consent Forms](consent-forms.md))

### 3. Record Consent Forms

- POST /patients/:id/consent-forms
  - `treatmentName`: the treatment consented to
  - `consentDate`: date of consent
  - `signatureUrl`: captured signature
  - `notes`: any additional consent notes
  - `formSubmissionId`: (optional) link to the digital form submission
- These are separate from FormSubmissions — they represent the clinical consent record
- DELETE /patients/:id/consent-forms/:formId (admin only) — remove if recorded in error

### 4. Upload Patient Images

- POST /patients/:id/images
  - `imageData`: base64-encoded image
  - `type`: e.g., "before", "after", "progress"
  - `notes`: description of the image
  - `appointmentId`: (optional) link to the treatment appointment
- Images are stored and linked to the patient record
- DELETE /patients/:id/images/:imageId (admin only)

### 5. Face Map Annotations

- Face maps allow practitioners to mark treatment areas on a facial diagram
- Each annotation includes:
  - Treatment area location (coordinates)
  - Treatment name and colour coding
  - Date of treatment
  - Practitioner who performed it
- Useful for tracking injection sites, laser areas, and treatment progression over time

### 6. Search and Filter Patients

- GET /patients with filters:
  - `search`: name, email, or phone
  - `treatmentId`: patients who've had a specific treatment
  - `lastVisitFrom` / `lastVisitTo`: date range of last visit
  - `minVisits`: minimum number of visits
- Pagination supported for large patient lists

### 7. Archive / Unarchive Patients

- PATCH /patients/:id/archive — toggle archive status (admin only)
- Archived patients are excluded from standard search results
- GET /patients/archived — view archived patients list
- Unarchive: same endpoint, toggles back to active

## Edge Cases

| Scenario | Action |
|----------|--------|
| Patient has no medical history yet | Record shows empty — prompt to send medical questionnaire |
| Duplicate patient records | Search by email/phone before creating. CSV import checks for duplicates |
| Patient requests data deletion | Archive the patient. Full deletion requires database-level action |
| Image upload fails | Ensure base64 encoding is correct. Check image size limits |
| Consent form recorded for wrong treatment | Admin can delete and re-create the consent record |

## Related Workflows
- [Patient Intake](patient-intake.md) — initial record creation
- [Consent Forms](consent-forms.md) — digital form management
- [Appointment Day](appointment-day.md) — clinical documentation during treatment
- [Reporting](reporting.md) — patient analytics and reports
