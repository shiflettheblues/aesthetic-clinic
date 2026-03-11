"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plug, RefreshCw, Settings, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

const providerInfo: Record<string, { name: string; description: string; fields: string[] }> = {
  mailchimp: { name: "Mailchimp", description: "Sync patient lists and segment by treatment/visit date", fields: ["api_key", "list_id"] },
  klarna: { name: "Klarna", description: "Buy-now-pay-later at checkout", fields: ["username", "password"] },
  clearpay: { name: "Clearpay", description: "Buy-now-pay-later at checkout", fields: ["merchant_id", "secret_key"] },
  xero: { name: "Xero", description: "Sync payments as invoices, product inventory", fields: ["client_id", "client_secret"] },
  google_reviews: { name: "Google Reviews", description: "Direct review collection links", fields: ["place_id"] },
};

interface Integration {
  id: string | null;
  provider: string;
  isEnabled: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await api.get("/integrations");
      return res.data as { integrations: Integration[] };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ provider, enabled }: { provider: string; enabled: boolean }) => {
      if (enabled) {
        await api.put(`/integrations/${provider}`, { isEnabled: true, credentials: creds });
      } else {
        await api.delete(`/integrations/${provider}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setConfiguring(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (provider: string) => {
      await api.post(`/integrations/${provider}/sync`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const integrations = data?.integrations ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Integrations</h2>

      <div className="space-y-3">
        {integrations.map((intg) => {
          const info = providerInfo[intg.provider];
          if (!info) return null;

          return (
            <Card key={intg.provider} className="!p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]">
                    <Plug className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{info.name}</p>
                      {intg.isEnabled ? (
                        <Badge variant="success">Connected</Badge>
                      ) : (
                        <Badge>Disconnected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">{info.description}</p>
                    {intg.lastSyncAt && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Last sync: {new Date(intg.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {intg.isEnabled && (
                    <Button variant="ghost" size="sm" onClick={() => syncMutation.mutate(intg.provider)} disabled={syncMutation.isPending}>
                      <RefreshCw className={`h-4 w-4 ${intg.syncStatus === "syncing" ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                  <Button
                    variant={intg.isEnabled ? "destructive" : "primary"}
                    size="sm"
                    onClick={() => {
                      if (intg.isEnabled) {
                        toggleMutation.mutate({ provider: intg.provider, enabled: false });
                      } else {
                        setCreds({});
                        setConfiguring(intg.provider);
                      }
                    }}
                  >
                    {intg.isEnabled ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Configure modal */}
      {configuring && providerInfo[configuring] && (
        <Modal
          open={!!configuring}
          onClose={() => setConfiguring(null)}
          title={`Connect ${providerInfo[configuring]!.name}`}
        >
          <div className="space-y-4">
            {providerInfo[configuring]!.fields.map((field) => (
              <Input
                key={field}
                label={field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                value={creds[field] ?? ""}
                onChange={(e) => setCreds((c) => ({ ...c, [field]: e.target.value }))}
                type={field.includes("secret") || field.includes("password") || field.includes("key") ? "password" : "text"}
              />
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfiguring(null)}>Cancel</Button>
              <Button
                onClick={() => toggleMutation.mutate({ provider: configuring, enabled: true })}
                disabled={toggleMutation.isPending}
              >
                {toggleMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
