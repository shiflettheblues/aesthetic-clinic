"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Share2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function MyReferralsPage() {
  const [copied, setCopied] = useState(false);

  const { data: codeData } = useQuery({
    queryKey: ["my-referral-code"],
    queryFn: async () => {
      const res = await api.get("/referrals/my-code");
      return res.data as { referralCode: string };
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ["referral-history"],
    queryFn: async () => {
      const res = await api.get("/referrals/history");
      return res.data as {
        referrals: {
          id: string;
          referralCode: string;
          status: string;
          rewardPoints: number;
          createdAt: string;
          referred: { firstName: string; lastName: string } | null;
        }[];
      };
    },
  });

  const code = codeData?.referralCode ?? "";
  const referrals = historyData?.referrals ?? [];
  const shareUrl = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code}` : "";

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join Dr Skin Central",
        text: `Use my referral code ${code} to earn bonus points!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Referrals</h1>
      <p className="text-[var(--muted-foreground)]">Share your code and earn points when friends book!</p>

      <Card className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-[var(--primary)] mb-3" />
        <p className="text-sm text-[var(--muted-foreground)] mb-2">Your Referral Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-bold font-mono tracking-widest">{code || "..."}</span>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            title="Copy code"
          >
            <Copy className="h-5 w-5 text-[var(--muted-foreground)]" />
          </button>
        </div>
        {copied && <p className="text-sm text-green-600 mt-1">Copied!</p>}
        <div className="mt-4">
          <Button onClick={shareLink}>
            <Share2 className="h-4 w-4 mr-2" /> Share Link
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-4">
          You earn 100 points and your friend earns 50 points when they book their first appointment.
        </p>
      </Card>

      <Card>
        <CardTitle>Referral History</CardTitle>
        <div className="mt-4 space-y-2">
          {referrals.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
              No referrals yet. Share your code to start earning!
            </p>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : "Pending"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "completed" ? "success" : "warning"}>
                    {r.status}
                  </Badge>
                  <span className="text-sm font-bold text-green-600">+{r.rewardPoints}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
