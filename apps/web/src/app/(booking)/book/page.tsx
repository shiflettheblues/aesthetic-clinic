"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { ArrowLeft, ArrowRight, Check, Clock, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import clsx from "clsx";

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
  const { user, accessToken } = useAuthStore();
  const [step, setStep] = useState<Step>("treatment");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Treatments
  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments", "active"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: Treatment[] };
    },
  });

  // Practitioners
  const { data: practitionersData } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const res = await api.get("/practitioners");
      return res.data as { practitioners: Practitioner[] };
    },
    enabled: step === "practitioner" || step === "datetime" || step === "confirm",
  });

  // Availability
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["availability", selectedPractitioner?.id, selectedDate, selectedTreatment?.id],
    queryFn: async () => {
      const res = await api.get(
        `/appointments/availability?practitionerId=${selectedPractitioner!.id}&date=${selectedDate}&treatmentId=${selectedTreatment!.id}`
      );
      return res.data as { slots: Slot[] };
    },
    enabled: !!selectedPractitioner && !!selectedTreatment && step === "datetime",
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

  // Create appointment
  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/appointments", {
        clientId: user!.id,
        practitionerId: selectedPractitioner!.id,
        treatmentId: selectedTreatment!.id,
        startsAt: selectedSlot!.startsAt,
      });
      return res.data;
    },
    onSuccess: () => {
      router.push("/my-dashboard?booked=1");
    },
  });

  const treatments = treatmentsData?.treatments ?? [];
  const practitioners = practitionersData?.practitioners ?? [];
  const slots = slotsData?.slots ?? [];

  // Group treatments by category
  const categories = [...new Set(treatments.map((t) => t.category ?? "Other"))];

  const steps: { key: Step; label: string }[] = [
    { key: "treatment", label: "Treatment" },
    { key: "practitioner", label: "Practitioner" },
    { key: "datetime", label: "Date & Time" },
    { key: "confirm", label: "Confirm" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Generate date options (next 14 days)
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE d MMM") };
  });

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Book an Appointment</h1>
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
        {/* Step 1: Treatment */}
        {step === "treatment" && (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                  {cat}
                </h2>
                <div className="space-y-2">
                  {treatments
                    .filter((t) => (t.category ?? "Other") === cat)
                    .map((t) => (
                      <Card
                        key={t.id}
                        className={clsx(
                          "cursor-pointer transition-all !p-4",
                          selectedTreatment?.id === t.id && "ring-2 ring-[var(--primary)]"
                        )}
                      >
                        <div
                          onClick={() => setSelectedTreatment(t)}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{t.name}</p>
                            {t.description && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-sm text-[var(--muted-foreground)]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {t.durationMinutes} min
                              </span>
                            </div>
                          </div>
                          <p className="text-lg font-bold">&pound;{(t.priceCents / 100).toFixed(0)}</p>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button disabled={!selectedTreatment} onClick={() => setStep("practitioner")}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
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
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium">{p.firstName} {p.lastName}</p>
                    {p.bio && <p className="text-sm text-[var(--muted-foreground)] mt-1">{p.bio}</p>}
                    {p.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.specialties.map((s) => (
                          <span key={s} className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs text-[var(--primary)]">
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
            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
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

            {/* Time slots */}
            <Card>
              <h3 className="font-medium mb-3">Available Times</h3>
              {slotsLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No available slots on this date</p>
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
                onClick={async () => {
                  if (selectedSlot) {
                    await lockMutation.mutateAsync(selectedSlot);
                    setStep("confirm");
                  }
                }}
              >
                {lockMutation.isPending ? "Reserving..." : <>Next <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && selectedTreatment && selectedPractitioner && selectedSlot && (
          <div className="space-y-4">
            {!accessToken && (
              <Card className="border-yellow-200 bg-yellow-50">
                <p className="text-sm">
                  Please{" "}
                  <a href="/login" className="text-[var(--primary)] underline">sign in</a>{" "}
                  or{" "}
                  <a href="/register" className="text-[var(--primary)] underline">create an account</a>{" "}
                  to complete your booking.
                </p>
              </Card>
            )}

            <Card>
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Treatment</span>
                  <span className="font-medium">{selectedTreatment.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Practitioner</span>
                  <span className="font-medium">{selectedPractitioner.firstName} {selectedPractitioner.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Date</span>
                  <span className="font-medium">{format(new Date(selectedSlot.startsAt), "EEEE, d MMMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Time</span>
                  <span className="font-medium">
                    {format(new Date(selectedSlot.startsAt), "HH:mm")} - {format(new Date(selectedSlot.endsAt), "HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Duration</span>
                  <span className="font-medium">{selectedTreatment.durationMinutes} minutes</span>
                </div>
                <hr className="border-[var(--border)]" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">&pound;{(selectedTreatment.priceCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep("datetime")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                disabled={!accessToken || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
                size="lg"
              >
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>

            {bookMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {(bookMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Booking failed"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
