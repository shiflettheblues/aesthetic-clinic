"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface Practitioner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  specialties: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays: number[];
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const empty = {
  email: "", firstName: "", lastName: "", bio: "", specialties: "",
  workingHoursStart: "09:00", workingHoursEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5] as number[],
};

export default function PractitionersSettingsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Practitioner | null>(null);
  const [form, setForm] = useState(empty);

  const { data } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const res = await api.get("/practitioners");
      return res.data as { practitioners: Practitioner[] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editing) {
        const { email, ...rest } = payload;
        await api.patch(`/practitioners/${editing.id}`, rest);
      } else {
        await api.post("/practitioners", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      setModal(false);
      setEditing(null);
    },
  });

  const openEdit = (p: Practitioner) => {
    setEditing(p);
    setForm({
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      bio: p.bio ?? "",
      specialties: p.specialties.join(", "),
      workingHoursStart: p.workingHoursStart ?? "09:00",
      workingHoursEnd: p.workingHoursEnd ?? "18:00",
      workingDays: p.workingDays,
    });
    setModal(true);
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day].sort(),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Practitioners</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setModal(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Practitioner
        </Button>
      </div>

      <div className="space-y-2">
        {(data?.practitioners ?? []).map((p) => (
          <Card key={p.id} className="!p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.firstName} {p.lastName}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {p.workingHoursStart} - {p.workingHoursEnd} &mdash;{" "}
                  {p.workingDays.map((d) => dayNames[d]).join(", ")}
                </p>
                {p.specialties.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {p.specialties.map((s) => <Badge key={s}>{s}</Badge>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Practitioner" : "Add Practitioner"}>
        <div className="space-y-4">
          {!editing && <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />}
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="Bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          <Input label="Specialties (comma separated)" value={form.specialties} onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.workingHoursStart} onChange={(e) => setForm((f) => ({ ...f, workingHoursStart: e.target.value }))} />
            <Input label="End Time" type="time" value={form.workingHoursEnd} onChange={(e) => setForm((f) => ({ ...f, workingHoursEnd: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Working Days</label>
            <div className="flex gap-2">
              {dayNames.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.workingDays.includes(i)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)]"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
