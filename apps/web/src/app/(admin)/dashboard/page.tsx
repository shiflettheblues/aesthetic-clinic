"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { Calendar, Users, DollarSign, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEnd = format(new Date(), "yyyy-MM-dd") + "T23:59:59Z";

  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async () => {
      const res = await api.get(`/appointments?from=${today}T00:00:00Z&to=${todayEnd}`);
      return res.data as { appointments: Appointment[] };
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients", "recent"],
    queryFn: async () => {
      const res = await api.get("/patients?limit=5");
      return res.data as { total: number };
    },
  });

  const appointments = appointmentsData?.appointments ?? [];
  const todayRevenue = appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + (a.treatment?.priceCents ?? 0), 0);

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/calendar" className="cursor-pointer hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Today&apos;s Appointments</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/reports" className="cursor-pointer hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Today&apos;s Revenue</p>
                  <p className="text-2xl font-bold">&pound;{(todayRevenue / 100).toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/patients" className="cursor-pointer hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Total Patients</p>
                  <p className="text-2xl font-bold">{patientsData?.total ?? 0}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/reports" className="cursor-pointer hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Completed Today</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter((a) => a.status === "COMPLETED").length}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Today's appointments */}
        <Card>
          <CardTitle>Today&apos;s Appointments</CardTitle>
          <div className="mt-4 space-y-3">
            {appointments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No appointments today</p>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {apt.client.firstName} {apt.client.lastName}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {apt.treatment?.name} with {apt.practitioner.firstName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {format(new Date(apt.startsAt), "HH:mm")}
                    </span>
                    <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { id: string; firstName: string; lastName: string; email: string };
  practitioner: { id: string; firstName: string; lastName: string };
  treatment?: { id: string; name: string; durationMinutes: number; priceCents: number };
}
