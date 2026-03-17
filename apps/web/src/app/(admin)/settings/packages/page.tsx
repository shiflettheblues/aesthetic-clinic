"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface PackageTemplate {
  id: string;
  name: string;
  description: string | null;
  treatmentIds: string[];
  sessions: number;
  validDays: number;
  priceCents: number;
  isActive: boolean;
}

interface Treatment {
  id: string;
  name: string;
}

export default function PackagesSettingsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PackageTemplate | null>(null);

  const { data } = useQuery({
    queryKey: ["package-templates"],
    queryFn: async () => {
      const res = await api.get("/package-templates");
      return res.data as { templates: PackageTemplate[] };
    },
  });

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: Treatment[] };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/package-templates/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["package-templates"] }),
  });

  const templates = data?.templates ?? [];
  const treatments = treatmentsData?.treatments ?? [];
  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Treatment Packages</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Bundle treatments into packages for patients to purchase.</p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create Package
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Treatments</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Sessions</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Price</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Valid</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-right py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">No packages yet</td></tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-medium">{t.name}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">
                      {t.treatmentIds.map((id) => treatmentMap[id] ?? id).join(", ")}
                    </td>
                    <td className="py-3 px-3 text-right">{t.sessions}</td>
                    <td className="py-3 px-3 text-right">&pound;{(t.priceCents / 100).toFixed(2)}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">{t.validDays} days</td>
                    <td className="py-3 px-3">
                      <Badge variant={t.isActive ? "success" : "default"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setModal(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this package?")) deleteMutation.mutate(t.id); }}>Delete</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PackageModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        template={editing}
        treatments={treatments}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["package-templates"] });
          setModal(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function PackageModal({ open, onClose, template, treatments, onSaved }: {
  open: boolean; onClose: () => void; template: PackageTemplate | null;
  treatments: Treatment[]; onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(template?.treatmentIds ?? []);
  const [sessions, setSessions] = useState(String(template?.sessions ?? "3"));
  const [validDays, setValidDays] = useState(String(template?.validDays ?? "365"));
  const [price, setPrice] = useState(template ? String(template.priceCents / 100) : "");
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [error, setError] = useState("");

  const toggleTreatment = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name, description: description || undefined,
        treatmentIds: selectedIds,
        sessions: Number(sessions),
        validDays: Number(validDays),
        priceCents: Math.round(Number(price) * 100),
        isActive,
      };
      if (template) {
        return (await api.patch(`/package-templates/${template.id}`, body)).data;
      }
      return (await api.post("/package-templates", body)).data;
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={template ? "Edit Package" : "Create Package"} className="max-w-lg">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Package Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lip Filler Course x3" />
        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Treatments included</label>
          <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {treatments.map((t) => (
              <label key={t.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--muted)]">
                <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleTreatment(t.id)} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Sessions" type="number" value={sessions} onChange={(e) => setSessions(e.target.value)} placeholder="3" />
          <Input label="Valid for (days)" type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} placeholder="365" />
        </div>
        <Input label="Price (£)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="250.00" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!name || !price || selectedIds.length === 0 || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
