"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, Settings, LogOut, BarChart3, Megaphone, UserCheck, ClipboardList, Menu, X } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCheck },
  { href: "/waitlist", label: "Waitlist", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // ignore
    }
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--accent)] text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:hidden">
        <h1 className="text-base font-bold text-[var(--primary)]">Dr Skin Central</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-[var(--border)] transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-6 border-b border-[var(--border)]">
          <h1 className="text-base font-bold text-[var(--primary)]">Dr Skin Central</h1>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r border-[var(--border)] bg-white">
      <div className="flex h-16 items-center px-6 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold text-[var(--primary)]">Dr Skin Central</h1>
      </div>
      <NavContent />
    </aside>
  );
}
