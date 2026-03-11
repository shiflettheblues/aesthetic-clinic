"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface Treatment {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  category?: string;
  isActive: boolean;
}

const empty = { name: "", description: "", durationMinutes: 30, priceCents: 0, category: "", isActive: true };

export default function TreatmentsSettingsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form, setForm] = useState(empty);

  const { data } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatments");
      return res.data as { treatments: Treatment[] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, priceCents: Math.round(form.priceCents * 100) };
      if (editing) {
        await api.patch(`/treatments/${editing.id}`, payload);
      } else {
        await api.post("/treatments", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      setModal(false);
      setEditing(null);
      setForm(empty);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/treatments/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treatments"] }),
  });

  const openEdit = (t: Treatment) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      durationMinutes: t.durationMinutes,
      priceCents: t.priceCents / 100,
      category: t.category ?? "",
      isActive: t.isActive,
    });
    setModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Treatments</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Treatment</Button>
      </div>

      <div className="space-y-2">
        {(data?.treatments ?? []).map((t) => (
          <Card key={t.id} className="!p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  {!t.isActive && <Badge variant="warning">Inactive</Badge>}
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t.durationMinutes} min &mdash; &pound;{(t.priceCents / 100).toFixed(2)}
                  {t.category && <> &mdash; {t.category}</>}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(t.id); }}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Treatment" : "Add Treatment"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" value={String(form.durationMinutes)} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <Input label="Price (&pound;)" type="number" step="0.01" value={String(form.priceCents)} onChange={(e) => setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))} />
          </div>
          <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-sm">Active</span>
          </label>
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
