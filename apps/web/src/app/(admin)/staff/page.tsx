"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { Target, TrendingUp, Users, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  specialties: string[];
  stats: {
    todayAppointments: { id: string; startsAt: string; client: { firstName: string; lastName: string }; treatment: { name: string } }[];
    monthRevenueCents: number;
    completedThisMonth: number;
    retentionRate: number;
    rebookedRate: number;
    targets: { id: string; type: string; period: string; goal: number; achieved: number; percent: number; amountCents: number | null; appointmentCount: number | null }[];
  };
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [targetModal, setTargetModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: async () => {
      const res = await api.get("/staff/dashboard");
      return res.data as { staff: StaffMember[] };
    },
  });

  const { data: practitionersData } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const res = await api.get("/practitioners");
      return res.data as { practitioners: { id: string; firstName: string; lastName: string }[] };
    },
  });

  const staff = data?.staff ?? [];

  return (
    <>
      <Header title="Staff" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Staff Performance</h2>
          <Button size="sm" onClick={() => setTargetModal(true)}>
            <Target className="h-4 w-4 mr-1" /> Set Target
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No practitioners found</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {staff.map((member) => (
              <Card key={member.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{member.firstName} {member.lastName}</p>
                      {member.specialties.length > 0 && (
                        <p className="text-xs text-[var(--muted-foreground)]">{member.specialties.slice(0, 2).join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <Link href={`/staff/${member.id}`} className="text-xs text-[var(--primary)] hover:underline">View Details</Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatBox icon={CalendarCheck} label="Today" value={String(member.stats.todayAppointments.length)} color="blue" />
                  <StatBox icon={TrendingUp} label="Month Revenue" value={`£${(member.stats.monthRevenueCents / 100).toFixed(0)}`} color="green" />
                  <StatBox icon={Users} label="Retention" value={`${member.stats.retentionRate}%`} color="purple" />
                  <StatBox icon={CalendarCheck} label="Rebooked" value={`${member.stats.rebookedRate}%`} color="orange" />
                </div>

                {member.stats.targets.length > 0 && (
                  <div className="space-y-2">
                    {member.stats.targets.map((t) => (
                      <div key={t.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--muted-foreground)]">
                            {t.type === "REVENUE" ? "Revenue target" : "Appointments target"} ({t.period.toLowerCase()})
                          </span>
                          <span className="font-medium">
                            {t.type === "REVENUE"
                              ? `£${(t.achieved / 100).toFixed(0)} / £${(t.goal / 100).toFixed(0)}`
                              : `${t.achieved} / ${t.goal}`}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full transition-all", t.percent >= 100 ? "bg-green-500" : "bg-[var(--primary)]")}
                            style={{ width: `${t.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {member.stats.todayAppointments.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">Today&apos;s appointments</p>
                    {member.stats.todayAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between text-xs py-1 border-t border-[var(--border)]">
                        <span>{apt.client.firstName} {apt.client.lastName}</span>
                        <span className="text-[var(--muted-foreground)]">{format(new Date(apt.startsAt), "HH:mm")} — {apt.treatment.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <SetTargetModal
        open={targetModal}
        onClose={() => setTargetModal(false)}
        practitioners={practitionersData?.practitioners ?? []}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
          setTargetModal(false);
        }}
      />
    </>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return (
    <div className="flex flex-col items-center rounded-lg bg-[var(--muted)] p-2 text-center">
      <div className={clsx("mb-1 flex h-7 w-7 items-center justify-center rounded-md", colorMap[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

function SetTargetModal({ open, onClose, practitioners, onSaved }: {
  open: boolean; onClose: () => void;
  practitioners: { id: string; firstName: string; lastName: string }[];
  onSaved: () => void;
}) {
  const [practitionerId, setPractitionerId] = useState("");
  const [type, setType] = useState<"REVENUE" | "APPOINTMENTS">("REVENUE");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/staff/targets", {
        practitionerId,
        type,
        amountCents: type === "REVENUE" ? Math.round(Number(amount) * 100) : undefined,
        appointmentCount: type === "APPOINTMENTS" ? Number(amount) : undefined,
        period,
      });
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Set Staff Target">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Practitioner</label>
          <select className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)}>
            <option value="">Select...</option>
            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target Type</label>
          <select className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as "REVENUE" | "APPOINTMENTS")}>
            <option value="REVENUE">Revenue (£)</option>
            <option value="APPOINTMENTS">Appointments</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{type === "REVENUE" ? "Target Amount (£)" : "Target Count"}</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            placeholder={type === "REVENUE" ? "e.g. 5000" : "e.g. 40"} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Period</label>
          <select className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value as "WEEKLY" | "MONTHLY")}>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!practitionerId || !amount || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Set Target"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
