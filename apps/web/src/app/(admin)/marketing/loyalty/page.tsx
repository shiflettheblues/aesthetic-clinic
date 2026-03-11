"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface ClientPoints {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
}

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [awardModal, setAwardModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientPoints | null>(null);
  const [historyClient, setHistoryClient] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["loyalty-all"],
    queryFn: async () => {
      const res = await api.get("/loyalty/all");
      return res.data as { clients: ClientPoints[] };
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ["loyalty-history", historyClient],
    queryFn: async () => {
      const res = await api.get(`/loyalty/history?clientId=${historyClient}`);
      return res.data as { entries: { id: string; points: number; reason: string; reference: string | null; createdAt: string }[] };
    },
    enabled: !!historyClient,
  });

  const clients = data?.clients ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Loyalty Points</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Client</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Email</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Balance</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-[var(--muted-foreground)]">No loyalty data yet</td></tr>
              ) : (
                clients.map((c) => (
                  <tr
                    key={c.clientId}
                    className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--muted)]"
                    onClick={() => setHistoryClient(historyClient === c.clientId ? null : c.clientId)}
                  >
                    <td className="py-3 px-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="py-3 px-3">{c.email}</td>
                    <td className="py-3 px-3 text-right font-bold">{c.balance}</td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedClient(c);
                          setAwardModal(true);
                        }}
                      >
                        <Award className="h-3 w-3 mr-1" /> Award
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {historyClient && historyData && (
        <Card>
          <CardTitle>Points History</CardTitle>
          <div className="mt-4 space-y-2">
            {historyData.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{e.reason.replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{new Date(e.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-bold ${e.points > 0 ? "text-green-600" : "text-red-600"}`}>
                  {e.points > 0 ? "+" : ""}{e.points}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AwardPointsModal
        open={awardModal}
        onClose={() => { setAwardModal(false); setSelectedClient(null); }}
        client={selectedClient}
        onAwarded={() => {
          queryClient.invalidateQueries({ queryKey: ["loyalty-all"] });
          queryClient.invalidateQueries({ queryKey: ["loyalty-history"] });
          setAwardModal(false);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}

function AwardPointsModal({
  open, onClose, client, onAwarded,
}: { open: boolean; onClose: () => void; client: ClientPoints | null; onAwarded: () => void }) {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const awardMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/loyalty/award", {
        clientId: client?.clientId,
        points: Number(points),
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      setPoints("");
      setReason("");
      onAwarded();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to award points");
    },
  });

  if (!client) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Award Points — ${client.firstName} ${client.lastName}`} className="max-w-sm">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <Input label="Points" type="number" value={points} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPoints(e.target.value)} placeholder="50" />
        <Input label="Reason" value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="e.g. loyalty bonus" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => awardMutation.mutate()} disabled={!points || !reason || awardMutation.isPending}>
            {awardMutation.isPending ? "Awarding..." : "Award Points"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
