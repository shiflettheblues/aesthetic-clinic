"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Plus, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function SmsCampaignsPage() {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);

  const { data: creditsData } = useQuery({
    queryKey: ["sms-credits"],
    queryFn: async () => {
      const res = await api.get("/sms/credits");
      return res.data as { balance: number };
    },
  });

  const { data: campaignsData } = useQuery({
    queryKey: ["sms-campaigns"],
    queryFn: async () => {
      const res = await api.get("/sms/campaigns");
      return res.data as { campaigns: Campaign[] };
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sms/campaigns/${id}/send`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-credits"] });
    },
  });

  const campaigns = campaignsData?.campaigns ?? [];

  const statusVariant: Record<string, "default" | "success" | "warning" | "info"> = {
    draft: "warning",
    sent: "success",
    scheduled: "info",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Card className="px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--muted-foreground)]">SMS Credits:</span>
              <span className="text-lg font-bold">{creditsData?.balance ?? 0}</span>
            </div>
          </Card>
          <Button variant="secondary" size="sm" onClick={() => setCreditModal(true)}>
            Add Credits
          </Button>
        </div>
        <Button onClick={() => setCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Campaign
        </Button>
      </div>

      <Card>
        <CardTitle>Campaigns</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Recipients</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Sent</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Date</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">No campaigns yet</td></tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-medium">{c.name}</td>
                    <td className="py-3 px-3"><Badge variant={statusVariant[c.status] ?? "default"}>{c.status}</Badge></td>
                    <td className="py-3 px-3">{c.recipientCount}</td>
                    <td className="py-3 px-3">{c.sentCount ?? "-"}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">
                      {c.sentAt ? format(new Date(c.sentAt), "dd MMM yyyy HH:mm") : format(new Date(c.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="py-3 px-3">
                      {c.status === "draft" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => sendMutation.mutate(c.id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateCampaignModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
          setCreateModal(false);
        }}
      />

      <AddCreditsModal
        open={creditModal}
        onClose={() => setCreditModal(false)}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["sms-credits"] });
          setCreditModal(false);
        }}
      />
    </div>
  );
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  recipientCount: number;
  sentCount: number | null;
  sentAt: string | null;
  createdAt: string;
}

function CreateCampaignModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [treatmentId, setTreatmentId] = useState("");
  const [error, setError] = useState("");

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: { id: string; name: string }[] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const targetFilter: Record<string, unknown> = {};
      if (treatmentId) targetFilter.treatmentId = treatmentId;
      const res = await api.post("/sms/campaigns", { name, message, targetFilter: Object.keys(targetFilter).length > 0 ? targetFilter : undefined });
      return res.data;
    },
    onSuccess: () => {
      setName("");
      setMessage("");
      setTreatmentId("");
      onCreated();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to create campaign");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Create SMS Campaign" className="max-w-md">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Campaign Name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Summer Special" />
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
            rows={3}
            maxLength={160}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi {name}, ..."
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{message.length}/160 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target Treatment (optional)</label>
          <select
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={treatmentId}
            onChange={(e) => setTreatmentId(e.target.value)}
          >
            <option value="">All patients</option>
            {(treatmentsData?.treatments ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!name || !message || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddCreditsModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Purchased");

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/sms/credits", { quantity: Number(quantity), reason });
      return res.data;
    },
    onSuccess: () => {
      setQuantity("");
      onAdded();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add SMS Credits" className="max-w-sm">
      <div className="space-y-4">
        <Input label="Quantity" type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} placeholder="100" />
        <Input label="Reason" value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => addMutation.mutate()} disabled={!quantity || addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add Credits"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
