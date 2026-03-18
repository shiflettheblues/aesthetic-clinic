"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft, CheckCircle, AlertCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  _error?: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

  const colIndex = (names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const firstIdx = colIndex(["firstname", "first"]);
  const lastIdx = colIndex(["lastname", "last"]);
  const emailIdx = colIndex(["email"]);
  const phoneIdx = colIndex(["phone", "mobile", "tel"]);
  const dobIdx = colIndex(["dateofbirth", "dob", "birthday"]);

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const firstName = firstIdx >= 0 ? cols[firstIdx] ?? "" : "";
    const lastName = lastIdx >= 0 ? cols[lastIdx] ?? "" : "";
    const email = emailIdx >= 0 ? cols[emailIdx] ?? "" : "";
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : undefined;
    const dateOfBirth = dobIdx >= 0 ? cols[dobIdx] : undefined;

    if (!firstName || !lastName || !email) {
      return { firstName, lastName, email, phone, dateOfBirth, _error: "Missing required field" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { firstName, lastName, email, phone, dateOfBirth, _error: "Invalid email" };
    }
    return { firstName, lastName, email, phone, dateOfBirth };
  }).filter((r) => r.firstName || r.lastName || r.email);
}

export default function ImportPatientsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const valid = rows.filter((r) => !r._error);
      const res = await api.post("/patients/import", { patients: valid });
      return res.data as ImportResult;
    },
    onSuccess: (data) => setResult(data),
  });

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => !!r._error);

  return (
    <>
      <Header title="Import Patients" />
      <div className="p-4 sm:p-6 max-w-4xl space-y-4">
        <button
          onClick={() => router.push("/patients")}
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </button>

        {!result && (
          <>
            {/* Upload area */}
            <Card>
              <h3 className="font-semibold mb-1">Upload CSV File</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Required columns: <code className="bg-[var(--muted)] px-1 rounded">firstName</code>,{" "}
                <code className="bg-[var(--muted)] px-1 rounded">lastName</code>,{" "}
                <code className="bg-[var(--muted)] px-1 rounded">email</code>. Optional:{" "}
                <code className="bg-[var(--muted)] px-1 rounded">phone</code>,{" "}
                <code className="bg-[var(--muted)] px-1 rounded">dateOfBirth</code>.
                Imported patients receive a temporary password of{" "}
                <code className="bg-[var(--muted)] px-1 rounded">Welcome123!</code>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
              >
                <Upload className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
                {fileName ? (
                  <p className="text-sm font-medium">{fileName}</p>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Drop your CSV here or <span className="text-[var(--primary)] font-medium">click to browse</span>
                  </p>
                )}
              </div>
            </Card>

            {/* Preview */}
            {rows.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Preview</h3>
                  <div className="flex gap-3 text-sm">
                    <span className="text-green-600 font-medium">{validRows.length} valid</span>
                    {errorRows.length > 0 && (
                      <span className="text-red-600 font-medium">{errorRows.length} errors</span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3 text-[var(--muted-foreground)] font-medium">Name</th>
                        <th className="text-left py-2 px-3 text-[var(--muted-foreground)] font-medium">Email</th>
                        <th className="text-left py-2 px-3 text-[var(--muted-foreground)] font-medium">Phone</th>
                        <th className="text-left py-2 px-3 text-[var(--muted-foreground)] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 px-3">{row.firstName} {row.lastName}</td>
                          <td className="py-2 px-3 text-[var(--muted-foreground)]">{row.email}</td>
                          <td className="py-2 px-3 text-[var(--muted-foreground)]">{row.phone || "—"}</td>
                          <td className="py-2 px-3">
                            {row._error ? (
                              <span className="flex items-center gap-1 text-red-600 text-xs">
                                <X className="h-3.5 w-3.5" /> {row._error}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle className="h-3.5 w-3.5" /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 50 && (
                    <p className="text-xs text-[var(--muted-foreground)] p-3">Showing first 50 of {rows.length} rows</p>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={validRows.length === 0 || importMutation.isPending}
                  >
                    {importMutation.isPending
                      ? "Importing..."
                      : `Import ${validRows.length} Patient${validRows.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Result */}
        {result && (
          <Card>
            <div className="text-center py-4">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-4">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-6">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Created</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Skipped</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{result.errors.length}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Failed</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-red-700 flex items-center gap-1 mb-1">
                    <AlertCircle className="h-4 w-4" /> Failed emails:
                  </p>
                  <ul className="text-red-600 text-xs space-y-0.5">
                    {result.errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              <Button onClick={() => router.push("/patients")}>Go to Patients</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
