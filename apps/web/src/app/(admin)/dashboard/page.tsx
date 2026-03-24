"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  Users,
  DollarSign,
  UserPlus,
  TrendingUp,
  RefreshCw,
  Bell,
  PoundSterling,
} from "lucide-react";
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

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { id: string; firstName: string; lastName: string; email: string };
  practitioner: { id: string; firstName: string; lastName: string };
  treatment?: { id: string; name: string; durationMinutes: number; priceCents: number };
}

interface DashboardStats {
  todayAppointments: Appointment[];
  todayRevenueCents: number;
  totalPatients: number;
  newClientsThisMonth: number;
  monthRevenueCents: number;
  completedThisMonth: number;
  retentionRate: number;
  rebookedRate: number;
  unreadNotifications: number;
  upcomingAppointments: Appointment[];
}

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data as DashboardStats;
    },
    refetchInterval: 60000,
  });

  const appointments = stats?.todayAppointments ?? [];

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/calendar" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">Today&apos;s Appointments</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/reports" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">Today&apos;s Revenue</p>
                  <p className="text-2xl font-bold">&pound;{((stats?.todayRevenueCents ?? 0) / 100).toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/patients" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Total Patients</p>
                  <p className="text-2xl font-bold">{stats?.totalPatients ?? 0}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/patients" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                  <UserPlus className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">New This Month</p>
                  <p className="text-2xl font-bold">{stats?.newClientsThisMonth ?? 0}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/reports" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">Retained Clients</p>
                  <p className="text-2xl font-bold">{stats?.retentionRate ?? 0}%</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/reports" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
                  <RefreshCw className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Rebooked</p>
                  <p className="text-2xl font-bold">{stats?.rebookedRate ?? 0}%</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/notifications" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Notifications</p>
                  <p className="text-2xl font-bold">{stats?.unreadNotifications ?? 0}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/reports" className="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <PoundSterling className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">Monthly Revenue</p>
                  <p className="text-2xl font-bold">&pound;{((stats?.monthRevenueCents ?? 0) / 100).toFixed(2)}</p>
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
                <Link
                  key={apt.id}
                  href={`/patients/${apt.client.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--muted)] transition-colors"
                >
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
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming appointments */}
        {(stats?.upcomingAppointments?.length ?? 0) > 0 && (
          <Card>
            <CardTitle>Upcoming Appointments</CardTitle>
            <div className="mt-4 space-y-3">
              {stats!.upcomingAppointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/patients/${apt.client.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--muted)] transition-colors"
                >
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
                      {format(new Date(apt.startsAt), "EEE d MMM, HH:mm")}
                    </span>
                    <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
