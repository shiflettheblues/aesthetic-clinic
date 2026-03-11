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

interface Membership {
  id: string;
  name: string;
  monthlyPriceCents: number;
  benefits: Record<string, unknown>;
  isActive: boolean;
}

interface Subscription {
  id: string;
  status: string;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; email: string };
  membership: { id: string; name: string; monthlyPriceCents: number };
}

export default function MembershipsPage() {
  const queryClient = useQueryClient();
  const [tierModal, setTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<Membership | null>(null);

  const { data: tiersData } = useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      const res = await api.get("/memberships");
      return res.data as { memberships: Membership[] };
    },
  });

  const { data: subsData } = useQuery({
    queryKey: ["membership-subscriptions"],
    queryFn: async () => {
      const res = await api.get("/memberships/subscriptions");
      return res.data as { subscriptions: Subscription[] };
    },
  });

  const tiers = tiersData?.memberships ?? [];
  const subscriptions = subsData?.subscriptions ?? [];
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const mrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.membership.monthlyPriceCents, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-[var(--muted-foreground)]">Active Subscriptions</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted-foreground)]">Monthly Recurring Revenue</p>
          <p className="text-2xl font-bold">&pound;{(mrr / 100).toFixed(2)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Membership Tiers</CardTitle>
          <Button size="sm" onClick={() => { setEditingTier(null); setTierModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create Tier
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Price/mo</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-3 font-medium">{t.name}</td>
                  <td className="py-3 px-3 text-right">&pound;{(t.monthlyPriceCents / 100).toFixed(2)}</td>
                  <td className="py-3 px-3"><Badge variant={t.isActive ? "success" : "default"}>{t.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="py-3 px-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingTier(t); setTierModal(true); }}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Active Subscriptions</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Client</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Tier</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Price/mo</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Since</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">No subscriptions yet</td></tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-medium">{s.client.firstName} {s.client.lastName}</td>
                    <td className="py-3 px-3">{s.membership.name}</td>
                    <td className="py-3 px-3"><Badge variant={s.status === "active" ? "success" : "default"}>{s.status}</Badge></td>
                    <td className="py-3 px-3 text-right">&pound;{(s.membership.monthlyPriceCents / 100).toFixed(2)}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TierModal
        open={tierModal}
        onClose={() => { setTierModal(false); setEditingTier(null); }}
        tier={editingTier}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["memberships"] });
          setTierModal(false);
          setEditingTier(null);
        }}
      />
    </div>
  );
}

function TierModal({
  open, onClose, tier, onSaved,
}: { open: boolean; onClose: () => void; tier: Membership | null; onSaved: () => void }) {
  const [name, setName] = useState(tier?.name ?? "");
  const [price, setPrice] = useState(tier ? String(tier.monthlyPriceCents / 100) : "");
  const [benefits, setBenefits] = useState(tier ? JSON.stringify(tier.benefits, null, 2) : '{\n  "discount": 10,\n  "priorityBooking": true\n}');
  const [isActive, setIsActive] = useState(tier?.isActive ?? true);
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        monthlyPriceCents: Math.round(Number(price) * 100),
        benefits: JSON.parse(benefits),
        isActive,
      };
      if (tier) {
        return (await api.patch(`/memberships/${tier.id}`, data)).data;
      }
      return (await api.post("/memberships", data)).data;
    },
    onSuccess: () => onSaved(),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to save");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={tier ? "Edit Tier" : "Create Tier"} className="max-w-md">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Gold" />
        <Input label="Monthly Price (£)" type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)} placeholder="49.99" />
        <div>
          <label className="block text-sm font-medium mb-1">Benefits (JSON)</label>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono resize-none"
            rows={4}
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!name || !price || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
