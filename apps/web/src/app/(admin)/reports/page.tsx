"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const presets = [
  { label: "Last 7 days", from: () => subDays(new Date(), 7), to: () => new Date() },
  { label: "Last 30 days", from: () => subDays(new Date(), 30), to: () => new Date() },
  { label: "This month", from: () => startOfMonth(new Date()), to: () => new Date() },
];

export default function ReportsPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const params = `from=${from}T00:00:00Z&to=${to}T23:59:59Z`;

  const { data: revenue } = useQuery({
    queryKey: ["reports", "revenue", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/revenue?${params}`);
      return res.data as {
        totalRevenue: number;
        totalPayments: number;
        byTreatment: { name: string; revenue: number; count: number }[];
        byPractitioner: { name: string; revenue: number; count: number }[];
      };
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["reports", "patients", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/patients?${params}`);
      return res.data as {
        totalPatients: number;
        newPatients: number;
        uniqueClients: number;
        returningClients: number;
        retentionRate: number;
        avgVisitsPerClient: number;
        avgSpendCents: number;
      };
    },
  });

  const { data: treatments } = useQuery({
    queryKey: ["reports", "treatments", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/treatments?${params}`);
      return res.data as { treatments: { name: string; bookings: number; estimatedRevenue: number }[] };
    },
  });

  const { data: business } = useQuery({
    queryKey: ["reports", "business", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/business?${params}`);
      return res.data as {
        totalRevenueCents: number;
        totalProductCostCents: number;
        grossProfitCents: number;
        profitMarginPercent: number;
        completedAppointments: number;
      };
    },
  });

  const { data: smsReport } = useQuery({
    queryKey: ["reports", "sms", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/sms?${params}`);
      return res.data as {
        campaigns: { id: string; name: string; status: string; recipientCount: number; sentCount: number | null; sentAt: string | null; createdAt: string }[];
        totalCampaigns: number;
        totalSmsSent: number;
        creditsUsed: number;
        creditsBalance: number;
      };
    },
  });

  const { data: marketingReport } = useQuery({
    queryKey: ["reports", "marketing", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/marketing?${params}`);
      return res.data as {
        referralConversions: number;
        totalReferrals: number;
        totalReferralPoints: number;
        promoCodes: { code: string; discountType: string; discountValue: number; uses: number }[];
        loyaltyPointsAwarded: number;
        loyaltyPointsRedeemed: number;
      };
    },
  });

  const { data: productsReport } = useQuery({
    queryKey: ["reports", "products", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/products?${params}`);
      return res.data as {
        products: { name: string; quantity: number; costCents: number; treatmentCount: number }[];
        totalProductCost: number;
      };
    },
  });

  const exportCsv = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => row[h]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <>
      <Header title="Reports" />
      <div className="p-6 space-y-6">
        {/* Date range */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-sm text-[var(--muted-foreground)]">to</span>
          <input
            type="date"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                setFrom(format(p.from(), "yyyy-MM-dd"));
                setTo(format(p.to(), "yyyy-MM-dd"));
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p>
            <p className="text-2xl font-bold">&pound;{((revenue?.totalRevenue ?? 0) / 100).toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Gross Profit</p>
            <p className="text-2xl font-bold">&pound;{((business?.grossProfitCents ?? 0) / 100).toFixed(2)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{business?.profitMarginPercent ?? 0}% margin</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Total Patients</p>
            <p className="text-2xl font-bold">{patients?.totalPatients ?? 0}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{patients?.newPatients ?? 0} new</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--muted-foreground)]">Retention Rate</p>
            <p className="text-2xl font-bold">{patients?.retentionRate ?? 0}%</p>
            <p className="text-xs text-[var(--muted-foreground)]">Avg {patients?.avgVisitsPerClient ?? 0} visits/client</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by treatment */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Revenue by Treatment</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportCsv(
                  (revenue?.byTreatment ?? []).map((t) => ({ Treatment: t.name, Revenue: (t.revenue / 100).toFixed(2), Bookings: t.count })),
                  "revenue-by-treatment"
                )}
              >
                Export CSV
              </Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(revenue?.byTreatment ?? []).map((t) => ({ ...t, revenue: t.revenue / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `£${Number(value).toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Treatment popularity */}
          <Card>
            <CardTitle>Treatment Popularity</CardTitle>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={treatments?.treatments ?? []}
                    dataKey="bookings"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {(treatments?.treatments ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue by practitioner */}
          <Card>
            <CardTitle>Revenue by Practitioner</CardTitle>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(revenue?.byPractitioner ?? []).map((p) => ({ ...p, revenue: p.revenue / 100 }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip formatter={(value) => `£${Number(value).toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Business summary */}
          <Card>
            <CardTitle>Business Summary</CardTitle>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Revenue</span>
                <span className="font-medium">&pound;{((business?.totalRevenueCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Product Costs</span>
                <span className="font-medium text-red-600">-&pound;{((business?.totalProductCostCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <hr className="border-[var(--border)]" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Gross Profit</span>
                <span className="font-bold text-green-600">&pound;{((business?.grossProfitCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Completed Appointments</span>
                <span>{business?.completedAppointments ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Avg Spend/Client</span>
                <span>&pound;{((patients?.avgSpendCents ?? 0) / 100).toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* SMS Campaign Reports */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>SMS Campaign Reports</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportCsv(
                (smsReport?.campaigns ?? []).map((c) => ({
                  Name: c.name,
                  Status: c.status,
                  Recipients: c.recipientCount,
                  Sent: c.sentCount ?? 0,
                  Date: c.sentAt || c.createdAt,
                })),
                "sms-campaigns"
              )}
            >
              Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Campaigns</p>
              <p className="text-lg font-bold">{smsReport?.totalCampaigns ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">SMS Sent</p>
              <p className="text-lg font-bold">{smsReport?.totalSmsSent ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Credits Used</p>
              <p className="text-lg font-bold">{smsReport?.creditsUsed ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Credits Balance</p>
              <p className="text-lg font-bold">{smsReport?.creditsBalance ?? 0}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(smsReport?.campaigns ?? []).filter((c) => c.status === "sent").map((c) => ({ name: c.name, sent: c.sentCount ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Marketing Reports */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Marketing Reports</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportCsv(
                (marketingReport?.promoCodes ?? []).map((p) => ({
                  Code: p.code,
                  Type: p.discountType,
                  Value: p.discountValue,
                  Uses: p.uses,
                })),
                "promo-usage"
              )}
            >
              Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Referral Conversions</p>
              <p className="text-lg font-bold">{marketingReport?.referralConversions ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Total Referrals</p>
              <p className="text-lg font-bold">{marketingReport?.totalReferrals ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Loyalty Awarded</p>
              <p className="text-lg font-bold">{marketingReport?.loyaltyPointsAwarded ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Loyalty Redeemed</p>
              <p className="text-lg font-bold">{marketingReport?.loyaltyPointsRedeemed ?? 0}</p>
            </div>
          </div>
          {(marketingReport?.promoCodes ?? []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Promo Code</th>
                    <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Type</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Value</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {(marketingReport?.promoCodes ?? []).map((p) => (
                    <tr key={p.code} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 px-3 font-mono font-bold">{p.code}</td>
                      <td className="py-2 px-3">{p.discountType}</td>
                      <td className="py-2 px-3 text-right">{p.discountType === "percentage" ? `${p.discountValue}%` : `£${(p.discountValue / 100).toFixed(2)}`}</td>
                      <td className="py-2 px-3 text-right">{p.uses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Product Usage Reports */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Product Usage Reports</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportCsv(
                (productsReport?.products ?? []).map((p) => ({
                  Product: p.name,
                  Quantity: p.quantity,
                  Cost: (p.costCents / 100).toFixed(2),
                  Treatments: p.treatmentCount,
                })),
                "product-usage"
              )}
            >
              Export CSV
            </Button>
          </div>
          <div className="rounded-lg bg-[var(--muted)] p-3 mb-4">
            <p className="text-xs text-[var(--muted-foreground)]">Total Product Cost</p>
            <p className="text-lg font-bold">&pound;{((productsReport?.totalProductCost ?? 0) / 100).toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(productsReport?.products ?? []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Product</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Qty</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--muted-foreground)]">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(productsReport?.products ?? []).map((p) => (
                    <tr key={p.name} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 px-3">{p.name}</td>
                      <td className="py-2 px-3 text-right">{p.quantity}</td>
                      <td className="py-2 px-3 text-right">&pound;{(p.costCents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
