"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  lastVisit: string | null;
  totalVisits: number;
}

export default function PatientGroupsPage() {
  const [treatmentId, setTreatmentId] = useState("");
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [minVisits, setMinVisits] = useState("");

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const res = await api.get("/treatments?active=true");
      return res.data as { treatments: { id: string; name: string }[] };
    },
  });

  const params = new URLSearchParams();
  params.set("limit", "200");
  if (treatmentId) params.set("treatmentId", treatmentId);
  if (lastVisitFrom) params.set("lastVisitFrom", lastVisitFrom);
  if (lastVisitTo) params.set("lastVisitTo", lastVisitTo);
  if (minVisits) params.set("minVisits", minVisits);

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ["patients-group", treatmentId, lastVisitFrom, lastVisitTo, minVisits],
    queryFn: async () => {
      const res = await api.get(`/patients?${params.toString()}`);
      return res.data as { patients: Patient[]; total: number };
    },
  });

  const patients = patientsData?.patients ?? [];

  const exportCsv = () => {
    if (patients.length === 0) return;
    const csv = [
      "Name,Email,Phone,Last Visit,Total Visits",
      ...patients.map((p) =>
        `"${p.firstName} ${p.lastName}",${p.email},${p.phone ?? ""},${p.lastVisit ? format(new Date(p.lastVisit), "yyyy-MM-dd") : ""},${p.totalVisits}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient-group.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Filter Patients</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Treatment</label>
            <select
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={treatmentId}
              onChange={(e) => setTreatmentId(e.target.value)}
            >
              <option value="">All treatments</option>
              {(treatmentsData?.treatments ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Visit From</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={lastVisitFrom}
              onChange={(e) => setLastVisitFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Visit To</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={lastVisitTo}
              onChange={(e) => setLastVisitTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Visits</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={minVisits}
              onChange={(e) => setMinVisits(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {isLoading ? "Loading..." : `${patients.length} patients found`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={patients.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Name</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Email</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Phone</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Last Visit</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted-foreground)]">Visits</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">No patients match filters</td></tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-3 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-3 px-3">{p.email}</td>
                    <td className="py-3 px-3">{p.phone ?? "-"}</td>
                    <td className="py-3 px-3 text-[var(--muted-foreground)]">
                      {p.lastVisit ? format(new Date(p.lastVisit), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="py-3 px-3">{p.totalVisits}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
