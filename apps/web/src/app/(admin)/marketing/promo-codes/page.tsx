"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface PromoCode {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  validFrom: string | null;
  validUntil: string | null;
  treatmentId: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);

  const { data } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      const res = await api.get("/promo-codes");
      return res.data as { codes: PromoCode[] };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/promo-codes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promo-codes"] }),
  });

  const codes = data?.codes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Promo Code
        </Button>
      </div>

      <Card>
        <CardTitle>Promo Codes</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Code</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Discount</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Usage</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Validity</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">No promo codes yet</td></tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-mono font-bold">{c.code}</td>
                    <td className="py-3 px-3">
                      {c.discountType === "percentage" ? `${c.discountValue}%` : `£${(c.discountValue / 100).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-3">{c.currentUses}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                    <td className="py-3 px-3 text-xs text-[var(--muted-foreground)]">
                      {c.validFrom ? format(new Date(c.validFrom), "dd MMM") : "—"} → {c.validUntil ? format(new Date(c.validUntil), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="py-3 px-3"><Badge variant={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className="py-3 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CreatePromoModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
          setCreateModal(false);
        }}
      />
    </div>
  );
}

function CreatePromoModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
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
      const data: Record<string, unknown> = {
        code,
        discountType,
        discountValue: discountType === "percentage" ? Number(discountValue) : Math.round(Number(discountValue) * 100),
      };
      if (maxUses) data.maxUses = Number(maxUses);
      if (validFrom) data.validFrom = new Date(validFrom).toISOString();
      if (validUntil) data.validUntil = new Date(validUntil).toISOString();
      if (treatmentId) data.treatmentId = treatmentId;
      const res = await api.post("/promo-codes", data);
      return res.data;
    },
    onSuccess: () => {
      setCode(""); setDiscountValue(""); setMaxUses(""); setValidFrom(""); setValidUntil(""); setTreatmentId("");
      onCreated();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to create");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Promo Code" className="max-w-md">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Code" value={code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)} placeholder="SUMMER20" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed (£)</option>
            </select>
          </div>
          <Input label={discountType === "percentage" ? "Discount (%)" : "Discount (£)"} type="number" value={discountValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountValue(e.target.value)} />
        </div>
        <Input label="Max Uses (optional)" type="number" value={maxUses} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxUses(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Valid From</label>
            <input type="date" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valid Until</label>
            <input type="date" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Treatment (optional)</label>
          <select className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
            <option value="">All treatments</option>
            {(treatmentsData?.treatments ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!code || !discountValue || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
