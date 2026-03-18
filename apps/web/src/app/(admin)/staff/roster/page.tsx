"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import clsx from "clsx";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  workingDays: number[];
}

interface TimesheetEntry {
  practitioner: { id: string; firstName: string; lastName: string };
  appointments: {
    id: string;
    startsAt: string;
    status: string;
    treatment: { name: string; durationMinutes: number; priceCents: number } | null;
    client: { firstName: string; lastName: string } | null;
  }[];
  totalMinutes: number;
  totalRevenueCents: number;
}

type Tab = "roster" | "timesheet";

export default function RosterPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("roster");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editPractitioner, setEditPractitioner] = useState<Practitioner | null>(null);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: rosterData } = useQuery({
    queryKey: ["staff-roster"],
    queryFn: async () => {
      const res = await api.get("/staff/roster");
      return res.data as { practitioners: Practitioner[] };
    },
  });

  const { data: timesheetData, isLoading: timesheetLoading } = useQuery({
    queryKey: ["staff-timesheet", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await api.get(
        `/staff/timesheet?from=${format(weekStart, "yyyy-MM-dd")}&to=${format(weekEnd, "yyyy-MM-dd")}`
      );
      return res.data as { timesheet: TimesheetEntry[] };
    },
    enabled: tab === "timesheet",
  });

  const practitioners = rosterData?.practitioners ?? [];
  const timesheet = timesheetData?.timesheet ?? [];

  return (
    <>
      <Header title="Roster & Timesheet" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)]">
          {(["roster", "timesheet"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors",
                tab === t
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        {tab === "timesheet" && (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setWeekStart((d) => subWeeks(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Roster tab */}
        {tab === "roster" && (
          <div className="space-y-3">
            {practitioners.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No practitioners found</p>
            )}
            {practitioners.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{p.firstName} {p.lastName}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {p.workingHoursStart && p.workingHoursEnd
                          ? `${p.workingHoursStart} – ${p.workingHoursEnd}`
                          : "Hours not set"}
                      </p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {DAY_LABELS.map((day, i) => (
                          <span
                            key={day}
                            className={clsx(
                              "text-xs px-1.5 py-0.5 rounded",
                              p.workingDays.includes(i)
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                            )}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditPractitioner(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Timesheet tab */}
        {tab === "timesheet" && (
          <div className="space-y-3">
            {timesheetLoading && <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>}
            {!timesheetLoading && timesheet.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No appointments this week</p>
            )}
            {timesheet.map((entry) => (
              <Card key={entry.practitioner.id} className="!p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                      {entry.practitioner.firstName[0]}{entry.practitioner.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{entry.practitioner.firstName} {entry.practitioner.lastName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {entry.appointments.length} appointments · {Math.round(entry.totalMinutes / 60 * 10) / 10}h · £{(entry.totalRevenueCents / 100).toFixed(0)} revenue
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  {entry.appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between text-sm py-1 border-t border-[var(--border)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[var(--muted-foreground)] shrink-0 text-xs">
                          {format(new Date(appt.startsAt), "EEE d, HH:mm")}
                        </span>
                        <span className="truncate">
                          {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : "Guest"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-[var(--muted-foreground)]">{appt.treatment?.name}</span>
                        <span
                          className={clsx(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            appt.status === "COMPLETED" && "bg-green-100 text-green-700",
                            appt.status === "CONFIRMED" && "bg-blue-100 text-blue-700",
                            appt.status === "PENDING" && "bg-amber-100 text-amber-700",
                            appt.status === "NO_SHOW" && "bg-red-100 text-red-700",
                          )}
                        >
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editPractitioner && (
        <EditWorkingHoursModal
          practitioner={editPractitioner}
          onClose={() => setEditPractitioner(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["staff-roster"] });
            setEditPractitioner(null);
          }}
        />
      )}
    </>
  );
}

function EditWorkingHoursModal({
  practitioner,
  onClose,
  onSaved,
}: {
  practitioner: Practitioner;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(practitioner.workingHoursStart ?? "09:00");
  const [end, setEnd] = useState(practitioner.workingHoursEnd ?? "18:00");
  const [days, setDays] = useState<number[]>(practitioner.workingDays ?? [1, 2, 3, 4, 5]);

  const toggleDay = (d: number) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/staff/${practitioner.id}/working-hours`, {
        workingHoursStart: start,
        workingHoursEnd: end,
        workingDays: days,
      });
    },
    onSuccess: onSaved,
  });

  return (
    <Modal open onClose={onClose} title={`Working Hours — ${practitioner.firstName} ${practitioner.lastName}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="time"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="time"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Working Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => toggleDay(i)}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  days.includes(i)
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
