"use client";

import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function Header({ title }: { title: string }) {
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await api.get("/notifications?unread=true");
      return res.data as { unreadCount: number };
    },
    refetchInterval: 30_000,
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-[var(--muted)]">
          <Bell className="h-5 w-5 text-[var(--muted-foreground)]" />
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] text-white">
              {data?.unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
