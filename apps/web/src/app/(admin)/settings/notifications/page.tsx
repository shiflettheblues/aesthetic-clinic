"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface NotifTemplate {
  id: string;
  type: string;
  channel: "SMS" | "EMAIL";
  subject: string | null;
  body: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking Confirmed",
  BOOKING_REMINDER_24H: "Reminder (24h before)",
  BOOKING_CANCELLED: "Booking Cancelled",
  REBOOK_REMINDER: "Rebook Reminder",
  BIRTHDAY: "Birthday",
  OVERDUE_TREATMENT: "Overdue Treatment",
  PAYMENT_RECEIVED: "Payment Received",
  FOLLOW_UP: "Post-Treatment Follow-up",
};

const VARIABLES = ["{name}", "{treatment}", "{date}", "{time}", "{practitioner}", "{clinic}", "{amount}"];

export default function NotificationsSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"SMS" | "EMAIL">("SMS");
  const [editing, setEditing] = useState<NotifTemplate | null>(null);

  const { data } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const res = await api.get("/notification-templates");
      return res.data as { templates: NotifTemplate[] };
    },
  });

  const templates = (data?.templates ?? []).filter((t) => t.channel === activeTab);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Notification Templates</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Customise the messages sent to clients for each event type.
        </p>

        <div className="flex gap-1 border-b border-[var(--border)] mt-4 mb-4">
          {(["SMS", "EMAIL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start justify-between rounded-lg border border-[var(--border)] p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{TYPE_LABELS[t.type] ?? t.type}</p>
                  <Badge variant={t.isActive ? "success" : "default"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                {t.channel === "EMAIL" && t.subject && (
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Subject: {t.subject}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] truncate">{t.body}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(t)} className="ml-3 shrink-0">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {editing && (
        <EditTemplateModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditTemplateModal({ template, onClose, onSaved }: { template: NotifTemplate; onClose: () => void; onSaved: () => void }) {
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [preview, setPreview] = useState<{ body: string; subject?: string } | null>(null);
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/notification-templates/${template.id}`, {
        subject: template.channel === "EMAIL" ? subject : undefined,
        body,
      });
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save");
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/notification-templates/preview", {
        body,
        subject: template.channel === "EMAIL" ? subject : undefined,
      });
      return res.data as { body: string; subject?: string };
    },
    onSuccess: (data) => setPreview(data),
  });

  return (
    <Modal open onClose={onClose} title={`Edit — ${TYPE_LABELS[template.type] ?? template.type} (${template.channel})`} className="max-w-2xl">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <p className="text-xs text-[var(--muted-foreground)] w-full">Available variables:</p>
          {VARIABLES.map((v) => (
            <button
              key={v}
              onClick={() => setBody((b) => b + v)}
              className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--primary)] hover:opacity-80"
            >
              {v}
            </button>
          ))}
        </div>

        {template.channel === "EMAIL" && (
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Your appointment is confirmed" />
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Message Body</label>
          <textarea
            rows={template.channel === "EMAIL" ? 8 : 4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {preview && (
          <div className="rounded-lg bg-[var(--muted)] p-3 text-sm space-y-1">
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Preview</p>
            {preview.subject && <p className="font-medium">{preview.subject}</p>}
            <p className="whitespace-pre-wrap">{preview.body}</p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="secondary" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
            {previewMutation.isPending ? "Loading..." : "Preview"}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!body || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
