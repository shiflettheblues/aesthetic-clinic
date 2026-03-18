"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, parseISO, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes?: string;
  client: { id: string; firstName: string; lastName: string };
  practitioner: { id: string; firstName: string; lastName: string };
  treatment: { id: string; name: string; durationMinutes: number; priceCents: number };
}

interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00
const HOUR_HEIGHT = 50; // px per hour

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [createModal, setCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ practitionerId: string; time: Date } | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const from = view === "day"
    ? format(currentDate, "yyyy-MM-dd") + "T00:00:00Z"
    : format(weekStart, "yyyy-MM-dd") + "T00:00:00Z";
  const to = view === "day"
    ? format(currentDate, "yyyy-MM-dd") + "T23:59:59Z"
    : format(addDays(weekStart, 6), "yyyy-MM-dd") + "T23:59:59Z";

  const { data: practitionersData } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const res = await api.get("/practitioners");
      return res.data as { practitioners: Practitioner[] };
    },
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments", from, to],
    queryFn: async () => {
      const res = await api.get(`/appointments?from=${from}&to=${to}`);
      return res.data as { appointments: Appointment[] };
    },
  });

  const { data: blockedData } = useQuery({
    queryKey: ["blocked-slots", from, to],
    queryFn: async () => {
      const res = await api.get(`/blocked-slots?from=${from}&to=${to}`);
      return res.data as { blockedSlots: { id: string; practitionerId: string; startsAt: string; endsAt: string; reason?: string }[] };
    },
  });

  const practitioners = practitionersData?.practitioners ?? [];
  const appointments = appointmentsData?.appointments ?? [];
  const blockedSlots = blockedData?.blockedSlots ?? [];

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, view === "day" ? dir : dir * 7));
  };

  const getAppointmentStyle = (apt: Appointment) => {
    const start = parseISO(apt.startsAt);
    const end = parseISO(apt.endsAt);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 8) * HOUR_HEIGHT;
    const height = (endHour - startHour) * HOUR_HEIGHT;
    return { top: `${top}px`, height: `${Math.max(height, 20)}px` };
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 border-yellow-300 text-yellow-800",
    CONFIRMED: "bg-blue-100 border-blue-300 text-blue-800",
    COMPLETED: "bg-green-100 border-green-300 text-green-800",
    CANCELLED: "bg-red-100 border-red-300 text-red-800",
    NO_SHOW: "bg-gray-100 border-gray-300 text-gray-800",
  };

  // Day view: columns per practitioner
  const renderDayView = () => (
    <div className="flex flex-1 overflow-auto">
      {/* Time gutter */}
      <div className="w-16 flex-shrink-0 border-r border-[var(--border)]">
        {HOURS.map((h) => (
          <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
            <span className="absolute -top-2.5 right-2 text-xs text-[var(--muted-foreground)]">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Practitioner columns */}
      {practitioners.map((prac) => {
        const pracAppointments = appointments.filter(
          (a) => a.practitioner.id === prac.id && isSameDay(parseISO(a.startsAt), currentDate)
        );
        const pracBlocked = blockedSlots.filter(
          (b) => b.practitionerId === prac.id && isSameDay(parseISO(b.startsAt), currentDate)
        );

        return (
          <div key={prac.id} className="flex-1 min-w-[200px] border-r border-[var(--border)] last:border-r-0">
            {/* Practitioner header */}
            <div className="sticky top-0 z-10 bg-white border-b border-[var(--border)] px-2 py-2 text-center">
              <p className="text-sm font-medium">{prac.firstName} {prac.lastName}</p>
            </div>

            {/* Time grid */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--accent)]/30"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  onClick={() => {
                    const time = new Date(currentDate);
                    time.setHours(h, 0, 0, 0);
                    setSelectedSlot({ practitionerId: prac.id, time });
                    setCreateModal(true);
                  }}
                />
              ))}

              {/* Blocked slots */}
              {pracBlocked.map((b) => {
                const start = parseISO(b.startsAt);
                const end = parseISO(b.endsAt);
                const startHour = start.getHours() + start.getMinutes() / 60;
                const endHour = end.getHours() + end.getMinutes() / 60;
                const top = (startHour - 8) * HOUR_HEIGHT;
                const height = (endHour - startHour) * HOUR_HEIGHT;
                return (
                  <div
                    key={b.id}
                    className="absolute left-1 right-1 bg-gray-200/70 rounded border border-gray-300 flex items-center justify-center"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <span className="text-xs text-gray-500">{b.reason || "Blocked"}</span>
                  </div>
                );
              })}

              {/* Appointments */}
              {pracAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={clsx(
                    "absolute left-1 right-1 rounded border px-2 py-1 overflow-hidden cursor-pointer",
                    statusColors[apt.status]
                  )}
                  style={getAppointmentStyle(apt)}
                  onClick={() => { setEditingAppointment(apt); setEditModal(true); }}
                >
                  <p className="text-xs font-medium truncate">
                    {apt.client.firstName} {apt.client.lastName}
                  </p>
                  <p className="text-xs truncate">{apt.treatment.name}</p>
                  <p className="text-xs">
                    {format(parseISO(apt.startsAt), "HH:mm")} - {format(parseISO(apt.endsAt), "HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Week view: single timeline per day
  const renderWeekView = () => (
    <div className="flex flex-1 overflow-auto">
      <div className="w-16 flex-shrink-0 border-r border-[var(--border)]">
        {HOURS.map((h) => (
          <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
            <span className="absolute -top-2.5 right-2 text-xs text-[var(--muted-foreground)]">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {weekDays.map((day) => {
        const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.startsAt), day));
        return (
          <div key={day.toISOString()} className="flex-1 min-w-[120px] border-r border-[var(--border)] last:border-r-0">
            <div className="sticky top-0 z-10 bg-white border-b border-[var(--border)] px-2 py-2 text-center">
              <p className="text-xs text-[var(--muted-foreground)]">{format(day, "EEE")}</p>
              <p className={clsx("text-sm font-medium", isSameDay(day, new Date()) && "text-[var(--primary)]")}>
                {format(day, "d")}
              </p>
            </div>
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="border-b border-[var(--border)]" style={{ height: `${HOUR_HEIGHT}px` }} />
              ))}
              {dayAppts.map((apt) => (
                <div
                  key={apt.id}
                  className={clsx("absolute left-1 right-1 rounded border px-1 py-0.5 overflow-hidden text-xs cursor-pointer", statusColors[apt.status])}
                  style={getAppointmentStyle(apt)}
                  onClick={() => { setEditingAppointment(apt); setEditModal(true); }}
                >
                  <p className="font-medium truncate">{apt.client.firstName}</p>
                  <p className="truncate">{format(parseISO(apt.startsAt), "HH:mm")}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Header title="Calendar" />
      <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 font-medium">
              {view === "day"
                ? format(currentDate, "EEEE, d MMMM yyyy")
                : `${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                className={clsx("px-3 py-1.5 text-sm", view === "day" ? "bg-[var(--primary)] text-white" : "bg-white")}
                onClick={() => setView("day")}
              >
                Day
              </button>
              <button
                className={clsx("px-3 py-1.5 text-sm", view === "week" ? "bg-[var(--primary)] text-white" : "bg-white")}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>
            <Button size="sm" onClick={() => setCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Appointment
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        {view === "day" ? renderDayView() : renderWeekView()}
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        open={createModal}
        onClose={() => { setCreateModal(false); setSelectedSlot(null); }}
        practitioners={practitioners}
        selectedSlot={selectedSlot}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          setCreateModal(false);
          setSelectedSlot(null);
        }}
      />

      <EditAppointmentModal
        open={editModal}
        onClose={() => { setEditModal(false); setEditingAppointment(null); }}
        appointment={editingAppointment}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          setEditModal(false);
          setEditingAppointment(null);
        }}
      />
    </>
  );
}

function CreateAppointmentModal({
  open,
  onClose,
  practitioners,
  selectedSlot,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  practitioners: Practitioner[];
  selectedSlot: { practitionerId: string; time: Date } | null;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clientSearch: "",
    clientId: "",
    clientName: "",
    practitionerId: selectedSlot?.practitionerId ?? "",
    treatmentId: "",
    date: selectedSlot ? format(selectedSlot.time, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    time: selectedSlot ? format(selectedSlot.time, "HH:mm") : "09:00",
    notes: "",
  });


  const { data: clientsData } = useQuery({
    queryKey: ["patients", form.clientSearch],
    queryFn: async () => {
      if (!form.clientSearch || form.clientSearch.length < 2) return { patients: [] };
      const res = await api.get(`/patients?search=${encodeURIComponent(form.clientSearch)}&limit=5`);
      return res.data as { patients: { id: string; firstName: string; lastName: string; email: string }[] };
    },
    enabled: form.clientSearch.length >= 2,
  });

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: { id: string; name: string; durationMinutes: number; priceCents: number }[] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startsAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      const res = await api.post("/appointments", {
        clientId: form.clientId,
        practitionerId: form.practitionerId,
        treatmentId: form.treatmentId,
        startsAt,
        notes: form.notes || undefined,
      });
      return res.data;
    },
    onSuccess: () => onCreated(),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to create appointment");
    },
  });

  const clients = clientsData?.patients ?? [];
  const treatments = treatmentsData?.treatments ?? [];

  return (
    <Modal open={open} onClose={onClose} title="New Appointment" className="max-w-md">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        {/* Client search */}
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          {form.clientId ? (
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="text-sm">{form.clientName}</span>
              <button
                className="text-xs text-[var(--primary)]"
                onClick={() => setForm((f) => ({ ...f, clientId: "", clientName: "", clientSearch: "" }))}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by name or email..."
                value={form.clientSearch}
                onChange={(e) => setForm((f) => ({ ...f, clientSearch: e.target.value }))}
              />
              {clients.length > 0 && (
                <div className="absolute z-20 w-full mt-1 rounded-lg border border-[var(--border)] bg-white shadow-lg">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          clientId: c.id,
                          clientName: `${c.firstName} ${c.lastName}`,
                          clientSearch: "",
                        }))
                      }
                    >
                      {c.firstName} {c.lastName} <span className="text-[var(--muted-foreground)]">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Treatment */}
        <div>
          <label className="block text-sm font-medium mb-1">Treatment</label>
          <select
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={form.treatmentId}
            onChange={(e) => setForm((f) => ({ ...f, treatmentId: e.target.value }))}
          >
            <option value="">Select treatment...</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes}min - &pound;{(t.priceCents / 100).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        {/* Practitioner */}
        <div>
          <label className="block text-sm font-medium mb-1">Practitioner</label>
          <select
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={form.practitionerId}
            onChange={(e) => setForm((f) => ({ ...f, practitionerId: e.target.value }))}
          >
            <option value="">Select practitioner...</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.clientId || !form.treatmentId || !form.practitionerId || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Appointment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditAppointmentModal({
  open,
  onClose,
  appointment,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(appointment?.status ?? "CONFIRMED");
  const [date, setDate] = useState(appointment ? format(parseISO(appointment.startsAt), "yyyy-MM-dd") : "");
  const [time, setTime] = useState(appointment ? format(parseISO(appointment.startsAt), "HH:mm") : "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [error, setError] = useState("");

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment) {
      setStatus(appointment.status);
      setDate(format(parseISO(appointment.startsAt), "yyyy-MM-dd"));
      setTime(format(parseISO(appointment.startsAt), "HH:mm"));
      setNotes(appointment.notes ?? "");
      setError("");
    }
  }, [appointment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {};
      if (status !== appointment?.status) data.status = status;
      const newStartsAt = new Date(`${date}T${time}:00`).toISOString();
      if (newStartsAt !== appointment?.startsAt) data.startsAt = newStartsAt;
      if (notes !== (appointment?.notes ?? "")) data.notes = notes;
      if (Object.keys(data).length === 0) return;
      const res = await api.patch(`/appointments/${appointment?.id}`, data);
      return res.data;
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to update appointment");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/appointments/${appointment?.id}`, { status: "CANCELLED" });
      return res.data;
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to cancel appointment");
    },
  });

  if (!appointment) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Appointment" className="max-w-md">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--muted)] p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{appointment.client.firstName} {appointment.client.lastName}</p>
            <Link
              href={`/patients/${appointment.client.id}`}
              className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
            >
              View Profile <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{appointment.treatment.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">with {appointment.practitioner.firstName} {appointment.practitioner.lastName}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
            rows={2}
            placeholder="Clinical notes, reminders..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => cancelMutation.mutate()}
            disabled={appointment.status === "CANCELLED" || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Appointment"}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
