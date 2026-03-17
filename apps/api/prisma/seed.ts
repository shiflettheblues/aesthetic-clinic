import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: {},
    create: {
      email: "admin@clinic.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // Create practitioners
  const practitionerPassword = await bcrypt.hash("practitioner123", 12);

  const practitioner1 = await prisma.user.upsert({
    where: { email: "sarah@drskincentral.com" },
    update: {},
    create: {
      email: "sarah@drskincentral.com",
      passwordHash: practitionerPassword,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "PRACTITIONER",
      bio: "Senior aesthetic practitioner with 10 years experience in injectables and skin treatments.",
      specialties: ["Anti-Wrinkles", "Dermal Fillers", "Chemical Peels", "Skin Boosters"],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      workingDays: [1, 2, 3, 4, 5],
    },
  });
  console.log(`Practitioner created: ${practitioner1.email}`);

  const practitioner2 = await prisma.user.upsert({
    where: { email: "james@drskincentral.com" },
    update: {},
    create: {
      email: "james@drskincentral.com",
      passwordHash: practitionerPassword,
      firstName: "James",
      lastName: "Williams",
      role: "PRACTITIONER",
      bio: "Specialist in laser treatments, body contouring, and advanced skin rejuvenation.",
      specialties: ["Laser Hair Removal", "Laser Skin Treatment", "Body Treatments", "Microneedling"],
      workingHoursStart: "10:00",
      workingHoursEnd: "19:00",
      workingDays: [1, 2, 3, 4, 5, 6],
    },
  });
  console.log(`Practitioner created: ${practitioner2.email}`);

  // Create test client
  const clientPassword = await bcrypt.hash("client123", 12);
  const client = await prisma.user.upsert({
    where: { email: "client@clinic.com" },
    update: {},
    create: {
      email: "client@clinic.com",
      passwordHash: clientPassword,
      firstName: "Test",
      lastName: "Client",
      role: "CLIENT",
    },
  });
  console.log(`Client created: ${client.email}`);

  // Seed all Dr Skin Central treatments
  const treatmentData: {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    category: string;
  }[] = [
    // Consultation
    { id: "consultation", name: "Consultation", description: "Acne rosacea, melasma, intimate hyperpigmentation, skin lumps, rejuvenation, psoriasis, post surgical scarring.", durationMinutes: 30, priceCents: 3000, category: "Consultation" },

    // Anti-Wrinkles
    { id: "aw-small", name: "Anti-Wrinkle — Small Area", description: "Bunny lines, dimpled chin, gummy smile, lip flip.", durationMinutes: 15, priceCents: 10000, category: "Anti-Wrinkles" },
    { id: "aw-1area", name: "Anti-Wrinkle — 1 Area", description: "Single area anti-wrinkle treatment.", durationMinutes: 20, priceCents: 18000, category: "Anti-Wrinkles" },
    { id: "aw-2areas", name: "Anti-Wrinkle — 2 Areas", description: "Two area anti-wrinkle treatment.", durationMinutes: 30, priceCents: 20000, category: "Anti-Wrinkles" },
    { id: "aw-3areas", name: "Anti-Wrinkle — 3 Areas", description: "Three area anti-wrinkle treatment.", durationMinutes: 30, priceCents: 30000, category: "Anti-Wrinkles" },
    { id: "aw-1area-men", name: "Anti-Wrinkle — 1 Area (Men)", description: "Single area anti-wrinkle treatment for men.", durationMinutes: 20, priceCents: 18000, category: "Anti-Wrinkles" },
    { id: "aw-2areas-men", name: "Anti-Wrinkle — 2 Areas (Men)", description: "Two area anti-wrinkle treatment for men.", durationMinutes: 30, priceCents: 27000, category: "Anti-Wrinkles" },
    { id: "aw-3areas-men", name: "Anti-Wrinkle — 3 Areas (Men)", description: "Three area anti-wrinkle treatment for men.", durationMinutes: 30, priceCents: 30000, category: "Anti-Wrinkles" },
    { id: "aw-jaw", name: "Jaw Slimming / Grinding", description: "Jaw slimming or teeth grinding treatment.", durationMinutes: 20, priceCents: 29000, category: "Anti-Wrinkles" },
    { id: "aw-sweating", name: "Excessive Sweating", description: "Treatment for hyperhidrosis / excessive sweating.", durationMinutes: 30, priceCents: 35000, category: "Anti-Wrinkles" },
    { id: "aw-neck", name: "Neck Platysmal Bands", description: "Neck platysmal bands treatment.", durationMinutes: 20, priceCents: 22000, category: "Anti-Wrinkles" },
    { id: "aw-traptox", name: "Traptox", description: "Trapezius toxin treatment for shoulder slimming.", durationMinutes: 30, priceCents: 35000, category: "Anti-Wrinkles" },

    // Dermal Fillers
    { id: "df-055-smile", name: "0.55ml Juvéderm Ultra Smile", description: "Subtle lip enhancement with Juvéderm Ultra Smile.", durationMinutes: 30, priceCents: 16000, category: "Dermal Fillers" },
    { id: "df-05-lip", name: "0.5ml Premium Lip Filler", description: "Premium lip filler for natural enhancement.", durationMinutes: 30, priceCents: 16000, category: "Dermal Fillers" },
    { id: "df-1-cheek", name: "1.0ml Cheek Enhancement", description: "Cheek augmentation and contouring.", durationMinutes: 45, priceCents: 23000, category: "Dermal Fillers" },
    { id: "df-1-chin-jaw", name: "1.0ml Chin/Jaw Premium Filler", description: "Chin and jawline definition.", durationMinutes: 45, priceCents: 30000, category: "Dermal Fillers" },
    { id: "df-1-lip", name: "1.0ml Lip Enhancement", description: "Full lip enhancement treatment.", durationMinutes: 30, priceCents: 23000, category: "Dermal Fillers" },
    { id: "df-1-dermal", name: "1.0ml Dermal Filler", description: "1ml dermal filler treatment.", durationMinutes: 30, priceCents: 23000, category: "Dermal Fillers" },
    { id: "df-2-dermal", name: "2.0ml Dermal Filler", description: "2ml dermal filler treatment.", durationMinutes: 45, priceCents: 35000, category: "Dermal Fillers" },
    { id: "df-3-dermal", name: "3.0ml Dermal Filler", description: "3ml dermal filler treatment.", durationMinutes: 60, priceCents: 55000, category: "Dermal Fillers" },
    { id: "df-4-dermal", name: "4.0ml Dermal Filler", description: "4ml dermal filler treatment.", durationMinutes: 60, priceCents: 75000, category: "Dermal Fillers" },
    { id: "df-5-dermal", name: "5.0ml Dermal Filler", description: "5ml dermal filler treatment.", durationMinutes: 75, priceCents: 90000, category: "Dermal Fillers" },
    { id: "df-nose", name: "Nose Filler", description: "Non-surgical nose reshaping.", durationMinutes: 30, priceCents: 35000, category: "Dermal Fillers" },
    { id: "df-teartrough", name: "Teartrough Filler", description: "Under-eye teartrough filler treatment.", durationMinutes: 30, priceCents: 30000, category: "Dermal Fillers" },

    // Filler Dissolving
    { id: "fd-1area", name: "Filler Dissolving — 1 Area", description: "Hyaluronidase injection to dissolve filler in one area.", durationMinutes: 30, priceCents: 15000, category: "Filler Dissolving" },
    { id: "fd-2areas", name: "Filler Dissolving — 2 Areas", description: "Hyaluronidase injection to dissolve filler in two areas.", durationMinutes: 45, priceCents: 25000, category: "Filler Dissolving" },

    // Skin Boosters & Polynucleotides
    { id: "sb-sunekos200", name: "Sunekos 200 — Face or Neck", description: "Sunekos 200 skin booster for face or neck rejuvenation.", durationMinutes: 30, priceCents: 20000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-sunekos1200", name: "Sunekos 1200", description: "Sunekos 1200 advanced skin booster.", durationMinutes: 30, priceCents: 25000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-poly-boosters", name: "Polynucleotide Skin Boosters", description: "Polynucleotide-based skin rejuvenation treatment.", durationMinutes: 30, priceCents: 20000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-profhilo-face", name: "Profhilo — Face", description: "Profhilo bio-remodelling for facial rejuvenation.", durationMinutes: 30, priceCents: 25000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-profhilo-neck", name: "Profhilo — Neck", description: "Profhilo bio-remodelling for neck rejuvenation.", durationMinutes: 30, priceCents: 25000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-profhilo-face-neck", name: "Profhilo — Face & Neck", description: "Profhilo bio-remodelling for face and neck.", durationMinutes: 45, priceCents: 45000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-profhilo-body", name: "Profhilo — Body Rejuvenation", description: "Profhilo bio-remodelling for body areas.", durationMinutes: 45, priceCents: 50000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-poly-eyes", name: "Polynucleotide Eyes", description: "Polynucleotide treatment for the eye area.", durationMinutes: 20, priceCents: 15000, category: "Skin Boosters & Polynucleotides" },

    // PRP
    { id: "prp-facial", name: "PRP Facial", description: "Platelet rich plasma facial rejuvenation.", durationMinutes: 45, priceCents: 20000, category: "Platelet Rich Plasma Therapy" },
    { id: "prp-micro", name: "PRP Therapy + Microneedling", description: "Combined PRP and microneedling treatment.", durationMinutes: 60, priceCents: 25000, category: "Platelet Rich Plasma Therapy" },
    { id: "prp-hair", name: "PRP for Hair Thinning", description: "PRP treatment for hair loss and thinning.", durationMinutes: 45, priceCents: 20000, category: "Platelet Rich Plasma Therapy" },

    // Fat Reduction Injections
    { id: "fat-1area", name: "Fat Reduction — 1 Area", description: "Aqualyx fat dissolving injection — single area.", durationMinutes: 30, priceCents: 6000, category: "Fat Reduction Injections" },
    { id: "fat-2areas", name: "Fat Reduction — 2 Areas", description: "Aqualyx fat dissolving injection — two areas.", durationMinutes: 45, priceCents: 11000, category: "Fat Reduction Injections" },
    { id: "fat-3areas", name: "Fat Reduction — 3 Areas", description: "Aqualyx fat dissolving injection — three areas.", durationMinutes: 60, priceCents: 16000, category: "Fat Reduction Injections" },
    { id: "fat-4areas", name: "Fat Reduction — 4 Areas", description: "Aqualyx fat dissolving injection — four areas.", durationMinutes: 60, priceCents: 20000, category: "Fat Reduction Injections" },

    // IV & IM Treatments
    { id: "iv-brightening", name: "IV Skin Brightening", description: "Glutathione and Vitamin C IV drip for skin brightening.", durationMinutes: 45, priceCents: 15000, category: "IV & IM Treatments" },
    { id: "iv-immunity", name: "IV Immunity Boost", description: "Immune-boosting IV drip with vitamins and minerals.", durationMinutes: 45, priceCents: 15000, category: "IV & IM Treatments" },
    { id: "iv-energy", name: "IV Energy Boost", description: "Energy-boosting IV drip.", durationMinutes: 45, priceCents: 20000, category: "IV & IM Treatments" },
    { id: "im-b12", name: "IM Vitamin B12", description: "Intramuscular B12 injection.", durationMinutes: 15, priceCents: 8000, category: "IV & IM Treatments" },

    // Microneedling
    { id: "mn-face", name: "Microneedling — Face", description: "Microneedling facial treatment for skin rejuvenation.", durationMinutes: 45, priceCents: 15000, category: "Microneedling" },
    { id: "mn-neck", name: "Microneedling — Neck", description: "Microneedling treatment for the neck.", durationMinutes: 45, priceCents: 15000, category: "Microneedling" },
    { id: "mn-face-neck", name: "Microneedling — Face & Neck", description: "Combined face and neck microneedling treatment.", durationMinutes: 60, priceCents: 25000, category: "Microneedling" },
    { id: "mn-body", name: "Microneedling — Body Area", description: "Microneedling treatment for body areas.", durationMinutes: 45, priceCents: 15000, category: "Microneedling" },

    // Chemical Peels
    { id: "cp-patch", name: "Chemical Peel Patch Test", description: "Complimentary patch test for chemical peels.", durationMinutes: 15, priceCents: 100, category: "Chemical Peel" },
    { id: "cp-clinicare", name: "Clinicare Glow Peel", description: "Clinicare glow peel for radiant skin.", durationMinutes: 30, priceCents: 6000, category: "Chemical Peel" },
    { id: "cp-cosmelan", name: "Cosmelan", description: "Advanced depigmentation treatment.", durationMinutes: 60, priceCents: 100000, category: "Chemical Peel" },
    { id: "cp-mesopeel", name: "Mesoestetic Mesopeel", description: "Professional-grade chemical peel by Mesoestetic.", durationMinutes: 30, priceCents: 10000, category: "Chemical Peel" },
    { id: "cp-perfect", name: "Perfect Peel", description: "The Perfect Peel for skin renewal.", durationMinutes: 30, priceCents: 25000, category: "Chemical Peel" },
    { id: "cp-blemiderm", name: "Blemiderm", description: "Blemiderm peel for blemish-prone skin.", durationMinutes: 30, priceCents: 35000, category: "Chemical Peel" },

    // Laser Hair Removal
    { id: "lhr-patch", name: "Laser Patch Test", description: "Complimentary laser hair removal patch test.", durationMinutes: 15, priceCents: 0, category: "Laser Hair Removal" },
    { id: "lhr-small", name: "Laser Hair Removal — Small Area", description: "Ears, glabella, nipples, upper lip, chin, sagittal trail, perianal area. (15 mins)", durationMinutes: 15, priceCents: 3000, category: "Laser Hair Removal" },
    { id: "lhr-full-face", name: "Laser Hair Removal — Full Face", description: "Full face laser hair removal.", durationMinutes: 30, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-lip-chin", name: "Laser Hair Removal — Lip & Chin", description: "Lip and chin laser hair removal.", durationMinutes: 20, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-cheeks", name: "Laser Hair Removal — Cheeks", description: "Cheek area laser hair removal.", durationMinutes: 20, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-lower-face", name: "Laser Hair Removal — Lower Face", description: "Under chin laser hair removal.", durationMinutes: 20, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-neck", name: "Laser Hair Removal — Neck", description: "Neck laser hair removal.", durationMinutes: 20, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-upper-back-neck", name: "Laser Hair Removal — Upper Back & Neck", description: "Upper back and neck laser hair removal.", durationMinutes: 30, priceCents: 12000, category: "Laser Hair Removal" },
    { id: "lhr-shoulders", name: "Laser Hair Removal — Shoulders", description: "Shoulder area laser hair removal.", durationMinutes: 20, priceCents: 8000, category: "Laser Hair Removal" },
    { id: "lhr-abdomen", name: "Laser Hair Removal — Abdomen", description: "Abdomen laser hair removal.", durationMinutes: 20, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-chest-abdomen", name: "Laser Hair Removal — Chest & Abdomen", description: "Chest and abdomen laser hair removal.", durationMinutes: 30, priceCents: 13000, category: "Laser Hair Removal" },
    { id: "lhr-back", name: "Laser Hair Removal — Back", description: "Full back laser hair removal.", durationMinutes: 30, priceCents: 10000, category: "Laser Hair Removal" },
    { id: "lhr-buttocks", name: "Laser Hair Removal — Buttocks", description: "Buttocks laser hair removal.", durationMinutes: 20, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-back-buttocks", name: "Laser Hair Removal — Back & Buttocks", description: "Back and buttocks laser hair removal.", durationMinutes: 45, priceCents: 14000, category: "Laser Hair Removal" },
    { id: "lhr-full-arms", name: "Laser Hair Removal — Full Arms & Underarms", description: "Full arms and underarms laser hair removal.", durationMinutes: 30, priceCents: 10000, category: "Laser Hair Removal" },
    { id: "lhr-half-arms", name: "Laser Hair Removal — Half Arms", description: "Half arms laser hair removal.", durationMinutes: 20, priceCents: 8000, category: "Laser Hair Removal" },
    { id: "lhr-hands", name: "Laser Hair Removal — Hands & Fingers", description: "Hands and fingers laser hair removal.", durationMinutes: 15, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-underarms", name: "Laser Hair Removal — Underarms", description: "Underarms laser hair removal.", durationMinutes: 15, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-underarms-bikini", name: "Laser Hair Removal — Underarms & Bikini", description: "Underarms and bikini laser hair removal.", durationMinutes: 25, priceCents: 7500, category: "Laser Hair Removal" },
    { id: "lhr-underarms-brazilian", name: "Laser Hair Removal — Underarms & Brazilian", description: "Underarms and Brazilian laser hair removal.", durationMinutes: 30, priceCents: 8000, category: "Laser Hair Removal" },
    { id: "lhr-underarms-hollywood", name: "Laser Hair Removal — Underarms & Hollywood", description: "Underarms and Hollywood laser hair removal.", durationMinutes: 30, priceCents: 9000, category: "Laser Hair Removal" },
    { id: "lhr-bikini", name: "Laser Hair Removal — Bikini", description: "Bikini line laser hair removal.", durationMinutes: 15, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-brazilian", name: "Laser Hair Removal — Brazilian", description: "Brazilian laser hair removal.", durationMinutes: 20, priceCents: 5000, category: "Laser Hair Removal" },
    { id: "lhr-hollywood", name: "Laser Hair Removal — Hollywood", description: "Hollywood laser hair removal.", durationMinutes: 20, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-full-leg", name: "Laser Hair Removal — Full Leg", description: "Full leg laser hair removal.", durationMinutes: 45, priceCents: 12000, category: "Laser Hair Removal" },
    { id: "lhr-half-leg", name: "Laser Hair Removal — Half Leg", description: "Half leg laser hair removal.", durationMinutes: 30, priceCents: 8000, category: "Laser Hair Removal" },
    { id: "lhr-inner-thigh", name: "Laser Hair Removal — Inner Thigh", description: "Inner thigh laser hair removal.", durationMinutes: 20, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-full-body-women", name: "Laser Hair Removal — Full Body (Women)", description: "Full body laser hair removal for women.", durationMinutes: 90, priceCents: 25000, category: "Laser Hair Removal" },
    { id: "lhr-full-body-men", name: "Laser Hair Removal — Full Body (Men)", description: "Full body laser hair removal for men.", durationMinutes: 120, priceCents: 35000, category: "Laser Hair Removal" },

    // Facials & LED
    { id: "fc-relaxation", name: "Relaxation Facial", description: "Relaxing facial treatment.", durationMinutes: 45, priceCents: 4000, category: "Facials & LED" },
    { id: "fc-hydro", name: "Luxury Hydrofacial", description: "Luxury hydrodermabrasion facial.", durationMinutes: 60, priceCents: 8000, category: "Facials & LED" },
    { id: "fc-dermalux", name: "Dermalux LED Photofacial", description: "LED light therapy photofacial.", durationMinutes: 30, priceCents: 4500, category: "Facials & LED" },
    { id: "fc-dermalux-addon", name: "Dermalux LED — Add On", description: "Add Dermalux LED to any treatment.", durationMinutes: 15, priceCents: 2000, category: "Facials & LED" },

    // Wellness
    { id: "wl-earwax", name: "Earwax Microsuction", description: "Professional earwax removal by microsuction.", durationMinutes: 30, priceCents: 7000, category: "Wellness" },
    { id: "wl-cryo-single", name: "Cryotherapy — Single Lesion", description: "Cryotherapy for mole, wart, or skin tag removal — single lesion.", durationMinutes: 15, priceCents: 6000, category: "Wellness" },
    { id: "wl-cryo-two", name: "Cryotherapy — Two Lesions", description: "Cryotherapy for mole, wart, or skin tag removal — two lesions.", durationMinutes: 20, priceCents: 10000, category: "Wellness" },

    // Body Treatments
    { id: "bt-contouring", name: "Body Contouring", description: "Cellulite and fat reduction body contouring.", durationMinutes: 60, priceCents: 14900, category: "Body Treatment" },
    { id: "bt-tighten-small", name: "Skin Tightening — Small Area", description: "Skin tightening treatment for small area.", durationMinutes: 30, priceCents: 8000, category: "Body Treatment" },
    { id: "bt-tighten-large", name: "Skin Tightening — Large Area", description: "Skin tightening treatment for large area.", durationMinutes: 45, priceCents: 13000, category: "Body Treatment" },
    { id: "bt-sculpting", name: "Muscle Sculpting", description: "Non-invasive muscle sculpting treatment.", durationMinutes: 30, priceCents: 8000, category: "Body Treatment" },
    { id: "bt-cryo", name: "Cryotherapy (Body)", description: "Body cryotherapy treatment.", durationMinutes: 30, priceCents: 8000, category: "Body Treatment" },

    // Laser Skin Treatment
    { id: "ls-facial", name: "Laser Facials", description: "Laser facial rejuvenation treatment.", durationMinutes: 30, priceCents: 12000, category: "Laser Skin Treatment" },
    { id: "ls-age-spot", name: "Solitary Age Spot", description: "Single age spot laser removal.", durationMinutes: 15, priceCents: 5000, category: "Laser Skin Treatment" },
    { id: "ls-redness", name: "Diffuse Redness", description: "Laser treatment for diffuse redness and rosacea.", durationMinutes: 30, priceCents: 12000, category: "Laser Skin Treatment" },
    { id: "ls-age-spots", name: "Diffuse Age Spots", description: "Laser treatment for multiple age spots.", durationMinutes: 30, priceCents: 15000, category: "Laser Skin Treatment" },
  ];

  let created = 0;
  for (const t of treatmentData) {
    await prisma.treatment.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        priceCents: t.priceCents,
        category: t.category,
        isActive: true,
      },
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        priceCents: t.priceCents,
        category: t.category,
        isActive: true,
      },
    });
    created++;
  }
  console.log(`${created} treatments seeded`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
