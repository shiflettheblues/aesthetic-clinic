"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default function ClientDashboardPage() {
  return (
    <Suspense>
      <ClientDashboardContent />
    </Suspense>
  );
}

function ClientDashboardContent() {
  const searchParams = useSearchParams();
  const justBooked = searchParams.get("booked") === "1";

  const { data: appointmentsData } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data as { appointments: Appointment[] };
    },
  });

  const { data: formsData } = useQuery({
    queryKey: ["my-pending-forms"],
    queryFn: async () => {
      const res = await api.get("/forms/submissions");
      return res.data as { submissions: FormSubmission[] };
    },
  });

  const appointments = appointmentsData?.appointments ?? [];
  const upcoming = appointments
    .filter((a) => new Date(a.startsAt) > new Date() && a.status !== "CANCELLED")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {justBooked && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700 font-medium">Booking confirmed! We&apos;ll see you soon.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <Link href="/book">
          <Button>Book Appointment</Button>
        </Link>
      </div>

      {/* Upcoming appointments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Upcoming Appointments</CardTitle>
          <Link href="/my-appointments" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]">
                    <Calendar className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{apt.treatment?.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {apt.practitioner.firstName} {apt.practitioner.lastName} &mdash;{" "}
                      {format(new Date(apt.startsAt), "EEE d MMM, HH:mm")}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending forms */}
      {(formsData?.submissions ?? []).length > 0 && (
        <Card>
          <CardTitle>Pending Forms</CardTitle>
          <div className="mt-4 space-y-3">
            {formsData!.submissions.map((sub) => (
              <Link key={sub.id} href={`/forms/${sub.template.id}`}>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--muted)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[var(--primary)]" />
                    <span className="text-sm font-medium">{sub.template.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface Appointment {
  id: string;
  startsAt: string;
  status: string;
  treatment?: { id: string; name: string };
  practitioner: { id: string; firstName: string; lastName: string };
}

interface FormSubmission {
  id: string;
  template: { id: string; name: string; formType: string };
}
