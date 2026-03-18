"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Check, Gift } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface GiftCard {
  id: string;
  code: string;
  balanceCents: number;
  originalBalanceCents: number;
  expiresAt: string | null;
  createdAt: string;
  purchasedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

export default function GiftVouchersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["gift-cards"],
    queryFn: async () => {
      const res = await api.get("/gift-cards");
      return res.data as { giftCards: GiftCard[] };
    },
  });

  const voidMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/gift-cards/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gift-cards"] }),
  });

  const giftCards = data?.giftCards ?? [];
  const activeCards = giftCards.filter((c) => c.balanceCents > 0);
  const totalOutstanding = activeCards.reduce((s, c) => s + c.balanceCents, 0);

  const copyCode = async (card: GiftCard) => {
    await navigator.clipboard.writeText(card.code);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Header title="Gift Vouchers" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Active Vouchers</p>
            <p className="text-2xl font-bold">{activeCards.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Outstanding Balance</p>
            <p className="text-2xl font-bold">&pound;{(totalOutstanding / 100).toFixed(2)}</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>All Vouchers</CardTitle>
            <Button size="sm" onClick={() => setModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Issue Voucher
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Code</th>
                  <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Balance</th>
                  <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Original</th>
                  <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Issued To</th>
                  <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Expiry</th>
                  <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {giftCards.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">No gift vouchers yet</td></tr>
                ) : (
                  giftCards.map((card) => (
                    <tr key={card.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{card.code}</span>
                          <button onClick={() => copyCode(card)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                            {copiedId === card.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">&pound;{(card.balanceCents / 100).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-[var(--muted-foreground)]">&pound;{(card.originalBalanceCents / 100).toFixed(2)}</td>
                      <td className="py-3 px-3">
                        {card.purchasedBy ? (
                          <span>{card.purchasedBy.firstName} {card.purchasedBy.lastName}</span>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[var(--muted-foreground)]">
                        {card.expiresAt ? format(new Date(card.expiresAt), "d MMM yyyy") : "No expiry"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={card.balanceCents > 0 ? "success" : "default"}>
                          {card.balanceCents > 0 ? "Active" : "Used"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {card.balanceCents > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { if (confirm("Void this gift card?")) voidMutation.mutate(card.id); }}
                          >
                            Void
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
      </div>

      <IssueVoucherModal
        open={modal}
        onClose={() => setModal(false)}
        onIssued={() => {
          queryClient.invalidateQueries({ queryKey: ["gift-cards"] });
          setModal(false);
        }}
      />
    </>
  );
}

function IssueVoucherModal({ open, onClose, onIssued }: { open: boolean; onClose: () => void; onIssued: () => void }) {
  const [amount, setAmount] = useState("");
  const [expiry, setExpiry] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2) return { patients: [] };
      const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=5`);
      return res.data as { patients: { id: string; firstName: string; lastName: string }[] };
    },
    enabled: patientSearch.length >= 2,
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/gift-cards", {
        balanceCents: Math.round(Number(amount) * 100),
        expiresAt: expiry ? new Date(expiry).toISOString() : undefined,
        clientId: patientId || undefined,
      });
      return res.data as { giftCard: { code: string } };
    },
    onSuccess: (data) => {
      setNewCode(data.giftCard.code);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to issue voucher");
    },
  });

  const copyCode = async () => {
    if (newCode) {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (newCode) {
    return (
      <Modal open={open} onClose={() => { setNewCode(null); onIssued(); }} title="Voucher Issued!">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Gift className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Gift voucher created successfully</p>
          <div className="rounded-xl border-2 border-dashed border-[var(--primary)] p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Voucher Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider text-[var(--primary)]">{newCode}</p>
          </div>
          <Button onClick={copyCode} variant="secondary" className="w-full">
            {copied ? <><Check className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy Code</>}
          </Button>
          <Button onClick={() => { setNewCode(null); onIssued(); }} className="w-full">Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Issue Gift Voucher">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Amount (£)" type="number" placeholder="50" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Expiry Date (optional)" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        <div>
          <label className="block text-sm font-medium mb-1">Patient (optional)</label>
          {patientId ? (
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="text-sm">{patientName}</span>
              <button className="text-xs text-[var(--primary)]" onClick={() => { setPatientId(""); setPatientName(""); setPatientSearch(""); }}>Change</button>
            </div>
          ) : (
            <div className="relative">
              <Input placeholder="Search patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
              {(patientsData?.patients ?? []).length > 0 && (
                <div className="absolute z-20 w-full mt-1 rounded-lg border border-[var(--border)] bg-white shadow-lg">
                  {(patientsData?.patients ?? []).map((p) => (
                    <button key={p.id} className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                      onClick={() => { setPatientId(p.id); setPatientName(`${p.firstName} ${p.lastName}`); setPatientSearch(""); }}>
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => issueMutation.mutate()} disabled={!amount || issueMutation.isPending}>
            {issueMutation.isPending ? "Issuing..." : "Issue Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
