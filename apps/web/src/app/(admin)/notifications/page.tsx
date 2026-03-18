"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, Check, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data as { notifications: Notification[]; unreadCount: number };
    },
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <>
      <Header title="Notifications" />
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="text-center py-10">
            <Bell className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm text-[var(--muted-foreground)]">No notifications yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                  n.readAt
                    ? "border-[var(--border)] bg-white"
                    : "border-[var(--primary)]/20 bg-[var(--accent)]"
                )}
              >
                <div className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  n.readAt ? "bg-[var(--muted)]" : "bg-[var(--primary)]/10"
                )}>
                  <Bell className={clsx("h-4 w-4", n.readAt ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{n.body}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {format(new Date(n.createdAt), "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                {!n.readAt && (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
