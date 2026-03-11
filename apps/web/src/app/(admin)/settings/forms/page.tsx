"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface FormTemplate {
  id: string;
  name: string;
  formType: string;
  treatmentId?: string;
  fields: FormField[];
  isActive: boolean;
  version: number;
  treatment?: { id: string; name: string };
}

interface FormField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

const formTypes = ["MEDICAL_QUESTIONNAIRE", "CONSENT", "PHOTO_CONSENT", "AFTERCARE"];
const fieldTypes = ["text", "textarea", "number", "boolean", "select", "date"];

export default function FormsSettingsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FormTemplate | null>(null);
  const [name, setName] = useState("");
  const [formType, setFormType] = useState("MEDICAL_QUESTIONNAIRE");
  const [fields, setFields] = useState<FormField[]>([]);

  const { data } = useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const res = await api.get("/forms/templates");
      return res.data as { templates: FormTemplate[] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name, formType, fields, isActive: true };
      if (editing) {
        await api.patch(`/forms/templates/${editing.id}`, payload);
      } else {
        await api.post("/forms/templates", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      setModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/forms/templates/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-templates"] }),
  });

  const openEdit = (t: FormTemplate) => {
    setEditing(t);
    setName(t.name);
    setFormType(t.formType);
    setFields(t.fields);
    setModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setFormType("MEDICAL_QUESTIONNAIRE");
    setFields([]);
    setModal(true);
  };

  const addField = () => {
    setFields((f) => [...f, { key: `field_${f.length + 1}`, label: "", type: "text", required: false }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields((f) => f.map((field, i) => i === index ? { ...field, ...updates } : field));
  };

  const removeField = (index: number) => {
    setFields((f) => f.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Form Templates</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
      </div>

      <div className="space-y-2">
        {(data?.templates ?? []).map((t) => (
          <Card key={t.id} className="!p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  <Badge>{t.formType.replace("_", " ")}</Badge>
                  <Badge variant="info">v{t.version}</Badge>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t.fields.length} fields</p>
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
        {(data?.templates ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">No form templates yet</p>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Template" : "New Template"} className="max-w-2xl">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Template Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {formTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Fields</label>
              <Button size="sm" variant="secondary" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" /> Add Field</Button>
            </div>
            {fields.map((field, i) => (
              <div key={i} className="flex gap-2 items-start rounded-lg border border-[var(--border)] p-3">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Label"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  />
                  <select
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value })}
                  >
                    {fieldTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
                <button onClick={() => removeField(i)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name || fields.length === 0}>
              {saveMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
