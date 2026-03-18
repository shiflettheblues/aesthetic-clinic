"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Copy, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface SopTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  TREATMENT_PLAN: "Treatment Plan",
  SKINCARE_ROUTINE: "Skincare Routine",
  BRIDAL_PACKAGE: "Bridal Package",
  AFTERCARE_GUIDE: "Aftercare Guide",
  OTHER: "Other",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS);

const empty = { name: "", type: "TREATMENT_PLAN", content: "", isActive: true };

export default function SopTemplatesPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SopTemplate | null>(null);
  const [form, setForm] = useState(empty);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  const { data } = useQuery({
    queryKey: ["sop-templates"],
    queryFn: async () => {
      const res = await api.get("/sop-templates");
      return res.data as { templates: SopTemplate[] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.patch(`/sop-templates/${editing.id}`, form);
      } else {
        await api.post("/sop-templates", form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sop-templates"] });
      setModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/sop-templates/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sop-templates"] }),
  });

  const openEdit = (t: SopTemplate) => {
    setEditing(t);
    setForm({ name: t.name, type: t.type, content: t.content, isActive: t.isActive });
    setModal(true);
  };

  const copyToClipboard = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const templates = (data?.templates ?? []).filter((t) => !filterType || t.type === filterType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">SOP Templates</h2>
        <div className="flex gap-2 items-center">
          <select
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {templates.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">No templates yet. Create your first SOP template.</p>
        )}
        {templates.map((t) => (
          <Card key={t.id} className="!p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--primary)]">
                    {TYPE_LABELS[t.type] ?? t.type}
                  </span>
                  {!t.isActive && <Badge variant="warning">Inactive</Badge>}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 whitespace-pre-line">{t.content}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Copy content"
                  onClick={() => copyToClipboard(t.id, t.content)}
                >
                  {copied === t.id ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete template?")) deleteMutation.mutate(t.id); }}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Edit Template" : "New SOP Template"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              placeholder="e.g. Post-Filler Aftercare"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <p className="text-xs text-[var(--muted-foreground)] mb-1">This will be copied and sent to clients. Use clear, plain language.</p>
            <textarea
              rows={10}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              placeholder="Write your SOP content here..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.content || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
