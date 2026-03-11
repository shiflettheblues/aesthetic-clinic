"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Check } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
  membership: Membership;
}

export default function MyMembershipPage() {
  const queryClient = useQueryClient();

  const { data: subData } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const res = await api.get("/memberships/my-subscription");
      return res.data as { subscription: Subscription | null };
    },
  });

  const { data: tiersData } = useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      const res = await api.get("/memberships");
      return res.data as { memberships: Membership[] };
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const res = await api.post("/memberships/subscribe", { membershipId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/memberships/cancel");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });

  const subscription = subData?.subscription;
  const tiers = tiersData?.memberships ?? [];

  if (subscription) {
    const benefits = subscription.membership.benefits;
    const benefitEntries = Object.entries(benefits);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Membership</h1>
        <Card className="text-center py-8">
          <Crown className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
          <Badge variant="success" className="mb-2">{subscription.status}</Badge>
          <p className="text-2xl font-bold">{subscription.membership.name}</p>
          <p className="text-lg text-[var(--muted-foreground)]">
            &pound;{(subscription.membership.monthlyPriceCents / 100).toFixed(2)}/month
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Member since {new Date(subscription.createdAt).toLocaleDateString()}
          </p>
        </Card>

        {benefitEntries.length > 0 && (
          <Card>
            <CardTitle>Your Benefits</CardTitle>
            <div className="mt-4 space-y-2">
              {benefitEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}: </span>
                  <span className="font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            Want to cancel your membership? You can do so at any time.
          </p>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Membership"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Memberships</h1>
      <p className="text-[var(--muted-foreground)]">Join a membership plan and enjoy exclusive benefits.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const benefits = Object.entries(tier.benefits);
          return (
            <Card key={tier.id} className="flex flex-col">
              <div className="flex-1">
                <Crown className="h-8 w-8 text-[var(--primary)] mb-2" />
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="text-2xl font-bold mt-2">
                  &pound;{(tier.monthlyPriceCents / 100).toFixed(2)}
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">/month</span>
                </p>
                {benefits.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {benefits.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}: {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Button
                  className="w-full"
                  onClick={() => subscribeMutation.mutate(tier.id)}
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {tiers.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-[var(--muted-foreground)]">No membership plans available at the moment.</p>
        </Card>
      )}
    </div>
  );
}
