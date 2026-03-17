"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingUp, Users, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import clsx from "clsx";

export default function MyDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["staff-my-dashboard"],
    queryFn: async () => {
      const res = await api.get("/staff/my-dashboard");
      return res.data as {
        practitioner: { firstName: string; lastName: string };
        stats: {
          todayAppointments: { id: string; startsAt: string; endsAt: string; client: { firstName: string; lastName: string }; treatment: { name: string } }[];
          monthRevenueCents: number;
          completedThisMonth: number;
          retentionRate: number;
          rebookedRate: number;
          targets: { id: string; type: string; goal: number; achieved: number; percent: number }[];
        };
      };
    },
  });

  if (isLoading) return <><Header title="My Dashboard" /><div className="p-6 text-[var(--muted-foreground)]">Loading...</div></>;
  if (!data) return null;

  const { practitioner, stats } = data;

  return (
    <>
      <Header title="My Dashboard" />
      <div className="p-6 space-y-6">
        <h2 className="text-lg font-semibold">Welcome, {practitioner.firstName}</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: CalendarCheck, label: "Today", value: String(stats.todayAppointments.length), color: "blue" },
            { icon: TrendingUp, label: "Month Revenue", value: `£${(stats.monthRevenueCents / 100).toFixed(0)}`, color: "green" },
            { icon: Users, label: "Retention", value: `${stats.retentionRate}%`, color: "purple" },
            { icon: CalendarCheck, label: "Rebooked", value: `${stats.rebookedRate}%`, color: "orange" },
          ].map(({ icon: Icon, label, value, color }) => {
            const colorMap: Record<string, string> = { blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", purple: "bg-purple-100 text-purple-600", orange: "bg-orange-100 text-orange-600" };
            return (
              <Card key={label}>
                <div className="flex items-center gap-3">
                  <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", colorMap[color])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {stats.targets.length > 0 && (
          <Card>
            <h3 className="font-semibold mb-3">Targets</h3>
            <div className="space-y-3">
              {stats.targets.map((t) => (
                <div key={t.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--muted-foreground)]">{t.type === "REVENUE" ? "Revenue" : "Appointments"}</span>
                    <span className="font-medium">
                      {t.type === "REVENUE" ? `£${(t.achieved / 100).toFixed(0)} / £${(t.goal / 100).toFixed(0)}` : `${t.achieved} / ${t.goal}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div className={clsx("h-full rounded-full transition-all", t.percent >= 100 ? "bg-green-500" : "bg-[var(--primary)]")} style={{ width: `${t.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold mb-3">Today&apos;s Appointments</h3>
          {stats.todayAppointments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No appointments today</p>
          ) : (
            <div className="space-y-2">
              {stats.todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                  <div>
                    <p className="text-sm font-medium">{apt.client.firstName} {apt.client.lastName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{apt.treatment.name}</p>
                  </div>
                  <span className="text-sm text-[var(--muted-foreground)]">{format(new Date(apt.startsAt), "HH:mm")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
