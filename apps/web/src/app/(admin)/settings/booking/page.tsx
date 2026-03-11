"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function BookingSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    booking_deposit_percent: 20,
    booking_auto_confirm: true,
    booking_cancellation_hours: 24,
    cancellation_policy: "",
    booking_terms: "",
  });

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/settings");
      return res.data as { settings: Record<string, unknown> };
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setForm((prev) => ({
        ...prev,
        booking_deposit_percent: (data.settings.booking_deposit_percent as number) ?? 20,
        booking_auto_confirm: (data.settings.booking_auto_confirm as boolean) ?? true,
        booking_cancellation_hours: (data.settings.booking_cancellation_hours as number) ?? 24,
        cancellation_policy: (data.settings.cancellation_policy as string) ?? "",
        booking_terms: (data.settings.booking_terms as string) ?? "",
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put("/settings", { settings: form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardTitle>Booking Configuration</CardTitle>
        <div className="mt-4 space-y-4">
          <Input
            label="Deposit Percentage (%)"
            type="number"
            min="0"
            max="100"
            value={String(form.booking_deposit_percent)}
            onChange={(e) => setForm((f) => ({ ...f, booking_deposit_percent: Number(e.target.value) }))}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.booking_auto_confirm}
              onChange={(e) => setForm((f) => ({ ...f, booking_auto_confirm: e.target.checked }))}
            />
            <span className="text-sm">Auto-confirm online bookings</span>
          </label>
          <Input
            label="Cancellation Window (hours)"
            type="number"
            min="0"
            value={String(form.booking_cancellation_hours)}
            onChange={(e) => setForm((f) => ({ ...f, booking_cancellation_hours: Number(e.target.value) }))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Policies</CardTitle>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cancellation Policy</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
              rows={3}
              value={form.cancellation_policy}
              onChange={(e) => setForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Booking Terms & Conditions</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none"
              rows={4}
              value={form.booking_terms}
              onChange={(e) => setForm((f) => ({ ...f, booking_terms: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
      {saveMutation.isSuccess && <p className="text-sm text-green-600">Saved!</p>}
    </div>
  );
}
