"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import clsx from "clsx";

function formatPrice(cents: number) {
  return (cents / 100).toFixed(0);
}

type Step = "treatment" | "practitioner" | "datetime" | "confirm";

interface Treatment {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  category?: string;
}

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  specialties: string[];
  avatarUrl?: string;
}

interface Slot {
  startsAt: string;
  endsAt: string;
}

export default function BookingPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const isLoggedIn = !!accessToken;
  const [step, setStep] = useState<Step>("treatment");
  const [selectedTreatments, setSelectedTreatments] = useState<Treatment[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Guest details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Treatments
  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments", "active"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: Treatment[] };
    },
  });

  // Public settings (deposit %)
  const { data: depositSetting } = useQuery({
    queryKey: ["setting-deposit"],
    queryFn: async () => {
      const res = await api.get("/settings/booking_deposit_percent");
      return res.data as { value: number };
    },
  });
  const depositPercent = Number(depositSetting?.value ?? 0);

  // Practitioners
  const { data: practitionersData } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const res = await api.get("/practitioners");
      return res.data as { practitioners: Practitioner[] };
    },
    enabled: step === "practitioner" || step === "datetime" || step === "confirm",
  });

  // Use first selected treatment for availability query
  const firstTreatment = selectedTreatments[0] ?? null;

  // Availability
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["availability", selectedPractitioner?.id, selectedDate, firstTreatment?.id],
    queryFn: async () => {
      const res = await api.get(
        `/appointments/availability?practitionerId=${selectedPractitioner!.id}&date=${selectedDate}&treatmentId=${firstTreatment!.id}`
      );
      return res.data as { slots: Slot[] };
    },
    enabled: !!selectedPractitioner && !!firstTreatment && step === "datetime",
  });

  // Lock slot
  const lockMutation = useMutation({
    mutationFn: async (slot: Slot) => {
      await api.post("/appointments/lock-slot", {
        practitionerId: selectedPractitioner!.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      });
    },
  });

  // Create appointments for all selected treatments
  const bookMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        selectedTreatments.map((treatment) =>
          api.post("/appointments", {
            guestName,
            guestEmail,
            guestPhone,
            practitionerId: selectedPractitioner!.id,
            treatmentId: treatment.id,
            startsAt: selectedSlot!.startsAt,
          })
        )
      );
      return results.map((r) => r.data);
    },
    onSuccess: () => {
      setStep("treatment");
      router.push("/?booked=1");
    },
  });

  const treatments = treatmentsData?.treatments ?? [];
  const practitioners = practitionersData?.practitioners ?? [];
  const slots = slotsData?.slots ?? [];

  // Group by category
  const categories = useMemo(() => {
    const cats = [...new Set(treatments.map((t) => t.category ?? "Other"))];
    return cats.sort();
  }, [treatments]);

  // Treatments in the selected category
  const categoryTreatments = useMemo(() => {
    if (!selectedCategory) return [];
    return treatments.filter((t) => (t.category ?? "Other") === selectedCategory);
  }, [treatments, selectedCategory]);

  const toggleTreatment = (t: Treatment) => {
    setSelectedTreatments((prev) => {
      const exists = prev.find((s) => s.id === t.id);
      if (exists) return prev.filter((s) => s.id !== t.id);
      return [...prev, t];
    });
  };

  const isSelected = (id: string) => selectedTreatments.some((t) => t.id === id);

  const totalPrice = selectedTreatments.reduce((sum, t) => sum + t.priceCents, 0);
  const totalDuration = selectedTreatments.reduce((sum, t) => sum + t.durationMinutes, 0);

  const steps: { key: Step; label: string }[] = [
    { key: "treatment", label: "Treatment" },
    { key: "practitioner", label: "Practitioner" },
    { key: "datetime", label: "Date & Time" },
    { key: "confirm", label: "Confirm" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE d MMM") };
  });

  const canConfirm = guestName.trim() && guestEmail.trim() && guestPhone.trim();

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[var(--primary)]">
            Dr Skin Central
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">Book an Appointment</h1>
            {isLoggedIn ? (
              <Link
                href="/my-dashboard"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                My Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                    i < currentStepIndex && "bg-green-500 text-white",
                    i === currentStepIndex && "bg-[var(--primary)] text-white",
                    i > currentStepIndex && "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={clsx(
                    "text-sm hidden sm:inline",
                    i === currentStepIndex ? "font-medium" : "text-[var(--muted-foreground)]"
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className="w-8 h-px bg-[var(--border)]" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Step 1: Treatments */}
        {step === "treatment" && !selectedCategory && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose a category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const catTreatments = treatments.filter(
                  (t) => (t.category ?? "Other") === cat
                );
                const prices = catTreatments.map((t) => t.priceCents);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const selectedInCat = catTreatments.filter((t) =>
                  isSelected(t.id)
                ).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="rounded-xl bg-white border border-[var(--border)] p-4 text-left hover:border-[var(--primary)] hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-semibold">{cat}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {catTreatments.length} treatment{catTreatments.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      &pound;{formatPrice(minPrice)}
                      {minPrice !== maxPrice && <>&ndash;&pound;{formatPrice(maxPrice)}</>}
                    </p>
                    {selectedInCat > 0 && (
                      <span className="inline-block mt-2 rounded-full bg-[var(--primary)] text-white text-xs px-2 py-0.5">
                        {selectedInCat} selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedTreatments.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setStep("practitioner")}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 1b: Treatments in selected category */}
        {step === "treatment" && selectedCategory && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> All categories
            </button>
            <h2 className="text-lg font-semibold">{selectedCategory}</h2>

            <div className="rounded-lg bg-white border border-[var(--border)] overflow-hidden">
              {categoryTreatments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTreatment(t)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-[var(--border)] last:border-b-0",
                    isSelected(t.id)
                      ? "bg-[var(--accent)]"
                      : "hover:bg-[var(--muted)]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected(t.id)
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)]"
                      )}
                    >
                      {isSelected(t.id) && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t.durationMinutes} min
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold shrink-0 ml-2">
                    &pound;{formatPrice(t.priceCents)}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setSelectedCategory(null)}
              >
                Done <Check className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Practitioner */}
        {step === "practitioner" && (
          <div className="space-y-4">
            {practitioners.map((p) => (
              <Card
                key={p.id}
                className={clsx(
                  "cursor-pointer transition-all !p-4",
                  selectedPractitioner?.id === p.id && "ring-2 ring-[var(--primary)]"
                )}
              >
                <div onClick={() => setSelectedPractitioner(p)} className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold">
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    {p.bio && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">{p.bio}</p>
                    )}
                    {p.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.specialties.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs text-[var(--primary)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep("treatment")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button disabled={!selectedPractitioner} onClick={() => setStep("datetime")}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === "datetime" && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => {
                    setSelectedDate(d.value);
                    setSelectedSlot(null);
                  }}
                  className={clsx(
                    "flex-shrink-0 rounded-lg border px-4 py-2 text-sm transition-colors",
                    selectedDate === d.value
                      ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--primary)] font-medium"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <Card>
              <h3 className="font-medium mb-3">Available Times</h3>
              {slotsLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No available slots on this date
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      onClick={() => setSelectedSlot(slot)}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        selectedSlot?.startsAt === slot.startsAt
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      )}
                    >
                      {format(new Date(slot.startsAt), "HH:mm")}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep("practitioner")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                disabled={!selectedSlot}
                onClick={() => {
                  if (selectedSlot) {
                    lockMutation.mutate(selectedSlot);
                    setStep("confirm");
                  }
                }}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && selectedPractitioner && selectedSlot && (
          <div className="space-y-4">
            {/* Your Details */}
            <Card>
              <h3 className="font-semibold mb-4">Your Details</h3>
              <div className="space-y-3">
                <Input
                  id="name"
                  label="Full Name"
                  placeholder="Jane Smith"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="jane@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                <Input
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="07700 900000"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
            </Card>

            {/* Booking Summary */}
            <Card>
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                {selectedTreatments.map((t) => (
                  <div key={t.id} className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t.name}</span>
                    <span className="font-medium">
                      &pound;{(t.priceCents / 100).toFixed(0)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Practitioner</span>
                  <span className="font-medium">
                    {selectedPractitioner.firstName} {selectedPractitioner.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Date</span>
                  <span className="font-medium">
                    {format(new Date(selectedSlot.startsAt), "EEEE, d MMMM yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Time</span>
                  <span className="font-medium">
                    {format(new Date(selectedSlot.startsAt), "HH:mm")} -{" "}
                    {format(new Date(selectedSlot.endsAt), "HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total Duration</span>
                  <span className="font-medium">{totalDuration} minutes</span>
                </div>
                <hr className="border-[var(--border)]" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">
                    &pound;{(totalPrice / 100).toFixed(2)}
                  </span>
                </div>
                {depositPercent > 0 && (
                  <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                    <span>Deposit required ({depositPercent}%)</span>
                    <span className="font-medium text-[var(--foreground)]">
                      &pound;{(totalPrice * depositPercent / 10000).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep("datetime")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                disabled={!canConfirm || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
                size="lg"
              >
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>

            {bookMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {(bookMutation.error as { response?: { data?: { error?: string } } })?.response
                  ?.data?.error ?? "Booking failed. Please try again."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {step === "treatment" && selectedTreatments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] shadow-lg z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="text-sm font-medium">
                    {selectedTreatments.length} treatment{selectedTreatments.length !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    &pound;{(totalPrice / 100).toFixed(0)} &middot; {totalDuration} min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTreatments([])}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Clear
                </button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedCategory) {
                      setSelectedCategory(null);
                    } else {
                      setStep("practitioner");
                    }
                  }}
                >
                  {selectedCategory ? "Done" : "Continue"}{" "}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
