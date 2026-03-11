"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  totalVisits: number;
  lastVisit: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await api.get(`/patients?${params}`);
      return res.data as { patients: Patient[]; total: number; page: number; limit: number };
    },
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: Patient) => (
        <span className="font-medium">{row.firstName} {row.lastName}</span>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "phone",
      header: "Phone",
      render: (row: Patient) => row.phone || "-",
    },
    {
      key: "totalVisits",
      header: "Visits",
      render: (row: Patient) => String(row.totalVisits),
    },
    {
      key: "lastVisit",
      header: "Last Visit",
      render: (row: Patient) => row.lastVisit ? format(new Date(row.lastVisit), "d MMM yyyy") : "Never",
    },
  ];

  return (
    <>
      <Header title="Patients" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={patients}
          onRowClick={(row) => router.push(`/patients/${row.id}`)}
          emptyMessage={isLoading ? "Loading..." : "No patients found"}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">{total} patients total</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm px-2">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
