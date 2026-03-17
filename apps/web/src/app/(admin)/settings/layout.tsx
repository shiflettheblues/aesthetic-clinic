"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import clsx from "clsx";

const tabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/treatments", label: "Treatments" },
  { href: "/settings/products", label: "Products" },
  { href: "/settings/practitioners", label: "Practitioners" },
  { href: "/settings/booking", label: "Booking" },
  { href: "/settings/forms", label: "Forms" },
  { href: "/settings/packages", label: "Packages" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/integrations", label: "Integrations" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <Header title="Settings" />
      <div className="border-b border-[var(--border)] bg-white px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                pathname.startsWith(tab.href)
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </>
  );
}
