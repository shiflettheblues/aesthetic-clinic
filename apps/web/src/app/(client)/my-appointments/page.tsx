"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  treatment?: { id: string; name: string; priceCents: number; durationMinutes: number };
  practitioner: { id: string; firstName: string; lastName: string };
}

export default function MyAppointmentsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data as { appointments: Appointment[] };
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/appointments/${id}`, { status: "CANCELLED" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-appointments"] }),
  });

  const appointments = data?.appointments ?? [];
  const upcoming = appointments.filter((a) => new Date(a.startsAt) > new Date() && a.status !== "CANCELLED");
  const past = appointments.filter((a) => new Date(a.startsAt) <= new Date() || a.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <Link href="/book"><Button>Book New</Button></Link>
      </div>

      {/* Upcoming */}
      <Card>
        <CardTitle>Upcoming</CardTitle>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No upcoming appointments</p>
          ) : (
            upcoming.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                <div>
                  <p className="font-medium">{apt.treatment?.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {apt.practitioner.firstName} {apt.practitioner.lastName}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {format(new Date(apt.startsAt), "EEEE d MMMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                  {(apt.status === "PENDING" || apt.status === "CONFIRMED") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel this appointment?")) {
                          cancelMutation.mutate(apt.id);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card>
          <CardTitle>Past Appointments</CardTitle>
          <div className="mt-4 space-y-3">
            {past.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4 opacity-70">
                <div>
                  <p className="font-medium">{apt.treatment?.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {format(new Date(apt.startsAt), "d MMM yyyy, HH:mm")} &mdash; {apt.practitioner.firstName} {apt.practitioner.lastName}
                  </p>
                </div>
                <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
