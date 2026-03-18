import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sendFormRequest } from "../services/email.js";
import { sendSms } from "../services/sms.js";

const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "number", "boolean", "select", "date", "signature", "section"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  conditionalOn: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  formType: z.enum(["MEDICAL_QUESTIONNAIRE", "CONSENT", "PHOTO_CONSENT", "AFTERCARE"]),
  treatmentId: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const submitFormSchema = z.object({
  templateId: z.string(),
  appointmentId: z.string().optional(),
  responses: z.record(z.unknown()),
  signatureUrl: z.string().optional(),
});

// Default form templates to seed
type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "date" | "signature" | "section";
  required?: boolean;
  options?: string[];
  conditionalOn?: string;
};

const DEFAULT_TEMPLATES: {
  name: string;
  formType: "MEDICAL_QUESTIONNAIRE" | "CONSENT" | "PHOTO_CONSENT" | "AFTERCARE";
  fields: FieldDef[];
}[] = [
  {
    name: "Medical History & Health Questionnaire",
    formType: "MEDICAL_QUESTIONNAIRE",
    fields: [
      { key: "allergies", label: "Do you have any known allergies? (medications, latex, anaesthetics, etc.)", type: "textarea", required: true },
      { key: "medications", label: "Please list all current medications, supplements and herbal remedies", type: "textarea", required: true },
      { key: "conditions", label: "Do you have any medical conditions we should be aware of?", type: "textarea", required: true },
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "bloodThinners", label: "Are you taking blood-thinning medications (aspirin, warfarin, clopidogrel)?", type: "boolean", required: true },
      { key: "previousReactions", label: "Have you had any previous adverse reactions to aesthetic treatments?", type: "textarea" },
      { key: "gp_name", label: "GP Name", type: "text" },
      { key: "gp_address", label: "GP Practice Address", type: "text" },
      { key: "notes", label: "Any other relevant health information", type: "textarea" },
    ],
  },

  // ─── BOTOX® (Allergan — onabotulinumtoxinA) ───
  {
    name: "BOTOX\u00AE (Allergan) Consent & Medical History",
    formType: "CONSENT",
    fields: [
      // Section A — Patient Details
      { key: "section_patient", label: "Patient Details", type: "section" },
      { key: "fullName", label: "Full legal name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { key: "emergencyContactName", label: "Emergency contact name", type: "text", required: true },
      { key: "emergencyContactPhone", label: "Emergency contact phone", type: "text", required: true },

      // Section B — Medical History
      { key: "section_medical", label: "Medical History", type: "section" },
      { key: "botoxAllergy", label: "Do you have any known allergies to botulinum toxin products (Botox, Dysport, Xeomin, Myobloc, Jeuveau, Daxxify, Letybo)?", type: "boolean", required: true },
      { key: "botoxAllergyDetail", label: "Please provide details of your botulinum toxin allergy", type: "text", conditionalOn: "botoxAllergy" },
      { key: "injectionSiteInfection", label: "Do you have any infection, inflammation, or active skin condition at the proposed injection site?", type: "boolean", required: true },
      { key: "neuromuscularDisorder", label: "Do you have any neuromuscular disorder? (e.g. myasthenia gravis, Lambert-Eaton syndrome, ALS/motor neurone disease, peripheral motor neuropathy)", type: "boolean", required: true },
      { key: "neuromuscularDetail", label: "Please specify your neuromuscular disorder", type: "text", conditionalOn: "neuromuscularDisorder" },
      { key: "cardiovascular", label: "Do you have any cardiovascular disease, arrhythmia, or history of heart attack?", type: "boolean", required: true },
      { key: "cardiovascularDetail", label: "Please specify your cardiovascular condition", type: "text", conditionalOn: "cardiovascular" },
      { key: "swallowingDifficulty", label: "Do you have difficulty swallowing, speaking, or breathing?", type: "boolean" },
      { key: "ptosis", label: "Do you have drooping eyelids (ptosis) or any abnormal facial changes?", type: "boolean" },
      { key: "recentBotox", label: "Have you received any botulinum toxin product in the last 4 months?", type: "boolean" },
      { key: "recentBotoxDetail", label: "Please specify which product and when", type: "text", conditionalOn: "recentBotox" },
      { key: "medAminoglycosides", label: "Are you currently taking aminoglycoside antibiotics (e.g. gentamicin, tobramycin)?", type: "boolean" },
      { key: "medMuscleRelaxants", label: "Are you currently taking muscle relaxants?", type: "boolean" },
      { key: "medAnticholinergics", label: "Are you currently taking anticholinergic medications?", type: "boolean" },
      { key: "medBloodThinners", label: "Are you currently taking blood thinners / anticoagulants (warfarin, clopidogrel)?", type: "boolean" },
      { key: "medAspirinNSAIDs", label: "Are you currently taking aspirin or NSAIDs (ibuprofen, naproxen)?", type: "boolean" },
      { key: "medVitaminEFishOil", label: "Are you currently taking vitamin E or fish oil supplements?", type: "boolean" },
      { key: "medOther", label: "Are you taking any other medications or supplements?", type: "boolean" },
      { key: "medOtherDetail", label: "Please list all other medications and supplements", type: "textarea", conditionalOn: "medOther" },
      { key: "pregnant", label: "Are you pregnant or planning to become pregnant?", type: "boolean", required: true },
      { key: "breastfeeding", label: "Are you breastfeeding?", type: "boolean", required: true },
      { key: "facialSurgery", label: "Have you had facial surgery, brow lift, or facelift?", type: "boolean" },
      { key: "facialSurgeryDetail", label: "Please specify when and what surgery", type: "text", conditionalOn: "facialSurgery" },
      { key: "lidocaineAllergy", label: "Do you have any allergies to lidocaine or other local anaesthetics?", type: "boolean" },

      // Section C — Informed Consent Declarations
      { key: "section_consent", label: "Informed Consent Declarations", type: "section" },
      { key: "consentMechanism", label: "I understand that BOTOX\u00AE (onabotulinumtoxinA) is manufactured by Allergan and works by temporarily relaxing muscles to reduce the appearance of dynamic facial lines. Effects typically last 3\u20134 months.", type: "boolean", required: true },
      { key: "consentCommonSideEffects", label: "I understand the following common side effects: bruising, swelling, redness, pain or tenderness at injection sites, headache, dry mouth, and temporary drooping of the eyelid or brow (ptosis) if the toxin migrates.", type: "boolean", required: true },
      { key: "consentSeriousRisks", label: "I understand the following serious but rare risks: spread of toxin effects beyond the injection site causing generalised muscle weakness, double or blurred vision, drooping eyelids, difficulty swallowing, speaking or breathing, loss of bladder control, or respiratory compromise. I have been advised to seek immediate medical attention if any of these occur.", type: "boolean", required: true },
      { key: "consentNoGuarantee", label: "I understand that results cannot be guaranteed and that the degree of improvement varies between individuals. Some lines present at rest may not improve.", type: "boolean", required: true },
      { key: "consentAsymmetry", label: "I understand that asymmetry is possible as facial muscles can respond differently on each side.", type: "boolean", required: true },
      { key: "consentDisclosure", label: "I have disclosed all medications, supplements, medical conditions, and previous botulinum toxin treatments to my practitioner.", type: "boolean", required: true },
      { key: "consentNoAlcohol", label: "I have not consumed alcohol in the last 24 hours and have followed all pre-treatment instructions provided to me.", type: "boolean", required: true },
      { key: "consentDriving", label: "I understand that I should not drive, operate machinery, or perform dangerous activities if I experience muscle weakness or dizziness following treatment.", type: "boolean", required: true },
      { key: "consentPhotos", label: "I consent to before and after photographs being taken for clinical record purposes. (Separate marketing consent is obtained separately.)", type: "boolean", required: true },
      { key: "consentOver18", label: "I confirm I am over 18 years of age.", type: "boolean", required: true },
      { key: "consentFinal", label: "I freely and voluntarily consent to treatment with BOTOX\u00AE (onabotulinumtoxinA) by Allergan.", type: "boolean", required: true },
      { key: "signature", label: "Signature", type: "signature", required: true },
    ],
  },

  // ─── Plinest® Polynucleotides (Mastelli) ───
  {
    name: "Plinest\u00AE Polynucleotides (Mastelli) Consent & Medical History",
    formType: "CONSENT",
    fields: [
      // Section A — Patient Details
      { key: "section_patient", label: "Patient Details", type: "section" },
      { key: "fullName", label: "Full legal name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { key: "emergencyContactName", label: "Emergency contact name", type: "text", required: true },
      { key: "emergencyContactPhone", label: "Emergency contact phone", type: "text", required: true },

      // Section B — Medical History
      { key: "section_medical", label: "Medical History", type: "section" },
      { key: "fishAllergy", label: "Do you have any known allergy to fish or fish-derived products (including salmon or trout DNA)? Plinest is derived from highly purified salmon/trout DNA fragments (PN-HPT\u2122 technology).", type: "boolean", required: true },
      { key: "activeSkinInfection", label: "Do you have any active skin infection, inflammation, or open wound at the proposed treatment site?", type: "boolean", required: true },
      { key: "autoimmune", label: "Do you have any autoimmune condition? (e.g. lupus, rheumatoid arthritis, multiple sclerosis, Hashimoto\u2019s, Crohn\u2019s)", type: "boolean", required: true },
      { key: "autoimmuneDetail", label: "Please specify your autoimmune condition", type: "text", conditionalOn: "autoimmune" },
      { key: "immunosuppressive", label: "Are you currently on immunosuppressive therapy or chemotherapy?", type: "boolean", required: true },
      { key: "diabetes", label: "Do you have diabetes?", type: "boolean" },
      { key: "keloidHistory", label: "Do you have a history of keloid or hypertrophic scarring?", type: "boolean" },
      { key: "coldSores", label: "Do you suffer from recurrent cold sores (herpes simplex) near the intended treatment area?", type: "boolean" },
      { key: "bloodThinners", label: "Are you currently taking blood-thinning medications? (warfarin, aspirin, clopidogrel, NSAIDs)", type: "boolean" },
      { key: "vitaminEFishOil", label: "Are you taking vitamin E, fish oil, or other supplements that may prolong bleeding?", type: "boolean" },
      { key: "retinoids", label: "Are you currently taking retinoid medications (e.g. Roaccutane, tretinoin)?", type: "boolean" },
      { key: "pregnant", label: "Are you pregnant or planning to become pregnant?", type: "boolean", required: true },
      { key: "breastfeeding", label: "Are you breastfeeding?", type: "boolean", required: true },
      { key: "recentFacialTreatments", label: "Have you had any recent facial treatments? (laser, microneedling, chemical peel, fillers)", type: "boolean" },
      { key: "recentFacialTreatmentsDetail", label: "Please specify treatments and dates", type: "text", conditionalOn: "recentFacialTreatments" },
      { key: "otherConditions", label: "Any other medical conditions or medications not listed above?", type: "textarea" },

      // Section C — Informed Consent Declarations
      { key: "section_consent", label: "Informed Consent Declarations", type: "section" },
      { key: "consentMechanism", label: "I understand that Plinest\u00AE is a polynucleotide injectable manufactured by Mastelli (Italy), derived from highly purified salmon DNA fragments using PN-HPT\u2122 technology. It works by stimulating fibroblast activity to promote collagen and elastin production and improve skin quality over time. It does not add volume.", type: "boolean", required: true },
      { key: "consentTimeline", label: "I understand that results are not immediate. Improvement in skin texture, hydration, and elasticity is typically visible from 4 weeks, with continued improvement over 6\u201312 weeks. A course of 2\u20134 sessions spaced 3 weeks apart is typically recommended.", type: "boolean", required: true },
      { key: "consentCommonSideEffects", label: "I understand the following common side effects: redness, swelling, bruising, tenderness, itching, a warm or tight sensation, and small temporary bumps at injection sites. These typically resolve within 12\u201372 hours and up to one week.", type: "boolean", required: true },
      { key: "consentRareComplications", label: "I understand the following rare complications: infection, allergic or hypersensitivity reaction (especially in patients with fish allergies), nodule or granuloma formation, and prolonged inflammation. I will contact the clinic if I notice signs of infection or unusual reaction after treatment.", type: "boolean", required: true },
      { key: "consentVariability", label: "I understand that individual results vary depending on biological response, lifestyle factors (smoking, sun exposure, diet), and the number of sessions completed.", type: "boolean", required: true },
      { key: "consentDisclosure", label: "I have disclosed all relevant medical history including any fish allergies, autoimmune conditions, and current medications.", type: "boolean", required: true },
      { key: "consentPhotos", label: "I consent to before and after photographs for clinical records.", type: "boolean", required: true },
      { key: "consentOver18", label: "I confirm I am over 18 years of age.", type: "boolean", required: true },
      { key: "consentFinal", label: "I freely and voluntarily consent to treatment with Plinest\u00AE polynucleotides by Mastelli.", type: "boolean", required: true },
      { key: "signature", label: "Signature", type: "signature", required: true },
    ],
  },

  // ─── Juv\u00E9derm® Dermal Fillers (Allergan) ───
  {
    name: "Juv\u00E9derm\u00AE Dermal Fillers (Allergan) Consent & Medical History",
    formType: "CONSENT",
    fields: [
      // Section A — Patient Details
      { key: "section_patient", label: "Patient Details", type: "section" },
      { key: "fullName", label: "Full legal name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { key: "emergencyContactName", label: "Emergency contact name", type: "text", required: true },
      { key: "emergencyContactPhone", label: "Emergency contact phone", type: "text", required: true },

      // Section B — Medical History
      { key: "section_medical", label: "Medical History", type: "section" },
      { key: "severeAllergies", label: "Do you have a history of severe allergies, anaphylaxis, or multiple severe allergies?", type: "boolean", required: true },
      { key: "haAllergy", label: "Do you have any known allergy to hyaluronic acid?", type: "boolean", required: true },
      { key: "lidocaineAllergy", label: "Do you have any known allergy to lidocaine or other local anaesthetics? (Juv\u00E9derm products contain lidocaine.)", type: "boolean", required: true },
      { key: "bacterialProteinAllergy", label: "Do you have any known allergy to Gram-positive bacterial proteins?", type: "boolean", required: true },
      { key: "activeSkinInfection", label: "Do you have any active skin infection, cold sores, spots, or inflammation at or near the proposed injection site?", type: "boolean", required: true },
      { key: "immunosuppressive", label: "Are you on immunosuppressive therapy?", type: "boolean" },
      { key: "keloidPigmentation", label: "Do you have a history of keloid or hypertrophic scarring, or pigmentation disorders?", type: "boolean" },
      { key: "facialSurgeryImplants", label: "Have you had any facial surgery, implants, or permanent fillers in the treatment area?", type: "boolean" },
      { key: "facialSurgeryImplantsDetail", label: "Please specify surgeries, implants, or permanent fillers", type: "text", conditionalOn: "facialSurgeryImplants" },
      { key: "recentFacialTreatments", label: "Have you had any recent facial treatments that could interact with filler? (laser, chemical peel, dermabrasion)", type: "boolean" },
      { key: "recentFacialTreatmentsDetail", label: "Please specify treatments and dates", type: "text", conditionalOn: "recentFacialTreatments" },
      { key: "bloodThinners", label: "Are you currently taking blood-thinning medications or supplements? (warfarin, aspirin, NSAIDs, vitamin E, fish oil)", type: "boolean" },
      { key: "pregnant", label: "Are you pregnant or planning to become pregnant?", type: "boolean", required: true },
      { key: "breastfeeding", label: "Are you breastfeeding?", type: "boolean", required: true },
      { key: "under18", label: "Are you under 18 years of age?", type: "boolean", required: true },
      { key: "cardiovascular", label: "Do you have any cardiovascular disease or circulation problems?", type: "boolean" },
      { key: "thinSkin", label: "Do you have very thin skin in the intended treatment area?", type: "boolean" },
      { key: "otherConditions", label: "Any other medical conditions, medications, or previous filler treatments not listed above?", type: "textarea" },

      // Section C — Informed Consent Declarations
      { key: "section_consent", label: "Informed Consent Declarations", type: "section" },
      { key: "consentMechanism", label: "I understand that Juv\u00E9derm\u00AE is a hyaluronic acid (HA) dermal filler manufactured by Allergan. Hyaluronic acid is a naturally occurring substance in the body. Juv\u00E9derm adds temporary volume and smooths facial lines and folds. Results typically last 9\u201324 months depending on the specific product and treatment area.", type: "boolean", required: true },
      { key: "consentCommonSideEffects", label: "I understand the following common side effects: redness, swelling, pain, tenderness, firmness, lumps or bumps, bruising, discolouration, and itching at injection sites. The majority are mild to moderate and resolve within 14 days (or up to 30 days for Volbella).", type: "boolean", required: true },
      { key: "consentVascularOcclusion", label: "I understand the following serious risks: vascular occlusion (blockage of a blood vessel), which can in rare cases lead to skin necrosis (tissue death) or vision changes/blindness if filler enters a blood vessel supplying the eye. I have been informed that my practitioner will inject slowly and with the least pressure necessary to reduce this risk, and that hyaluronidase (an enzyme that dissolves HA filler) is available at the clinic for emergency use.", type: "boolean", required: true },
      { key: "consentAdditionalRisks", label: "I understand the following additional risks: infection, allergic reaction, late-onset nodule formation, asymmetry, and the possibility of little to no effect.", type: "boolean", required: true },
      { key: "consentNotPermanent", label: "I understand that Juv\u00E9derm treatment is not permanent and that retreatment will be required to maintain results.", type: "boolean", required: true },
      { key: "consentPostTreatment", label: "I understand that inflammation may occur if laser, chemical peeling, or dermabrasion procedures are performed in the same area after filler treatment, and I will inform any other treating clinician that I have received dermal filler.", type: "boolean", required: true },
      { key: "consentDisclosure", label: "I have disclosed all allergies (including lidocaine, HA, bacterial proteins), medications, supplements, previous filler treatments, and relevant medical history to my practitioner.", type: "boolean", required: true },
      { key: "consentNoGuarantee", label: "I understand that results cannot be guaranteed and individual outcomes vary.", type: "boolean", required: true },
      { key: "consentPhotos", label: "I consent to before and after photographs for clinical records.", type: "boolean", required: true },
      { key: "consentOver18", label: "I confirm I am over 18 years of age (or 22 years for lip treatments with Volbella/Vollure).", type: "boolean", required: true },
      { key: "consentFinal", label: "I freely and voluntarily consent to treatment with Juv\u00E9derm\u00AE hyaluronic acid dermal filler by Allergan.", type: "boolean", required: true },
      { key: "signature", label: "Signature", type: "signature", required: true },
    ],
  },
  {
    name: "Laser Treatment Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "skinType", label: "How would you describe your skin type?", type: "select", options: ["Fair (Type I-II)", "Medium (Type III)", "Olive (Type IV)", "Brown (Type V)", "Dark (Type VI)"], required: true },
      { key: "sunExposure", label: "Have you had significant sun exposure or used a sunbed in the last 4 weeks?", type: "boolean", required: true },
      { key: "photosensitising", label: "Are you taking any photosensitising medications (tetracyclines, isotretinoin, St John's Wort)?", type: "boolean", required: true },
      { key: "accutane", label: "Have you used Roaccutane/isotretinoin in the last 6 months?", type: "boolean", required: true },
      { key: "activeLesions", label: "Do you have any active skin infections, cold sores, eczema or open wounds in the treatment area?", type: "boolean", required: true },
      { key: "historyKeloid", label: "Do you have a history of keloid or hypertrophic scarring?", type: "boolean", required: true },
      { key: "medications", label: "Current medications", type: "textarea", required: true },
      { key: "riskUnderstood", label: "I understand the risks including temporary redness, swelling, blistering, pigmentation changes, and rare scarring", type: "boolean", required: true },
      { key: "sunscreenAgreed", label: "I agree to apply SPF 50 daily and avoid sun exposure post-treatment as advised", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive laser treatment and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "IV Vitamin Infusion Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "kidneyLiver", label: "Do you have any kidney or liver conditions?", type: "boolean", required: true },
      { key: "heartCondition", label: "Do you have any heart conditions or high blood pressure?", type: "boolean", required: true },
      { key: "diabetes", label: "Do you have diabetes?", type: "boolean" },
      { key: "clottingDisorder", label: "Do you have a blood clotting disorder or are you on anticoagulants?", type: "boolean", required: true },
      { key: "allergies", label: "Known allergies (especially to vitamins, minerals or preservatives)", type: "textarea", required: true },
      { key: "medications", label: "Current medications and supplements", type: "textarea", required: true },
      { key: "previousIV", label: "Have you had IV therapy before? If yes, any reactions?", type: "textarea" },
      { key: "riskUnderstood", label: "I understand the risks including bruising at the site, allergic reaction, air embolism (rare), and infection", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive IV vitamin infusion and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "Skin Peel Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "accutane", label: "Are you currently using or have used Roaccutane/isotretinoin in the last 6 months?", type: "boolean", required: true },
      { key: "retinoids", label: "Are you currently using prescription retinoids (tretinoin, adapalene)?", type: "boolean", required: true },
      { key: "sunExposure", label: "Have you had significant sun exposure or used a sunbed in the last 2 weeks?", type: "boolean", required: true },
      { key: "coldSores", label: "Do you suffer from cold sores or oral herpes in the treatment area?", type: "boolean" },
      { key: "activeSkin", label: "Do you have any active acne cysts, eczema, psoriasis or broken skin in the treatment area?", type: "boolean", required: true },
      { key: "sensitisers", label: "Are you taking any photosensitising medications?", type: "boolean", required: true },
      { key: "keloid", label: "Do you have a history of keloid or abnormal scarring?", type: "boolean", required: true },
      { key: "allergies", label: "Known allergies (especially to acids, salicylates or similar)", type: "textarea", required: true },
      { key: "riskUnderstood", label: "I understand the risks including peeling, redness, sensitivity, temporary darkening/lightening, and rare scarring", type: "boolean", required: true },
      { key: "postCareAgreed", label: "I agree to follow all post-peel care instructions including SPF 50+ and avoiding picking or peeling skin", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive a skin peel and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
];

// Old template names that have been replaced with detailed versions
const REPLACED_TEMPLATES = [
  "Botulinum Toxin (Botox) Consent Form",
  "Dermal Filler Consent Form",
  "Polynucleotide (PDRN/PN) Consent Form",
];

async function seedDefaultTemplates() {
  // Remove old basic templates that have been replaced
  for (const oldName of REPLACED_TEMPLATES) {
    const old = await prisma.formTemplate.findFirst({ where: { name: oldName } });
    if (old) {
      // Only delete if no submissions reference it
      const submissionCount = await prisma.formSubmission.count({ where: { templateId: old.id } });
      if (submissionCount === 0) {
        await prisma.formTemplate.delete({ where: { id: old.id } });
      } else {
        // Deactivate instead of deleting
        await prisma.formTemplate.update({ where: { id: old.id }, data: { isActive: false } });
      }
    }
  }

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await prisma.formTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.formTemplate.create({
        data: {
          name: tpl.name,
          formType: tpl.formType,
          fields: tpl.fields,
          isActive: true,
        },
      });
    }
  }
}

export async function formRoutes(app: FastifyInstance) {
  // --- Templates (Admin) ---

  app.get("/forms/templates", { preHandler: authenticate }, async (request, reply) => {
    const { treatmentId, formType, active } = request.query as {
      treatmentId?: string;
      formType?: string;
      active?: string;
    };

    const where: Record<string, unknown> = {};
    if (treatmentId) where.treatmentId = treatmentId;
    if (formType) where.formType = formType;
    if (active === "true") where.isActive = true;

    const templates = await prisma.formTemplate.findMany({
      where,
      include: { treatment: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ templates });
  });

  app.get("/forms/templates/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: { treatment: { select: { id: true, name: true } } },
    });

    if (!template) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    return reply.send({ template });
  });

  app.post("/forms/templates", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const template = await prisma.formTemplate.create({
      data: {
        name: parsed.data.name,
        formType: parsed.data.formType,
        treatmentId: parsed.data.treatmentId,
        fields: parsed.data.fields,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return reply.status(201).send({ template });
  });

  app.patch("/forms/templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.formTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fields) {
      data.version = existing.version + 1;
    }

    const template = await prisma.formTemplate.update({ where: { id }, data });
    return reply.send({ template });
  });

  app.delete("/forms/templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.formTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    await prisma.formTemplate.delete({ where: { id } });
    return reply.send({ message: "Template deleted" });
  });

  // Seed default templates
  app.post("/forms/seed-defaults", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    await seedDefaultTemplates();
    const count = await prisma.formTemplate.count();
    return reply.send({ message: "Default templates seeded", total: count });
  });

  // --- Submissions ---

  app.post("/forms/submissions", { preHandler: authenticate }, async (request, reply) => {
    const parsed = submitFormSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const template = await prisma.formTemplate.findUnique({ where: { id: parsed.data.templateId } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        templateId: parsed.data.templateId,
        clientId: request.user.sub,
        appointmentId: parsed.data.appointmentId,
        responses: parsed.data.responses as object,
        signatureUrl: parsed.data.signatureUrl,
        signedAt: parsed.data.signatureUrl ? new Date() : null,
      },
    });

    // Auto-populate medical history when a medical questionnaire is submitted
    if (template.formType === "MEDICAL_QUESTIONNAIRE") {
      try {
        const r = parsed.data.responses as Record<string, unknown>;
        const str = (v: unknown) => (v != null && v !== false ? String(v) : "");
        await prisma.medicalHistory.upsert({
          where: { clientId: request.user.sub },
          create: {
            clientId: request.user.sub,
            allergies: str(r.allergies ?? r.allergy ?? ""),
            medications: str(r.medications ?? r.currentMedications ?? ""),
            conditions: str(r.conditions ?? r.medicalConditions ?? ""),
            notes: str(r.notes ?? r.additionalNotes ?? ""),
          },
          update: {
            allergies: str(r.allergies ?? r.allergy ?? ""),
            medications: str(r.medications ?? r.currentMedications ?? ""),
            conditions: str(r.conditions ?? r.medicalConditions ?? ""),
            notes: str(r.notes ?? r.additionalNotes ?? ""),
          },
        });
      } catch (e) {
        console.error("[FORMS] Failed to auto-populate medical history:", e);
      }
    }

    return reply.status(201).send({ submission });
  });

  app.get("/forms/submissions", { preHandler: authenticate }, async (request, reply) => {
    const { clientId, appointmentId, templateId } = request.query as {
      clientId?: string;
      appointmentId?: string;
      templateId?: string;
    };

    const where: Record<string, unknown> = {};

    if (request.user.role === "CLIENT") {
      where.clientId = request.user.sub;
    } else if (clientId) {
      where.clientId = clientId;
    }

    if (appointmentId) where.appointmentId = appointmentId;
    if (templateId) where.templateId = templateId;

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, formType: true, fields: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ submissions });
  });

  app.get("/forms/submissions/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const submission = await prisma.formSubmission.findUnique({
      where: { id },
      include: {
        template: true,
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!submission) {
      return reply.status(404).send({ error: "Submission not found", code: "NOT_FOUND" });
    }

    if (request.user.role === "CLIENT" && submission.clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return reply.send({ submission });
  });

  // Request form from client (admin sends email and/or SMS)
  app.post("/forms/request", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const schema = z.object({
      clientId: z.string(),
      templateId: z.string(),
      appointmentId: z.string().optional(),
      channel: z.enum(["email", "sms", "both"]).default("email"),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const [client, template] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.clientId },
        select: { email: true, firstName: true, phone: true },
      }),
      prisma.formTemplate.findUnique({ where: { id: parsed.data.templateId }, select: { name: true } }),
    ]);

    if (!client || !template) {
      return reply.status(404).send({ error: "Client or template not found", code: "NOT_FOUND" });
    }

    const baseUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const formUrl = `${baseUrl}/forms/${parsed.data.templateId}${parsed.data.appointmentId ? `?appointmentId=${parsed.data.appointmentId}` : ""}`;

    const channel = parsed.data.channel;
    const results: string[] = [];

    if ((channel === "email" || channel === "both") && client.email) {
      await sendFormRequest({
        to: client.email,
        clientName: client.firstName,
        formName: template.name,
        formUrl,
      });
      results.push("email");
    }

    if ((channel === "sms" || channel === "both") && client.phone) {
      await sendSms({
        to: client.phone,
        body: `Hi ${client.firstName}, please complete your ${template.name} before your appointment: ${formUrl}`,
      });
      results.push("sms");
    }

    return reply.send({ message: "Form request sent", channels: results });
  });
}
