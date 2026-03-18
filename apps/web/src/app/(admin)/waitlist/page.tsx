"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, Trash2, CheckCircle, Clock, CalendarX } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface WaitlistEntry {
  id: string;
  status: "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELLED";
  preferredDate: string | null;
  notes: string | null;
  createdAt: string;
  notifiedAt: string | null;
  client: { id: string; firstName: string; lastName: string; phone: string | null; email: string };
  treatment: { id: string; name: string };
  practitioner: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_TABS = ["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"] as const;

function statusBadge(status: WaitlistEntry["status"]) {
  const map: Record<string, "default" | "success" | "warning" | "destructive"> = {
    WAITING: "warning",
    NOTIFIED: "default",
    BOOKED: "success",
    CANCELLED: "destructive",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

export default function WaitlistPage() {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<typeof STATUS_TABS[number]>("WAITING");

  const { data, isLoading } = useQuery({
    queryKey: ["waitlist", activeStatus],
    queryFn: async () => {
      const res = await api.get(`/waitlist?status=${activeStatus}`);
      return res.data as { entries: WaitlistEntry[] };
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async (id: string) => { await api.post(`/waitlist/${id}/notify`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/waitlist/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/waitlist/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });

  const entries = data?.entries ?? [];

  return (
    <>
      <Header title="Waitlist" />
      <div className="border-b border-[var(--border)] bg-white px-6">
        <div className="flex gap-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors capitalize",
                activeStatus === s
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-3">
        {isLoading && <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-12">
            <CalendarX className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)]">No {activeStatus.toLowerCase()} entries</p>
          </div>
        )}

        {entries.map((entry) => (
          <Card key={entry.id} className="!p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{entry.client.firstName} {entry.client.lastName}</span>
                  {statusBadge(entry.status)}
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {entry.treatment.name}
                  {entry.practitioner && <> · {entry.practitioner.firstName} {entry.practitioner.lastName}</>}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Added {format(new Date(entry.createdAt), "dd MMM yyyy")}</span>
                  {entry.preferredDate && <span>Preferred: {format(new Date(entry.preferredDate), "dd MMM yyyy")}</span>}
                  {entry.notifiedAt && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Notified {format(new Date(entry.notifiedAt), "dd MMM")}</span>}
                </div>
                {entry.notes && <p className="text-xs text-[var(--muted-foreground)] italic">{entry.notes}</p>}
                <div className="text-xs text-[var(--muted-foreground)]">
                  {entry.client.phone && <span>{entry.client.phone} · </span>}
                  {entry.client.email}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {entry.status === "WAITING" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => notifyMutation.mutate(entry.id)}
                    disabled={notifyMutation.isPending}
                  >
                    <Bell className="h-4 w-4 mr-1" /> Notify
                  </Button>
                )}
                {entry.status === "NOTIFIED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: entry.id, status: "BOOKED" })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Mark Booked
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm("Remove from waitlist?")) deleteMutation.mutate(entry.id); }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

