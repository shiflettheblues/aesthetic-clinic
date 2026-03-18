"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Upload, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

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

type Tab = "active" | "archived";

export default function PatientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("active");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await api.get(`/patients?${params}`);
      return res.data as { patients: Patient[]; total: number; page: number; limit: number };
    },
    enabled: tab === "active",
  });

  const { data: archivedData, isLoading: archivedLoading } = useQuery({
    queryKey: ["patients-archived", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await api.get(`/patients/archived?${params}`);
      return res.data as { patients: Patient[] };
    },
    enabled: tab === "archived",
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      await api.patch(`/patients/${id}/archive`, { archived });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients-archived"] });
    },
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const archivedPatients = archivedData?.patients ?? [];

  const activeColumns = [
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

  const archivedColumns = [
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
      key: "createdAt",
      header: "Joined",
      render: (row: Patient) => format(new Date(row.createdAt), "d MMM yyyy"),
    },
    {
      key: "actions",
      header: "",
      render: (row: Patient) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            archiveMutation.mutate({ id: row.id, archived: false });
          }}
        >
          <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore
        </Button>
      ),
    },
  ];

  return (
    <>
      <Header title="Patients" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Tab bar + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 border-b border-[var(--border)] sm:border-none">
            {(["active", "archived"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(""); setPage(1); }}
                className={clsx(
                  "px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors",
                  tab === t
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search patients..."
                className="w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push("/patients/import")}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
          </div>
        </div>

        {/* Active patients */}
        {tab === "active" && (
          <>
            <DataTable
              columns={activeColumns}
              data={patients}
              onRowClick={(row) => router.push(`/patients/${row.id}`)}
              emptyMessage={isLoading ? "Loading..." : "No patients found"}
            />
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
          </>
        )}

        {/* Archived patients */}
        {tab === "archived" && (
          <DataTable
            columns={archivedColumns}
            data={archivedPatients}
            emptyMessage={archivedLoading ? "Loading..." : "No archived patients"}
          />
        )}
      </div>
    </>
  );
}
