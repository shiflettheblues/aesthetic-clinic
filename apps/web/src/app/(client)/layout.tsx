"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Calendar, Gift, Crown, UserPlus, UserCircle } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/my-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-appointments", label: "Appointments", icon: Calendar },
  { href: "/my-loyalty", label: "Rewards", icon: Gift },
  { href: "/my-membership", label: "Membership", icon: Crown },
  { href: "/my-referrals", label: "Referrals", icon: UserPlus },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/my-dashboard" className="text-lg font-bold text-[var(--primary)]">
            Dr Skin Central
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-[var(--accent)] text-[var(--primary)] font-medium" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
