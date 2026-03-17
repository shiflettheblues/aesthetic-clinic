"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import clsx from "clsx";

const tabs = [
  { href: "/marketing/sms-campaigns", label: "SMS Campaigns" },
  { href: "/marketing/patient-groups", label: "Patient Groups" },
  { href: "/marketing/loyalty", label: "Loyalty" },
  { href: "/marketing/referrals", label: "Referrals" },
  { href: "/marketing/memberships", label: "Memberships" },
  { href: "/marketing/promo-codes", label: "Promo Codes" },
  { href: "/marketing/gift-vouchers", label: "Gift Vouchers" },
  { href: "/marketing/google-reviews", label: "Google Reviews" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <Header title="Marketing" />
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
