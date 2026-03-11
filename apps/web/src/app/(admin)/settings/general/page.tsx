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
    <Card className="max-w-lg">
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
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
        {saveMutation.isSuccess && <p className="text-sm text-green-600">Saved!</p>}
      </div>
    </Card>
  );
}
