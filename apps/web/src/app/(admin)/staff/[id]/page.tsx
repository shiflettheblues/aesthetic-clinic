"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, TrendingUp, Users, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

export default function StaffDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: async () => {
      const res = await api.get("/staff/dashboard");
      return res.data as {
        staff: {
          id: string; firstName: string; lastName: string; bio: string | null; specialties: string[];
          stats: {
            todayAppointments: { id: string; startsAt: string; client: { id: string; firstName: string; lastName: string }; treatment: { name: string } }[];
            monthRevenueCents: number; completedThisMonth: number; retentionRate: number; rebookedRate: number;
            targets: { id: string; type: string; goal: number; achieved: number; percent: number }[];
          };
        }[];
      };
    },
  });

  const member = data?.staff.find((s) => s.id === id);

  if (isLoading) return <><Header title="Staff" /><div className="p-4 sm:p-6 text-[var(--muted-foreground)]">Loading...</div></>;
  if (!member) return null;

  const { stats } = member;

  return (
    <>
      <Header title="Staff Details" />
      <div className="p-4 sm:p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg">
              {member.firstName[0]}{member.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{member.firstName} {member.lastName}</h2>
              {member.bio && <p className="text-sm text-[var(--muted-foreground)] mt-1">{member.bio}</p>}
              {member.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {member.specialties.map((s) => (
                    <span key={s} className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs text-[var(--primary)]">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

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
            <h3 className="font-semibold mb-3">Current Targets</h3>
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
                    <div className={clsx("h-full rounded-full", t.percent >= 100 ? "bg-green-500" : "bg-[var(--primary)]")} style={{ width: `${t.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold mb-3">Today&apos;s Schedule</h3>
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
