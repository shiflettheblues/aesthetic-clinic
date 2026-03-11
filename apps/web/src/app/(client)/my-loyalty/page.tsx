"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function MyLoyaltyPage() {
  const queryClient = useQueryClient();
  const [redeemModal, setRedeemModal] = useState(false);

  const { data: balanceData } = useQuery({
    queryKey: ["loyalty-balance"],
    queryFn: async () => {
      const res = await api.get("/loyalty/balance");
      return res.data as { balance: number };
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ["loyalty-history"],
    queryFn: async () => {
      const res = await api.get("/loyalty/history");
      return res.data as { entries: { id: string; points: number; reason: string; reference: string | null; createdAt: string }[] };
    },
  });

  const balance = balanceData?.balance ?? 0;
  const entries = historyData?.entries ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Rewards</h1>

      <Card className="text-center py-8">
        <Gift className="h-12 w-12 mx-auto text-[var(--primary)] mb-3" />
        <p className="text-sm text-[var(--muted-foreground)]">Your Points Balance</p>
        <p className="text-5xl font-bold mt-1">{balance}</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">points</p>
        <div className="mt-4">
          <Button onClick={() => setRedeemModal(true)} disabled={balance < 50}>
            Redeem Points
          </Button>
          {balance < 50 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2">Minimum 50 points required to redeem</p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Points History</CardTitle>
        <div className="mt-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No points history yet. Book an appointment to earn points!</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{e.reason.replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{new Date(e.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-bold ${e.points > 0 ? "text-green-600" : "text-red-600"}`}>
                  {e.points > 0 ? "+" : ""}{e.points}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      <RedeemModal
        open={redeemModal}
        onClose={() => setRedeemModal(false)}
        balance={balance}
        onRedeemed={() => {
          queryClient.invalidateQueries({ queryKey: ["loyalty-balance"] });
          queryClient.invalidateQueries({ queryKey: ["loyalty-history"] });
          setRedeemModal(false);
        }}
      />
    </div>
  );
}

function RedeemModal({ open, onClose, balance, onRedeemed }: { open: boolean; onClose: () => void; balance: number; onRedeemed: () => void }) {
  const [points, setPoints] = useState("");
  const [error, setError] = useState("");

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/loyalty/redeem", { points: Number(points) });
      return res.data;
    },
    onSuccess: () => {
      setPoints("");
      onRedeemed();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to redeem");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Redeem Points" className="max-w-sm">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted-foreground)]">Available balance: <strong>{balance}</strong> points</p>
        <Input
          label="Points to Redeem"
          type="number"
          value={points}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPoints(e.target.value)}
          placeholder="50"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => redeemMutation.mutate()}
            disabled={!points || Number(points) > balance || Number(points) < 1 || redeemMutation.isPending}
          >
            {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
