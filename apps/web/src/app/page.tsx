"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth";

export default function Home() {
  const { accessToken } = useAuthStore();
  const isLoggedIn = !!accessToken;

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-[var(--primary)]">Dr Skin Central</h1>
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Log In
              </Link>
            )}
            <Link
              href="/book"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Expert Aesthetic Treatments
          <br />
          <span className="text-[var(--primary)]">in Ipswich</span>
        </h2>
        <p className="mt-4 text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
          Anti-wrinkle injections, dermal fillers, laser hair removal, skin boosters, chemical peels and more.
          Professional care you can trust.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/book"
            className="rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Book Appointment
          </Link>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] bg-white px-6 py-3 text-sm font-medium hover:bg-[var(--muted)] transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </section>

      {/* Treatment categories */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h3 className="text-2xl font-bold text-center mb-10">Our Treatments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: "Anti-Wrinkles", desc: "From £100", emoji: "✨" },
            { name: "Dermal Fillers", desc: "From £160", emoji: "💉" },
            { name: "Laser Hair Removal", desc: "From £30", emoji: "⚡" },
            { name: "Skin Boosters", desc: "From £150", emoji: "💧" },
            { name: "Chemical Peels", desc: "From £60", emoji: "🧴" },
            { name: "Microneedling", desc: "From £150", emoji: "🪡" },
            { name: "PRP Therapy", desc: "From £200", emoji: "🩸" },
            { name: "IV Drips", desc: "From £80", emoji: "💊" },
            { name: "Body Treatments", desc: "From £80", emoji: "🏋️" },
            { name: "Facials & LED", desc: "From £40", emoji: "🌟" },
          ].map((t) => (
            <Link
              key={t.name}
              href="/book"
              className="rounded-xl bg-white border border-[var(--border)] p-4 text-center hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">{t.emoji}</span>
              <p className="mt-2 text-sm font-medium">{t.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className="bg-white border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-[var(--primary)]">96+</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Treatments available</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--primary)]">5★</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Google rated clinic</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--primary)]">Ipswich</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">5 The Walk, IP1 1EA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-[var(--muted-foreground)]">
            Dr Skin Central &middot; 5 The Walk, Ipswich IP1 1EA &middot; 01473 948271
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Staff Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
