"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
    clinic_email: "",
    clinic_timezone: "Europe/London",
    vat_rate: "20",
  });
  const [policies, setPolicies] = useState({
    cancellation_policy: "",
    terms_conditions: "",
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
        clinic_name: (data.settings.clinic_name as string) ?? "",
        clinic_address: (data.settings.clinic_address as string) ?? "",
        clinic_phone: (data.settings.clinic_phone as string) ?? "",
        clinic_email: (data.settings.clinic_email as string) ?? "",
        clinic_timezone: (data.settings.clinic_timezone as string) ?? "Europe/London",
        vat_rate: (data.settings.vat_rate as string) ?? "20",
      }));
      setPolicies({
        cancellation_policy: (data.settings.cancellation_policy as string) ?? "",
        terms_conditions: (data.settings.terms_conditions as string) ?? "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put("/settings", { settings: { ...form, ...policies } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const policiesMutation = useMutation({
    mutationFn: async () => {
      await api.put("/settings", { settings: policies });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardTitle>Clinic Information</CardTitle>
        <div className="mt-4 space-y-4">
          <Input label="Clinic Name" value={form.clinic_name} onChange={(e) => setForm((f) => ({ ...f, clinic_name: e.target.value }))} />
          <Input label="Address" value={form.clinic_address} onChange={(e) => setForm((f) => ({ ...f, clinic_address: e.target.value }))} />
          <Input label="Phone" value={form.clinic_phone} onChange={(e) => setForm((f) => ({ ...f, clinic_phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.clinic_email} onChange={(e) => setForm((f) => ({ ...f, clinic_email: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={form.clinic_timezone}
              onChange={(e) => setForm((f) => ({ ...f, clinic_timezone: e.target.value }))}
            >
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={form.vat_rate}
              onChange={(e) => setForm((f) => ({ ...f, vat_rate: e.target.value }))}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Used for invoice generation and financial reports. Set to 0 if not VAT registered.</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {saveMutation.isSuccess && <p className="text-sm text-green-600">Saved!</p>}
        </div>
      </Card>

      <Card>
        <CardTitle>Cancellation Policy</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-4">
          This is displayed to clients before they confirm a booking and in booking confirmation emails.
        </p>
        <textarea
          rows={8}
          placeholder="e.g. Cancellations made with less than 24 hours' notice will be charged 50% of the treatment cost. No-shows will be charged in full. Deposits are non-refundable unless cancelled with 48 hours' notice..."
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          value={policies.cancellation_policy}
          onChange={(e) => setPolicies((p) => ({ ...p, cancellation_policy: e.target.value }))}
        />
        <div className="flex justify-end mt-3">
          <Button onClick={() => policiesMutation.mutate()} disabled={policiesMutation.isPending}>
            {policiesMutation.isPending ? "Saving..." : "Save Policy"}
          </Button>
        </div>
        {policiesMutation.isSuccess && <p className="text-sm text-green-600 mt-2">Saved!</p>}
      </Card>

      <Card>
        <CardTitle>Terms &amp; Conditions</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-4">
          Full terms and conditions for the clinic, shown during registration and on consent forms.
        </p>
        <textarea
          rows={12}
          placeholder="Enter your full terms and conditions here..."
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          value={policies.terms_conditions}
          onChange={(e) => setPolicies((p) => ({ ...p, terms_conditions: e.target.value }))}
        />
        <div className="flex justify-end mt-3">
          <Button onClick={() => policiesMutation.mutate()} disabled={policiesMutation.isPending}>
            {policiesMutation.isPending ? "Saving..." : "Save Terms"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
