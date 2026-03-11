"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function GoogleReviewsPage() {
  const queryClient = useQueryClient();
  const [placeId, setPlaceId] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ["integration-google-reviews"],
    queryFn: async () => {
      const res = await api.get("/integrations/google_reviews");
      return res.data as {
        integration: {
          provider: string;
          isEnabled: boolean;
          settings: { placeId?: string; autoSendReview?: boolean } | null;
        };
      };
    },
  });

  useEffect(() => {
    if (data?.integration) {
      setIsEnabled(data.integration.isEnabled);
      setPlaceId(data.integration.settings?.placeId ?? "");
      setAutoSend(data.integration.settings?.autoSendReview !== false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/integrations/google_reviews", {
        isEnabled,
        settings: { placeId, autoSendReview: autoSend },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-google-reviews"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Star className="h-5 w-5 text-yellow-500" />
          <CardTitle>Google Reviews</CardTitle>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? "bg-[var(--primary)]" : "bg-gray-300"}`}
              onClick={() => setIsEnabled(!isEnabled)}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-sm font-medium">Enable Google Reviews integration</span>
          </label>

          <Input
            label="Google Place ID"
            value={placeId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlaceId(e.target.value)}
            placeholder="ChIJ..."
          />
          <p className="text-xs text-[var(--muted-foreground)] -mt-2">
            Find your Place ID at Google&apos;s Place ID Finder
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${autoSend ? "bg-[var(--primary)]" : "bg-gray-300"}`}
              onClick={() => setAutoSend(!autoSend)}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${autoSend ? "translate-x-5" : ""}`} />
            </div>
            <div>
              <span className="text-sm font-medium">Auto-send review request</span>
              <p className="text-xs text-[var(--muted-foreground)]">Send email when appointment is marked as completed</p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {saved && <span className="text-sm text-green-600">Settings saved!</span>}
        </div>
      </Card>
    </div>
  );
}
