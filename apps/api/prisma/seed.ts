import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helpers
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}
function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // ==================== USERS ====================

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

  const practitioners = [practitioner1, practitioner2];

  // Create 25 test clients
  const clientPassword = await bcrypt.hash("client123", 12);
  const clientData = [
    { firstName: "Emma", lastName: "Thompson", email: "emma.thompson@gmail.com", phone: "+447700100001", dob: "1988-03-15" },
    { firstName: "Olivia", lastName: "Brown", email: "olivia.brown@gmail.com", phone: "+447700100002", dob: "1992-07-22" },
    { firstName: "Sophia", lastName: "Wilson", email: "sophia.wilson@gmail.com", phone: "+447700100003", dob: "1985-11-08" },
    { firstName: "Isabella", lastName: "Taylor", email: "isabella.taylor@gmail.com", phone: "+447700100004", dob: "1990-01-30" },
    { firstName: "Mia", lastName: "Davies", email: "mia.davies@gmail.com", phone: "+447700100005", dob: "1995-06-12" },
    { firstName: "Charlotte", lastName: "Evans", email: "charlotte.evans@gmail.com", phone: "+447700100006", dob: "1987-09-25" },
    { firstName: "Amelia", lastName: "Thomas", email: "amelia.thomas@gmail.com", phone: "+447700100007", dob: "1993-04-18" },
    { firstName: "Harper", lastName: "Roberts", email: "harper.roberts@gmail.com", phone: "+447700100008", dob: "1991-12-03" },
    { firstName: "Evelyn", lastName: "Walker", email: "evelyn.walker@gmail.com", phone: "+447700100009", dob: "1986-08-20" },
    { firstName: "Abigail", lastName: "Wright", email: "abigail.wright@gmail.com", phone: "+447700100010", dob: "1994-02-14" },
    { firstName: "Grace", lastName: "Hall", email: "grace.hall@gmail.com", phone: "+447700100011", dob: "1989-10-07" },
    { firstName: "Lily", lastName: "Green", email: "lily.green@gmail.com", phone: "+447700100012", dob: "1996-05-29" },
    { firstName: "Chloe", lastName: "Adams", email: "chloe.adams@gmail.com", phone: "+447700100013", dob: "1984-07-11" },
    { firstName: "Ella", lastName: "Mitchell", email: "ella.mitchell@gmail.com", phone: "+447700100014", dob: "1997-03-24" },
    { firstName: "Zoe", lastName: "Campbell", email: "zoe.campbell@gmail.com", phone: "+447700100015", dob: "1990-11-16" },
    { firstName: "Hannah", lastName: "Phillips", email: "hannah.phillips@gmail.com", phone: "+447700100016", dob: "1988-01-09" },
    { firstName: "Lucy", lastName: "Parker", email: "lucy.parker@gmail.com", phone: "+447700100017", dob: "1993-08-31" },
    { firstName: "Ruby", lastName: "Hughes", email: "ruby.hughes@gmail.com", phone: "+447700100018", dob: "1991-06-05" },
    { firstName: "Daisy", lastName: "Scott", email: "daisy.scott@gmail.com", phone: "+447700100019", dob: "1986-12-28" },
    { firstName: "Poppy", lastName: "Russell", email: "poppy.russell@gmail.com", phone: "+447700100020", dob: "1995-09-13" },
    { firstName: "Jasmine", lastName: "Cooper", email: "jasmine.cooper@gmail.com", phone: "+447700100021", dob: "1987-04-06" },
    { firstName: "Freya", lastName: "Bailey", email: "freya.bailey@gmail.com", phone: "+447700100022", dob: "1992-10-19" },
    { firstName: "Isla", lastName: "Reed", email: "isla.reed@gmail.com", phone: "+447700100023", dob: "1994-07-02" },
    { firstName: "Willow", lastName: "Cook", email: "willow.cook@gmail.com", phone: "+447700100024", dob: "1989-02-26" },
    { firstName: "Ivy", lastName: "Morgan", email: "ivy.morgan@gmail.com", phone: "+447700100025", dob: "1996-11-14" },
  ];

  const clients = [];
  for (const c of clientData) {
    const client = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: clientPassword,
        firstName: c.firstName,
        lastName: c.lastName,
        role: "CLIENT",
        phone: c.phone,
        dateOfBirth: new Date(c.dob),
        intakeFormCompleted: Math.random() > 0.3,
      },
    });
    clients.push(client);
  }
  console.log(`${clients.length} clients seeded`);

  // Archive 2 clients
  await prisma.user.update({ where: { id: clients[23].id }, data: { isArchived: true } });
  await prisma.user.update({ where: { id: clients[24].id }, data: { isArchived: true } });

  // ==================== TREATMENTS ====================

  const treatmentData: {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    category: string;
  }[] = [
    { id: "consultation", name: "Consultation", description: "Acne rosacea, melasma, intimate hyperpigmentation, skin lumps, rejuvenation, psoriasis, post surgical scarring.", durationMinutes: 30, priceCents: 3000, category: "Consultation" },
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
    { id: "df-055-smile", name: "0.55ml Juvéderm Ultra Smile", description: "Subtle lip enhancement with Juvéderm Ultra Smile.", durationMinutes: 30, priceCents: 16000, category: "Dermal Fillers" },
    { id: "df-1-lip", name: "1.0ml Lip Enhancement", description: "Full lip enhancement treatment.", durationMinutes: 30, priceCents: 23000, category: "Dermal Fillers" },
    { id: "df-1-cheek", name: "1.0ml Cheek Enhancement", description: "Cheek augmentation and contouring.", durationMinutes: 45, priceCents: 23000, category: "Dermal Fillers" },
    { id: "df-1-chin-jaw", name: "1.0ml Chin/Jaw Premium Filler", description: "Chin and jawline definition.", durationMinutes: 45, priceCents: 30000, category: "Dermal Fillers" },
    { id: "df-nose", name: "Nose Filler", description: "Non-surgical nose reshaping.", durationMinutes: 30, priceCents: 35000, category: "Dermal Fillers" },
    { id: "df-teartrough", name: "Teartrough Filler", description: "Under-eye teartrough filler treatment.", durationMinutes: 30, priceCents: 30000, category: "Dermal Fillers" },
    { id: "sb-profhilo-face", name: "Profhilo — Face", description: "Profhilo bio-remodelling for facial rejuvenation.", durationMinutes: 30, priceCents: 25000, category: "Skin Boosters & Polynucleotides" },
    { id: "sb-sunekos200", name: "Sunekos 200 — Face or Neck", description: "Sunekos 200 skin booster.", durationMinutes: 30, priceCents: 20000, category: "Skin Boosters & Polynucleotides" },
    { id: "lhr-full-face", name: "Laser Hair Removal — Full Face", description: "Full face laser hair removal.", durationMinutes: 30, priceCents: 6000, category: "Laser Hair Removal" },
    { id: "lhr-underarms", name: "Laser Hair Removal — Underarms", description: "Underarms laser hair removal.", durationMinutes: 15, priceCents: 4000, category: "Laser Hair Removal" },
    { id: "lhr-brazilian", name: "Laser Hair Removal — Brazilian", description: "Brazilian laser hair removal.", durationMinutes: 20, priceCents: 5000, category: "Laser Hair Removal" },
    { id: "lhr-full-body-women", name: "Laser Hair Removal — Full Body (Women)", description: "Full body laser hair removal.", durationMinutes: 90, priceCents: 25000, category: "Laser Hair Removal" },
    { id: "cp-perfect", name: "Perfect Peel", description: "The Perfect Peel for skin renewal.", durationMinutes: 30, priceCents: 25000, category: "Chemical Peel" },
    { id: "mn-face", name: "Microneedling — Face", description: "Microneedling facial treatment.", durationMinutes: 45, priceCents: 15000, category: "Microneedling" },
    { id: "iv-brightening", name: "IV Skin Brightening", description: "Glutathione and Vitamin C IV drip.", durationMinutes: 45, priceCents: 15000, category: "IV & IM Treatments" },
    { id: "fc-hydro", name: "Luxury Hydrofacial", description: "Luxury hydrodermabrasion facial.", durationMinutes: 60, priceCents: 8000, category: "Facials & LED" },
    { id: "bt-contouring", name: "Body Contouring", description: "Cellulite and fat reduction.", durationMinutes: 60, priceCents: 14900, category: "Body Treatment" },
    { id: "ls-facial", name: "Laser Facials", description: "Laser facial rejuvenation.", durationMinutes: 30, priceCents: 12000, category: "Laser Skin Treatment" },
  ];

  let treatmentCount = 0;
  for (const t of treatmentData) {
    await prisma.treatment.upsert({
      where: { id: t.id },
      update: { name: t.name, description: t.description, durationMinutes: t.durationMinutes, priceCents: t.priceCents, category: t.category, isActive: true },
      create: { id: t.id, name: t.name, description: t.description, durationMinutes: t.durationMinutes, priceCents: t.priceCents, category: t.category, isActive: true },
    });
    treatmentCount++;
  }
  console.log(`${treatmentCount} treatments seeded`);

  // Popular treatments for appointment generation
  const popularTreatments = treatmentData.filter((t) =>
    ["aw-3areas", "df-1-lip", "df-1-cheek", "sb-profhilo-face", "lhr-full-face", "lhr-underarms", "cp-perfect", "mn-face", "fc-hydro", "aw-1area", "df-055-smile", "iv-brightening", "consultation"].includes(t.id)
  );

  // ==================== SETTINGS ====================

  const settings = [
    { key: "clinic_name", value: "Dr Skin Central" },
    { key: "clinic_phone", value: "+44 20 7946 0958" },
    { key: "clinic_address", value: "42 Harley Street, London W1G 9PL" },
    { key: "booking_deposit_percent", value: 50 },
    { key: "cancellation_policy", value: "Cancellations must be made at least 24 hours before the appointment. Late cancellations or no-shows may forfeit the deposit." },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`${settings.length} settings seeded`);

  // ==================== APPOINTMENTS ====================

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appointmentRecords: { id: string; clientId: string; practitionerId: string; treatmentId: string; startsAt: Date; status: string; priceCents: number }[] = [];

  // Skip appointment seeding if data already exists
  const existingApptCount = await prisma.appointment.count();
  if (existingApptCount > 10) {
    console.log(`${existingApptCount} appointments already exist — skipping appointment seed`);
    console.log("Seeding complete!");
    return;
  }

  // Clean slate for appointments
  await prisma.review.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.appointment.deleteMany({});

  // Past appointments (2-3 months ago) — all COMPLETED
  for (let i = 0; i < 30; i++) {
    const client = clients[i % 23]; // first 23 non-archived
    const practitioner = pick(practitioners);
    const treatment = pick(popularTreatments);
    const date = randomDate(addDays(today, -90), addDays(today, -14));
    const hour = randomInt(9, 16);
    const startsAt = setTime(date, hour, pick([0, 15, 30, 45]));
    const endsAt = new Date(startsAt.getTime() + treatment.durationMinutes * 60000);

    const apt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId: practitioner.id,
        treatmentId: treatment.id,
        startsAt,
        endsAt,
        status: "COMPLETED",
        depositPaid: true,
        depositAmountCents: Math.round(treatment.priceCents * 0.5),
      },
    });
    appointmentRecords.push({ id: apt.id, clientId: client.id, practitionerId: practitioner.id, treatmentId: treatment.id, startsAt, status: "COMPLETED", priceCents: treatment.priceCents });
  }

  // Recent appointments (past 2 weeks) — mixed statuses
  const recentStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "CONFIRMED", "CANCELLED", "NO_SHOW"];
  for (let i = 0; i < 25; i++) {
    const client = clients[i % 23];
    const practitioner = pick(practitioners);
    const treatment = pick(popularTreatments);
    const date = randomDate(addDays(today, -13), addDays(today, -1));
    const hour = randomInt(9, 16);
    const startsAt = setTime(date, hour, pick([0, 15, 30, 45]));
    const endsAt = new Date(startsAt.getTime() + treatment.durationMinutes * 60000);
    const status = pick(recentStatuses);

    const apt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId: practitioner.id,
        treatmentId: treatment.id,
        startsAt,
        endsAt,
        status,
        depositPaid: status !== "CANCELLED",
        depositAmountCents: Math.round(treatment.priceCents * 0.5),
      },
    });
    appointmentRecords.push({ id: apt.id, clientId: client.id, practitionerId: practitioner.id, treatmentId: treatment.id, startsAt, status, priceCents: treatment.priceCents });
  }

  // Today's appointments
  const todaySlots = [
    { hour: 9, min: 0 }, { hour: 10, min: 0 }, { hour: 11, min: 30 },
    { hour: 13, min: 0 }, { hour: 14, min: 30 }, { hour: 16, min: 0 },
  ];
  for (let i = 0; i < todaySlots.length; i++) {
    const client = clients[i % 23];
    const practitioner = practitioners[i % 2];
    const treatment = pick(popularTreatments);
    const startsAt = setTime(today, todaySlots[i].hour, todaySlots[i].min);
    const endsAt = new Date(startsAt.getTime() + treatment.durationMinutes * 60000);
    const status = startsAt < now ? "COMPLETED" : "CONFIRMED";

    const apt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId: practitioner.id,
        treatmentId: treatment.id,
        startsAt,
        endsAt,
        status,
        depositPaid: true,
        depositAmountCents: Math.round(treatment.priceCents * 0.5),
      },
    });
    appointmentRecords.push({ id: apt.id, clientId: client.id, practitionerId: practitioner.id, treatmentId: treatment.id, startsAt, status, priceCents: treatment.priceCents });
  }

  // Future appointments (next 2 weeks)
  for (let i = 0; i < 15; i++) {
    const client = clients[i % 23];
    const practitioner = pick(practitioners);
    const treatment = pick(popularTreatments);
    const date = randomDate(addDays(today, 1), addDays(today, 14));
    const hour = randomInt(9, 16);
    const startsAt = setTime(date, hour, pick([0, 15, 30, 45]));
    const endsAt = new Date(startsAt.getTime() + treatment.durationMinutes * 60000);

    const apt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId: practitioner.id,
        treatmentId: treatment.id,
        startsAt,
        endsAt,
        status: "CONFIRMED",
        depositPaid: true,
        depositAmountCents: Math.round(treatment.priceCents * 0.5),
      },
    });
    appointmentRecords.push({ id: apt.id, clientId: client.id, practitionerId: practitioner.id, treatmentId: treatment.id, startsAt, status: "CONFIRMED", priceCents: treatment.priceCents });
  }

  console.log(`${appointmentRecords.length} appointments seeded`);

  // ==================== PAYMENTS ====================

  const completedAppts = appointmentRecords.filter((a) => a.status === "COMPLETED");
  let paymentCount = 0;
  for (const apt of completedAppts) {
    await prisma.payment.create({
      data: {
        appointmentId: apt.id,
        clientId: apt.clientId,
        amountCents: apt.priceCents,
        status: "CAPTURED",
        type: "DEPOSIT",
        paymentMethod: Math.random() > 0.2 ? "STRIPE" : "CASH",
      },
    });
    paymentCount++;
  }
  console.log(`${paymentCount} payments seeded`);

  // ==================== STAFF TARGETS ====================

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  for (const p of practitioners) {
    await prisma.staffTarget.create({
      data: { practitionerId: p.id, type: "REVENUE", amountCents: 1500000, period: "MONTHLY", startsAt: monthStart, endsAt: monthEnd },
    });
    await prisma.staffTarget.create({
      data: { practitionerId: p.id, type: "APPOINTMENTS", appointmentCount: 40, period: "MONTHLY", startsAt: monthStart, endsAt: monthEnd },
    });
  }
  console.log("4 staff targets seeded");

  // ==================== REVIEWS ====================

  const reviewComments = [
    "Brilliant results, very natural looking!",
    "Sarah was amazing, so gentle and professional.",
    "Really happy with the outcome. Will definitely be back.",
    "James explained everything clearly. Felt very comfortable.",
    "Great experience from start to finish.",
    "The clinic is lovely and the staff are wonderful.",
    "Noticed a huge difference after just one session.",
    "Best aesthetic treatment I've ever had.",
    "Very thorough consultation before the procedure.",
    "Exceeded my expectations. Highly recommend!",
    "Good results but a bit bruised afterwards.",
    "Professional and clean clinic. Felt safe throughout.",
    "Already booked my next appointment!",
    "The aftercare advice was really helpful.",
    "Wonderful results, my friends keep asking what I've done!",
  ];

  let reviewCount = 0;
  for (const apt of completedAppts.slice(0, 15)) {
    try {
      await prisma.review.create({
        data: {
          clientId: apt.clientId,
          practitionerId: apt.practitionerId,
          appointmentId: apt.id,
          rating: pick([4, 4, 4, 5, 5, 5, 5, 3]),
          comment: reviewComments[reviewCount % reviewComments.length],
        },
      });
      reviewCount++;
    } catch { /* skip duplicates */ }
  }
  console.log(`${reviewCount} reviews seeded`);

  // ==================== LOYALTY POINTS ====================

  let loyaltyCount = 0;
  for (const apt of completedAppts) {
    await prisma.loyaltyPoints.create({
      data: { clientId: apt.clientId, points: 10, reason: "booking", reference: apt.id },
    });
    loyaltyCount++;
  }
  // Some redemptions
  for (let i = 0; i < 5; i++) {
    await prisma.loyaltyPoints.create({
      data: { clientId: clients[i].id, points: -50, reason: "redemption" },
    });
    loyaltyCount++;
  }
  console.log(`${loyaltyCount} loyalty point records seeded`);

  // ==================== REFERRALS ====================

  const referralStatuses = ["completed", "completed", "completed", "pending", "pending"];
  for (let i = 0; i < 5; i++) {
    const referrer = clients[i];
    const referred = clients[i + 10];
    try {
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: referred.id,
          referralCode: `REF${referrer.firstName.toUpperCase().slice(0, 4)}${randomInt(1000, 9999)}`,
          status: referralStatuses[i],
          rewardPoints: referralStatuses[i] === "completed" ? 50 : 0,
        },
      });
    } catch { /* skip duplicate codes */ }
  }
  console.log("5 referrals seeded");

  // ==================== GIFT CARDS ====================

  const giftCards = [
    { code: "GIFT-ABCD-1234", balance: 0, original: 10000, purchaser: 0, redeemer: 5 },
    { code: "GIFT-EFGH-5678", balance: 3500, original: 5000, purchaser: 2, redeemer: 8 },
    { code: "GIFT-IJKL-9012", balance: 7500, original: 7500, purchaser: 4, redeemer: null },
  ];
  for (const gc of giftCards) {
    try {
      await prisma.giftCard.create({
        data: {
          code: gc.code,
          balanceCents: gc.balance,
          originalBalanceCents: gc.original,
          purchasedByClientId: clients[gc.purchaser].id,
          redeemedByClientId: gc.redeemer !== null ? clients[gc.redeemer].id : null,
          expiresAt: addDays(now, 365),
        },
      });
    } catch { /* skip duplicates */ }
  }
  console.log("3 gift cards seeded");

  // ==================== PROMO CODES ====================

  const promoCodes = [
    { code: "WELCOME10", discountType: "percentage", discountValue: 10, maxUses: 100, validFrom: addDays(now, -30), validUntil: addDays(now, 60) },
    { code: "SAVE20", discountType: "fixed", discountValue: 2000, maxUses: 50, validFrom: addDays(now, -7), validUntil: addDays(now, 30) },
    { code: "SUMMER15", discountType: "percentage", discountValue: 15, maxUses: 30, validFrom: addDays(now, -90), validUntil: addDays(now, -30) },
  ];
  for (const pc of promoCodes) {
    try {
      await prisma.promoCode.create({
        data: {
          code: pc.code,
          discountType: pc.discountType,
          discountValue: pc.discountValue,
          maxUses: pc.maxUses,
          currentUses: pc.code === "SUMMER15" ? 28 : randomInt(0, 10),
          validFrom: pc.validFrom,
          validUntil: pc.validUntil,
          isActive: pc.code !== "SUMMER15",
        },
      });
    } catch { /* skip duplicates */ }
  }
  console.log("3 promo codes seeded");

  // ==================== MEDICAL HISTORY ====================

  const medHistories = [
    { allergies: "Penicillin", medications: "None", conditions: "None" },
    { allergies: "None known", medications: "Levothyroxine 50mcg", conditions: "Hypothyroidism" },
    { allergies: "Latex", medications: "Cetirizine 10mg daily", conditions: "Hay fever, eczema" },
    { allergies: "None", medications: "Metformin 500mg", conditions: "Type 2 diabetes" },
    { allergies: "Ibuprofen", medications: "None", conditions: "None" },
    { allergies: "None", medications: "Sertraline 50mg", conditions: "Anxiety" },
    { allergies: "Shellfish", medications: "None", conditions: "Rosacea" },
    { allergies: "None known", medications: "Amlodipine 5mg", conditions: "High blood pressure" },
    { allergies: "None", medications: "Combined oral contraceptive", conditions: "None" },
    { allergies: "Aspirin, codeine", medications: "Omeprazole 20mg", conditions: "Acid reflux" },
  ];
  for (let i = 0; i < 10; i++) {
    await prisma.medicalHistory.upsert({
      where: { clientId: clients[i].id },
      update: {},
      create: {
        clientId: clients[i].id,
        allergies: medHistories[i].allergies,
        medications: medHistories[i].medications,
        conditions: medHistories[i].conditions,
      },
    });
  }
  console.log("10 medical histories seeded");

  // ==================== NOTIFICATIONS ====================

  const notifTypes = [
    { type: "BOOKING_CONFIRMED", title: "Appointment Confirmed", body: "Your appointment has been confirmed." },
    { type: "PAYMENT_SUCCESS", title: "Payment Received", body: "Your payment has been processed successfully." },
    { type: "NEW_BOOKING", title: "New Booking", body: "A new appointment has been booked." },
    { type: "FOLLOW_UP", title: "How was your treatment?", body: "We hope you enjoyed your recent visit. Please leave a review!" },
  ];
  for (let i = 0; i < 15; i++) {
    const notif = pick(notifTypes);
    await prisma.notification.create({
      data: {
        userId: i < 5 ? admin.id : clients[i % 23].id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        readAt: Math.random() > 0.4 ? randomDate(addDays(now, -7), now) : null,
      },
    });
  }
  console.log("15 notifications seeded");

  // ==================== BLOCKED SLOTS ====================

  // Lunch breaks for next week
  for (let day = 1; day <= 5; day++) {
    const date = addDays(today, day);
    const practitioner = pick(practitioners);
    await prisma.blockedSlot.create({
      data: {
        practitionerId: practitioner.id,
        startsAt: setTime(date, 12, 0),
        endsAt: setTime(date, 13, 0),
        reason: "Lunch break",
      },
    });
  }
  // Training day
  await prisma.blockedSlot.create({
    data: {
      practitionerId: practitioner1.id,
      startsAt: setTime(addDays(today, 5), 9, 0),
      endsAt: setTime(addDays(today, 5), 18, 0),
      reason: "Training day",
    },
  });
  console.log("6 blocked slots seeded");

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    // Don't process.exit(1) — let the server still start
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
