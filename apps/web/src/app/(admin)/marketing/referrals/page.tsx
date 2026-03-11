"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Referral {
  id: string;
  referralCode: string;
  status: string;
  rewardPoints: number;
  createdAt: string;
  referrer: { firstName: string; lastName: string; email: string };
  referred: { firstName: string; lastName: string; email: string } | null;
}

export default function ReferralsPage() {
  const { data } = useQuery({
    queryKey: ["referrals-admin"],
    queryFn: async () => {
      const res = await api.get("/referrals");
      return res.data as { referrals: Referral[] };
    },
  });

  const referrals = data?.referrals ?? [];
  const totalPoints = referrals.reduce((sum, r) => sum + r.rewardPoints, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-[var(--muted-foreground)]">Total Referrals</p>
          <p className="text-2xl font-bold">{referrals.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted-foreground)]">Total Points Awarded</p>
          <p className="text-2xl font-bold">{totalPoints}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>All Referrals</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Referrer</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Referred</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Code</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Points</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">No referrals yet</td></tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-medium">{r.referrer.firstName} {r.referrer.lastName}</td>
                    <td className="py-3 px-3">{r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : "-"}</td>
                    <td className="py-3 px-3 font-mono text-xs">{r.referralCode}</td>
                    <td className="py-3 px-3">
                      <Badge variant={r.status === "completed" ? "success" : "warning"}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">{r.rewardPoints}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">{format(new Date(r.createdAt), "dd MMM yyyy")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
