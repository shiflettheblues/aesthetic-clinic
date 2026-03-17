"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Link from "next/link";
import clsx from "clsx";
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

const MAIN_TABS = ["Business", "Appointments", "Clients", "Financial", "Marketing", "Staff"] as const;
type MainTab = typeof MAIN_TABS[number];

function exportCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]!);
  const csv = [headers.join(","), ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

function SubTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-[var(--border)] mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={clsx(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            active === t
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-6 px-3 text-center text-[var(--muted-foreground)]">No data</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 whitespace-nowrap">{cell ?? "—"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- BUSINESS TAB ----
function BusinessTab({ from, to, params }: { from: string; to: string; params: string }) {
  const { data: revenue } = useQuery({
    queryKey: ["reports", "revenue", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/revenue?${params}`);
      return res.data as { totalRevenue: number; totalPayments: number; byTreatment: { name: string; revenue: number; count: number }[]; byPractitioner: { name: string; revenue: number; count: number }[] };
    },
  });
  const { data: patients } = useQuery({
    queryKey: ["reports", "patients", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/patients?${params}`);
      return res.data as { totalPatients: number; newPatients: number; uniqueClients: number; returningClients: number; retentionRate: number; avgVisitsPerClient: number; avgSpendCents: number };
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
      return res.data as { totalRevenueCents: number; totalProductCostCents: number; grossProfitCents: number; profitMarginPercent: number; completedAppointments: number };
    },
  });
  const { data: smsReport } = useQuery({
    queryKey: ["reports", "sms", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/sms?${params}`);
      return res.data as { campaigns: { id: string; name: string; status: string; recipientCount: number; sentCount: number | null; sentAt: string | null; createdAt: string }[]; totalCampaigns: number; totalSmsSent: number; creditsUsed: number; creditsBalance: number };
    },
  });
  const { data: marketingReport } = useQuery({
    queryKey: ["reports", "marketing", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/marketing?${params}`);
      return res.data as { referralConversions: number; totalReferrals: number; promoCodes: { code: string; discountType: string; discountValue: number; uses: number }[]; loyaltyPointsAwarded: number; loyaltyPointsRedeemed: number };
    },
  });
  const { data: productsReport } = useQuery({
    queryKey: ["reports", "products", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/products?${params}`);
      return res.data as { products: { name: string; quantity: number; costCents: number; treatmentCount: number }[]; totalProductCost: number };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p><p className="text-2xl font-bold">&pound;{((revenue?.totalRevenue ?? 0) / 100).toFixed(2)}</p></Card>
        <Card><p className="text-sm text-[var(--muted-foreground)]">Gross Profit</p><p className="text-2xl font-bold">&pound;{((business?.grossProfitCents ?? 0) / 100).toFixed(2)}</p><p className="text-xs text-[var(--muted-foreground)]">{business?.profitMarginPercent ?? 0}% margin</p></Card>
        <Card><p className="text-sm text-[var(--muted-foreground)]">Total Patients</p><p className="text-2xl font-bold">{patients?.totalPatients ?? 0}</p><p className="text-xs text-[var(--muted-foreground)]">{patients?.newPatients ?? 0} new</p></Card>
        <Card><p className="text-sm text-[var(--muted-foreground)]">Retention Rate</p><p className="text-2xl font-bold">{patients?.retentionRate ?? 0}%</p><p className="text-xs text-[var(--muted-foreground)]">Avg {patients?.avgVisitsPerClient ?? 0} visits/client</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Revenue by Treatment</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((revenue?.byTreatment ?? []).map((t) => ({ Treatment: t.name, Revenue: (t.revenue / 100).toFixed(2), Bookings: t.count })), "revenue-by-treatment")}>Export CSV</Button>
          </div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={(revenue?.byTreatment ?? []).map((t) => ({ ...t, revenue: t.revenue / 100 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v) => `£${Number(v).toFixed(2)}`} /><Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <CardTitle>Treatment Popularity</CardTitle>
          <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={treatments?.treatments ?? []} dataKey="bookings" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>{(treatments?.treatments ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <CardTitle>Revenue by Practitioner</CardTitle>
          <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={(revenue?.byPractitioner ?? []).map((p) => ({ ...p, revenue: p.revenue / 100 }))} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} /><Tooltip formatter={(v) => `£${Number(v).toFixed(2)}`} /><Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <CardTitle>Business Summary</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { label: "Revenue", value: `£${((business?.totalRevenueCents ?? 0) / 100).toFixed(2)}`, color: "" },
              { label: "Product Costs", value: `-£${((business?.totalProductCostCents ?? 0) / 100).toFixed(2)}`, color: "text-red-600" },
              { label: "Gross Profit", value: `£${((business?.grossProfitCents ?? 0) / 100).toFixed(2)}`, color: "text-green-600" },
              { label: "Completed Appointments", value: String(business?.completedAppointments ?? 0), color: "" },
              { label: "Avg Spend/Client", value: `£${((patients?.avgSpendCents ?? 0) / 100).toFixed(2)}`, color: "" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">{label}</span>
                <span className={clsx("font-medium", color)}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>SMS Campaigns</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => exportCsv((smsReport?.campaigns ?? []).map((c) => ({ Name: c.name, Status: c.status, Recipients: c.recipientCount, Sent: c.sentCount ?? 0, Date: c.sentAt || c.createdAt })), "sms-campaigns")}>Export CSV</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[{ label: "Campaigns", value: smsReport?.totalCampaigns ?? 0 }, { label: "SMS Sent", value: smsReport?.totalSmsSent ?? 0 }, { label: "Credits Used", value: smsReport?.creditsUsed ?? 0 }, { label: "Credits Balance", value: smsReport?.creditsBalance ?? 0 }].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-[var(--muted)] p-3"><p className="text-xs text-[var(--muted-foreground)]">{label}</p><p className="text-lg font-bold">{value}</p></div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Marketing</CardTitle>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[{ label: "Referral Conversions", value: marketingReport?.referralConversions ?? 0 }, { label: "Total Referrals", value: marketingReport?.totalReferrals ?? 0 }, { label: "Loyalty Awarded", value: marketingReport?.loyaltyPointsAwarded ?? 0 }, { label: "Loyalty Redeemed", value: marketingReport?.loyaltyPointsRedeemed ?? 0 }].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-[var(--muted)] p-3"><p className="text-xs text-[var(--muted-foreground)]">{label}</p><p className="text-lg font-bold">{value}</p></div>
          ))}
        </div>
        {(marketingReport?.promoCodes ?? []).length > 0 && (
          <Table
            headers={["Promo Code", "Type", "Value", "Uses"]}
            rows={(marketingReport?.promoCodes ?? []).map((p) => [p.code, p.discountType, p.discountType === "percentage" ? `${p.discountValue}%` : `£${(p.discountValue / 100).toFixed(2)}`, p.uses])}
          />
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Product Usage</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => exportCsv((productsReport?.products ?? []).map((p) => ({ Product: p.name, Qty: p.quantity, Cost: (p.costCents / 100).toFixed(2) })), "product-usage")}>Export CSV</Button>
        </div>
        <div className="rounded-lg bg-[var(--muted)] p-3 mb-4"><p className="text-xs text-[var(--muted-foreground)]">Total Product Cost</p><p className="text-lg font-bold">&pound;{((productsReport?.totalProductCost ?? 0) / 100).toFixed(2)}</p></div>
        <Table
          headers={["Product", "Qty Used", "Cost"]}
          rows={(productsReport?.products ?? []).map((p) => [p.name, p.quantity, `£${(p.costCents / 100).toFixed(2)}`])}
        />
      </Card>
    </div>
  );
}

// ---- APPOINTMENTS TAB ----
function AppointmentsTab({ from, to, params }: { from: string; to: string; params: string }) {
  const [sub, setSub] = useState("Day Sheet");
  const [practitionerId, setPractitionerId] = useState("");

  const { data: practitioners } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => { const res = await api.get("/practitioners"); return res.data as { practitioners: { id: string; firstName: string; lastName: string }[] }; },
  });

  const daysheetParams = `${params}${practitionerId ? `&practitionerId=${practitionerId}` : ""}`;
  const { data: daysheet } = useQuery({
    queryKey: ["reports", "daysheet", from, to, practitionerId],
    queryFn: async () => { const res = await api.get(`/reports/appointments/daysheet?${daysheetParams}`); return res.data as { appointments: { id: string; startsAt: string; status: string; client: { id: string; firstName: string; lastName: string }; practitioner: { firstName: string; lastName: string }; treatment: { name: string } }[] }; },
    enabled: sub === "Day Sheet",
  });
  const { data: cancelled } = useQuery({
    queryKey: ["reports", "cancelled", from, to],
    queryFn: async () => { const res = await api.get(`/reports/appointments/cancelled?${params}`); return res.data as { appointments: { id: string; startsAt: string; client: { id: string; firstName: string; lastName: string }; practitioner: { firstName: string; lastName: string }; treatment: { name: string } }[] }; },
    enabled: sub === "Cancelled",
  });
  const { data: noShows } = useQuery({
    queryKey: ["reports", "noshows", from, to],
    queryFn: async () => { const res = await api.get(`/reports/appointments/no-shows?${params}`); return res.data as { appointments: { id: string; startsAt: string; clientNoShowCount: number; client: { id: string; firstName: string; lastName: string }; practitioner: { firstName: string; lastName: string }; treatment: { name: string } }[] }; },
    enabled: sub === "No-Shows",
  });
  const { data: incomplete } = useQuery({
    queryKey: ["reports", "incomplete"],
    queryFn: async () => { const res = await api.get(`/reports/appointments/incomplete`); return res.data as { appointments: { id: string; startsAt: string; status: string; client: { id: string; firstName: string; lastName: string }; practitioner: { firstName: string; lastName: string }; treatment: { name: string } }[] }; },
    enabled: sub === "Incomplete",
  });

  return (
    <div>
      <SubTabs tabs={["Day Sheet", "Cancelled", "No-Shows", "Incomplete"]} active={sub} onChange={setSub} />

      {sub === "Day Sheet" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Day Sheet</CardTitle>
            <div className="flex gap-2 items-center">
              <select className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)}>
                <option value="">All Practitioners</option>
                {(practitioners?.practitioners ?? []).map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={() => exportCsv((daysheet?.appointments ?? []).map((a) => ({ Time: format(new Date(a.startsAt), "dd/MM/yyyy HH:mm"), Client: `${a.client.firstName} ${a.client.lastName}`, Treatment: a.treatment.name, Practitioner: `${a.practitioner.firstName} ${a.practitioner.lastName}`, Status: a.status })), "daysheet")}>Export CSV</Button>
            </div>
          </div>
          <Table
            headers={["Time", "Client", "Treatment", "Practitioner", "Status"]}
            rows={(daysheet?.appointments ?? []).map((a) => [format(new Date(a.startsAt), "dd/MM HH:mm"), `${a.client.firstName} ${a.client.lastName}`, a.treatment.name, `${a.practitioner.firstName} ${a.practitioner.lastName}`, a.status])}
          />
        </Card>
      )}

      {sub === "Cancelled" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Cancelled Appointments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((cancelled?.appointments ?? []).map((a) => ({ Date: format(new Date(a.startsAt), "dd/MM/yyyy"), Client: `${a.client.firstName} ${a.client.lastName}`, Treatment: a.treatment.name, Practitioner: `${a.practitioner.firstName} ${a.practitioner.lastName}` })), "cancelled")}>Export CSV</Button>
          </div>
          <Table
            headers={["Date", "Client", "Treatment", "Practitioner"]}
            rows={(cancelled?.appointments ?? []).map((a) => [format(new Date(a.startsAt), "dd/MM/yyyy HH:mm"), `${a.client.firstName} ${a.client.lastName}`, a.treatment.name, `${a.practitioner.firstName} ${a.practitioner.lastName}`])}
          />
        </Card>
      )}

      {sub === "No-Shows" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>No-Show Appointments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((noShows?.appointments ?? []).map((a) => ({ Date: format(new Date(a.startsAt), "dd/MM/yyyy"), Client: `${a.client.firstName} ${a.client.lastName}`, Treatment: a.treatment.name, TotalNoShows: a.clientNoShowCount })), "no-shows")}>Export CSV</Button>
          </div>
          <Table
            headers={["Date", "Client", "Treatment", "Total No-Shows"]}
            rows={(noShows?.appointments ?? []).map((a) => [format(new Date(a.startsAt), "dd/MM/yyyy HH:mm"), `${a.client.firstName} ${a.client.lastName}`, a.treatment.name, a.clientNoShowCount > 1 ? `⚠️ ${a.clientNoShowCount}` : String(a.clientNoShowCount)])}
          />
        </Card>
      )}

      {sub === "Incomplete" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Incomplete Appointments</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">Past appointments not marked as completed</p>
          </div>
          <Table
            headers={["Date", "Client", "Treatment", "Practitioner", "Status"]}
            rows={(incomplete?.appointments ?? []).map((a) => [format(new Date(a.startsAt), "dd/MM/yyyy HH:mm"), `${a.client.firstName} ${a.client.lastName}`, a.treatment.name, `${a.practitioner.firstName} ${a.practitioner.lastName}`, a.status])}
          />
        </Card>
      )}
    </div>
  );
}

// ---- CLIENTS TAB ----
function ClientsTab({ from, to, params }: { from: string; to: string; params: string }) {
  const [sub, setSub] = useState("By Spend");
  const [absentDate, setAbsentDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [treatmentId, setTreatmentId] = useState("");

  const { data: treatments } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => { const res = await api.get("/treatments"); return res.data as { treatments: { id: string; name: string }[] }; },
  });

  const { data: spend } = useQuery({
    queryKey: ["reports", "clients-spend"],
    queryFn: async () => { const res = await api.get("/reports/clients/spend"); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null; totalSpentCents: number; appointmentCount: number; lastVisit: string | null }[] }; },
    enabled: sub === "By Spend",
  });
  const { data: absent } = useQuery({
    queryKey: ["reports", "clients-absent", absentDate],
    queryFn: async () => { const res = await api.get(`/reports/clients/absent-since?date=${absentDate}`); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null; lastVisit: string | null }[] }; },
    enabled: sub === "Absent Since",
  });
  const { data: notRetained } = useQuery({
    queryKey: ["reports", "clients-not-retained", from, to],
    queryFn: async () => { const res = await api.get(`/reports/clients/not-retained?${params}`); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null }[]; total: number }; },
    enabled: sub === "Not Retained",
  });
  const { data: byService } = useQuery({
    queryKey: ["reports", "clients-by-service", treatmentId],
    queryFn: async () => { const res = await api.get(`/reports/clients/by-service?treatmentId=${treatmentId}`); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null }[] }; },
    enabled: sub === "By Service" && !!treatmentId,
  });

  return (
    <div>
      <SubTabs tabs={["By Spend", "Absent Since", "Not Retained", "By Service"]} active={sub} onChange={setSub} />

      {sub === "By Spend" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Client Spend</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((spend?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Email: c.email, Phone: c.phone ?? "", Spent: (c.totalSpentCents / 100).toFixed(2), Visits: c.appointmentCount, LastVisit: c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "" })), "client-spend")}>Export CSV</Button>
          </div>
          <Table
            headers={["Client", "Email", "Phone", "Total Spent", "Visits", "Last Visit"]}
            rows={(spend?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.email, c.phone ?? "—", `£${(c.totalSpentCents / 100).toFixed(2)}`, c.appointmentCount, c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "—"])}
          />
        </Card>
      )}

      {sub === "Absent Since" && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <CardTitle>Absent Since</CardTitle>
            <input type="date" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} />
            <Button variant="ghost" size="sm" onClick={() => exportCsv((absent?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Email: c.email, Phone: c.phone ?? "", LastVisit: c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "Never" })), "absent-clients")}>Export CSV</Button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{absent?.clients.length ?? 0} clients not seen since {absentDate}</p>
          <Table
            headers={["Client", "Email", "Phone", "Last Visit"]}
            rows={(absent?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.email, c.phone ?? "—", c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "Never"])}
          />
        </Card>
      )}

      {sub === "Not Retained" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Not Retained</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">Clients seen in period but not within 90 days after</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((notRetained?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Email: c.email, Phone: c.phone ?? "" })), "not-retained")}>Export CSV</Button>
          </div>
          <p className="text-sm font-medium mb-4">{notRetained?.total ?? 0} clients not retained</p>
          <Table
            headers={["Client", "Email", "Phone"]}
            rows={(notRetained?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.email, c.phone ?? "—"])}
          />
        </Card>
      )}

      {sub === "By Service" && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <CardTitle>By Service</CardTitle>
            <select className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
              <option value="">Select treatment...</option>
              {(treatments?.treatments ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {treatmentId && (
            <Table
              headers={["Client", "Email", "Phone"]}
              rows={(byService?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.email, c.phone ?? "—"])}
            />
          )}
          {!treatmentId && <p className="text-sm text-[var(--muted-foreground)]">Select a treatment to see clients</p>}
        </Card>
      )}
    </div>
  );
}

// ---- FINANCIAL TAB ----
function FinancialTab({ from, to, params }: { from: string; to: string; params: string }) {
  const [sub, setSub] = useState("Deposits");

  const { data: deposits } = useQuery({
    queryKey: ["reports", "deposits", from, to],
    queryFn: async () => { const res = await api.get(`/reports/financial/deposits?${params}`); return res.data as { appointments: { id: string; startsAt: string; depositAmountCents: number | null; client: { firstName: string; lastName: string }; treatment: { name: string }; practitioner: { firstName: string; lastName: string } }[] }; },
    enabled: sub === "Deposits",
  });
  const { data: voided } = useQuery({
    queryKey: ["reports", "voided", from, to],
    queryFn: async () => { const res = await api.get(`/reports/financial/voided?${params}`); return res.data as { payments: { id: string; amountCents: number; status: string; paymentMethod: string; createdAt: string; client: { firstName: string; lastName: string }; appointment: { treatment: { name: string } } | null }[] }; },
    enabled: sub === "Voided",
  });

  return (
    <div>
      <SubTabs tabs={["Deposits", "Voided"]} active={sub} onChange={setSub} />

      {sub === "Deposits" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Deposits</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((deposits?.appointments ?? []).map((a) => ({ Date: format(new Date(a.startsAt), "dd/MM/yyyy"), Client: `${a.client.firstName} ${a.client.lastName}`, Treatment: a.treatment.name, Deposit: ((a.depositAmountCents ?? 0) / 100).toFixed(2) })), "deposits")}>Export CSV</Button>
          </div>
          <Table
            headers={["Date", "Client", "Treatment", "Practitioner", "Deposit"]}
            rows={(deposits?.appointments ?? []).map((a) => [format(new Date(a.startsAt), "dd/MM/yyyy"), `${a.client.firstName} ${a.client.lastName}`, a.treatment.name, `${a.practitioner.firstName} ${a.practitioner.lastName}`, `£${((a.depositAmountCents ?? 0) / 100).toFixed(2)}`])}
          />
        </Card>
      )}

      {sub === "Voided" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Voided / Refunded Payments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((voided?.payments ?? []).map((p) => ({ Date: format(new Date(p.createdAt), "dd/MM/yyyy"), Client: `${p.client.firstName} ${p.client.lastName}`, Amount: (p.amountCents / 100).toFixed(2), Method: p.paymentMethod, Status: p.status })), "voided-payments")}>Export CSV</Button>
          </div>
          <Table
            headers={["Date", "Client", "Amount", "Method", "Status"]}
            rows={(voided?.payments ?? []).map((p) => [format(new Date(p.createdAt), "dd/MM/yyyy"), `${p.client.firstName} ${p.client.lastName}`, `£${(p.amountCents / 100).toFixed(2)}`, p.paymentMethod, p.status])}
          />
        </Card>
      )}
    </div>
  );
}

// ---- MARKETING TAB ----
function MarketingTab() {
  const [sub, setSub] = useState("Birthdays");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [treatmentId, setTreatmentId] = useState("");
  const [daysSince, setDaysSince] = useState("90");
  const [nonReturnDays, setNonReturnDays] = useState("60");

  const { data: treatments } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => { const res = await api.get("/treatments"); return res.data as { treatments: { id: string; name: string }[] }; },
  });

  const { data: birthdays } = useQuery({
    queryKey: ["reports", "birthdays", month],
    queryFn: async () => { const res = await api.get(`/reports/marketing/birthdays?month=${month}`); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null; dateOfBirth: string | null }[] }; },
    enabled: sub === "Birthdays",
  });
  const { data: overdue } = useQuery({
    queryKey: ["reports", "overdue", treatmentId, daysSince],
    queryFn: async () => {
      const q = treatmentId ? `treatmentId=${treatmentId}&daysSince=${daysSince}` : `daysSince=${daysSince}`;
      const res = await api.get(`/reports/marketing/overdue?${q}`);
      return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null; lastTreatment: string; lastVisit: string }[] };
    },
    enabled: sub === "Overdue",
  });
  const { data: nonReturning } = useQuery({
    queryKey: ["reports", "non-returning", nonReturnDays],
    queryFn: async () => { const res = await api.get(`/reports/marketing/non-returning?days=${nonReturnDays}`); return res.data as { clients: { id: string; firstName: string; lastName: string; email: string; phone: string | null; lastVisit: string | null }[] }; },
    enabled: sub === "Non-Returning",
  });

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div>
      <SubTabs tabs={["Birthdays", "Overdue", "Non-Returning"]} active={sub} onChange={setSub} />

      {sub === "Birthdays" && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <CardTitle>Birthday Clients</CardTitle>
            <select className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((birthdays?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Phone: c.phone ?? "", Email: c.email, DOB: c.dateOfBirth ? format(new Date(c.dateOfBirth), "dd/MM") : "" })), "birthdays")}>Export CSV</Button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{birthdays?.clients.length ?? 0} clients with birthdays in {MONTHS[parseInt(month) - 1]}</p>
          <Table
            headers={["Client", "Phone", "Email", "Birthday"]}
            rows={(birthdays?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.phone ?? "—", c.email, c.dateOfBirth ? format(new Date(c.dateOfBirth), "dd MMM") : "—"])}
          />
        </Card>
      )}

      {sub === "Overdue" && (
        <Card>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <CardTitle>Overdue Treatment</CardTitle>
            <select className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
              <option value="">All treatments</option>
              {(treatments?.treatments ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[var(--muted-foreground)]">No visit in</span>
              <input type="number" className="w-16 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm text-center" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} />
              <span className="text-sm text-[var(--muted-foreground)]">days</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((overdue?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Phone: c.phone ?? "", Email: c.email, LastTreatment: c.lastTreatment, LastVisit: format(new Date(c.lastVisit), "dd/MM/yyyy") })), "overdue")}>Export CSV</Button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{overdue?.clients.length ?? 0} clients overdue</p>
          <Table
            headers={["Client", "Phone", "Last Treatment", "Last Visit"]}
            rows={(overdue?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.phone ?? "—", c.lastTreatment, format(new Date(c.lastVisit), "dd/MM/yyyy")])}
          />
        </Card>
      )}

      {sub === "Non-Returning" && (
        <Card>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <CardTitle>Non-Returning Clients</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[var(--muted-foreground)]">No visit in</span>
              <input type="number" className="w-16 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm text-center" value={nonReturnDays} onChange={(e) => setNonReturnDays(e.target.value)} />
              <span className="text-sm text-[var(--muted-foreground)]">days</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((nonReturning?.clients ?? []).map((c) => ({ Name: `${c.firstName} ${c.lastName}`, Phone: c.phone ?? "", Email: c.email, LastVisit: c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "Never" })), "non-returning")}>Export CSV</Button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{nonReturning?.clients.length ?? 0} clients not seen in {nonReturnDays} days</p>
          <Table
            headers={["Client", "Phone", "Email", "Last Visit"]}
            rows={(nonReturning?.clients ?? []).map((c) => [`${c.firstName} ${c.lastName}`, c.phone ?? "—", c.email, c.lastVisit ? format(new Date(c.lastVisit), "dd/MM/yyyy") : "Never"])}
          />
        </Card>
      )}
    </div>
  );
}

// ---- STAFF TAB ----
function StaffTab({ from, to, params }: { from: string; to: string; params: string }) {
  const [sub, setSub] = useState("Summary");

  const { data: summary } = useQuery({
    queryKey: ["reports", "staff-summary", from, to],
    queryFn: async () => { const res = await api.get(`/reports/staff/summary?${params}`); return res.data as { staff: { id: string; name: string; appointments: number; revenueCents: number }[] }; },
    enabled: sub === "Summary",
  });
  const { data: targets } = useQuery({
    queryKey: ["reports", "staff-targets"],
    queryFn: async () => { const res = await api.get("/reports/staff/targets"); return res.data as { targets: { id: string; practitioner: string; type: string; period: string; goal: number; achieved: number; percent: number; startsAt: string; endsAt: string; isActive: boolean }[] }; },
    enabled: sub === "Targets",
  });

  return (
    <div>
      <SubTabs tabs={["Summary", "Targets"]} active={sub} onChange={setSub} />

      {sub === "Summary" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Staff Summary</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv((summary?.staff ?? []).map((s) => ({ Name: s.name, Appointments: s.appointments, Revenue: (s.revenueCents / 100).toFixed(2) })), "staff-summary")}>Export CSV</Button>
          </div>
          <Table
            headers={["Practitioner", "Appointments", "Revenue"]}
            rows={(summary?.staff ?? []).map((s) => [s.name, s.appointments, `£${(s.revenueCents / 100).toFixed(2)}`])}
          />
        </Card>
      )}

      {sub === "Targets" && (
        <Card>
          <CardTitle className="mb-4">Staff Targets</CardTitle>
          <div className="space-y-4">
            {(targets?.targets ?? []).length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No targets set</p>}
            {(targets?.targets ?? []).map((t) => (
              <div key={t.id} className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{t.practitioner}</span>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">{t.type} · {t.period} · {format(new Date(t.startsAt), "dd/MM/yy")}–{format(new Date(t.endsAt), "dd/MM/yy")}</span>
                  </div>
                  <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", t.isActive ? "bg-green-100 text-green-700" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}>{t.isActive ? "Active" : "Ended"}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--muted-foreground)]">{t.type === "REVENUE" ? `£${(t.achieved / 100).toFixed(0)} / £${(t.goal / 100).toFixed(0)}` : `${t.achieved} / ${t.goal} appts`}</span>
                  <span className="font-medium">{t.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className={clsx("h-full rounded-full transition-all", t.percent >= 100 ? "bg-green-500" : "bg-[var(--primary)]")} style={{ width: `${t.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- MAIN PAGE ----
export default function ReportsPage() {
  const [tab, setTab] = useState<MainTab>("Business");
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const params = `from=${from}T00:00:00Z&to=${to}T23:59:59Z`;

  return (
    <>
      <Header title="Reports" />
      {/* Date range */}
      <div className="border-b border-[var(--border)] bg-white px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-sm text-[var(--muted-foreground)]">to</span>
          <input type="date" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          {presets.map((p) => (
            <Button key={p.label} variant="secondary" size="sm" onClick={() => { setFrom(format(p.from(), "yyyy-MM-dd")); setTo(format(p.to(), "yyyy-MM-dd")); }}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      {/* Main tabs */}
      <div className="border-b border-[var(--border)] bg-white px-6">
        <div className="flex gap-1 overflow-x-auto">
          {MAIN_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                tab === t ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {tab === "Business" && <BusinessTab from={from} to={to} params={params} />}
        {tab === "Appointments" && <AppointmentsTab from={from} to={to} params={params} />}
        {tab === "Clients" && <ClientsTab from={from} to={to} params={params} />}
        {tab === "Financial" && <FinancialTab from={from} to={to} params={params} />}
        {tab === "Marketing" && <MarketingTab />}
        {tab === "Staff" && <StaffTab from={from} to={to} params={params} />}
      </div>
    </>
  );
}
