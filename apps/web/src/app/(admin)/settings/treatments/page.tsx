"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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

  const treatments = data?.treatments ?? [];

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Treatment[]>();
    for (const t of treatments) {
      const cat = t.category ?? "Uncategorised";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [treatments]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Treatments</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Treatment</Button>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">No treatments yet. Add your first treatment above.</p>
      )}

      {grouped.map(([category, items]) => {
        const collapsed = collapsedCategories.has(category);
        return (
          <div key={category} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {collapsed ? <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" /> : <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />}
                <span className="font-semibold">{category}</span>
                <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
            </button>

            {/* Treatments in category */}
            {!collapsed && (
              <div className="divide-y divide-[var(--border)]">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        {!t.isActive && <Badge variant="warning">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {t.durationMinutes} min &mdash; &pound;{(t.priceCents / 100).toFixed(2)}
                      </p>
                      {t.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-xs">{t.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this treatment?")) deleteMutation.mutate(t.id); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Treatment" : "Add Treatment"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" value={String(form.durationMinutes)} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <Input label="Price (£)" type="number" step="0.01" value={String(form.priceCents)} onChange={(e) => setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))} />
          </div>
          <Input label="Category (e.g. Botox, Filler, Laser)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-sm">Active</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
