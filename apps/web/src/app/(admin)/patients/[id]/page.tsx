"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, Calendar, Upload, Trash2, FileText, ImageIcon, ClipboardList, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"appointments" | "medical" | "consent" | "images" | "forms" | "payments">("appointments");

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`);
      return res.data as {
        patient: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          phone?: string;
          dateOfBirth?: string;
          emergencyContactName?: string;
          emergencyContactPhone?: string;
          intakeFormCompleted: boolean;
          createdAt: string;
        };
        appointments: {
          id: string;
          startsAt: string;
          endsAt: string;
          status: string;
          treatment: { name: string; priceCents: number };
          practitioner: { firstName: string; lastName: string };
        }[];
        forms: { id: string; createdAt: string }[];
        payments: { id: string; amountCents: number; status: string; type: string; createdAt: string }[];
        medicalHistory?: {
          allergies: string;
          medications: string;
          conditions: string;
          notes: string;
          updatedAt?: string;
        };
        consentForms?: {
          id: string;
          treatmentName: string;
          signedAt: string;
          signedByName: string;
        }[];
        images?: {
          id: string;
          url: string;
          label: string;
          takenAt: string;
        }[];
      };
    },
  });

  const medicalHistoryMutation = useMutation({
    mutationFn: async (body: { allergies: string; medications: string; conditions: string; notes: string }) => {
      await api.put(`/patients/${id}/medical-history`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patient", id] }),
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await api.post(`/patients/${id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patient", id] }),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await api.delete(`/patients/${id}/images/${imageId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patient", id] }),
  });

  if (isLoading) {
    return (
      <>
        <Header title="Patient" />
        <div className="p-6 text-[var(--muted-foreground)]">Loading...</div>
      </>
    );
  }

  if (!data) return null;

  const { patient, appointments, forms, payments } = data;
  const totalSpent = payments
    .filter((p) => p.status === "CAPTURED")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const medicalHistory = data.medicalHistory ?? { allergies: "", medications: "", conditions: "", notes: "" };
  const consentForms = data.consentForms ?? [];
  const images = data.images ?? [];

  const tabs = [
    { id: "appointments" as const, label: "Appointments", count: appointments.length },
    { id: "medical" as const, label: "Medical History", count: null },
    { id: "consent" as const, label: "Consent Forms", count: consentForms.length },
    { id: "images" as const, label: "Images", count: images.length },
    { id: "forms" as const, label: "Forms", count: forms.length },
    { id: "payments" as const, label: "Payments", count: payments.length },
  ];

  return (
    <>
      <Header title="Patient Details" />
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Profile card */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{patient.firstName} {patient.lastName}</h2>
              <div className="mt-2 space-y-1 text-sm text-[var(--muted-foreground)]">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {patient.email}
                </div>
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {patient.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Member since {format(new Date(patient.createdAt), "d MMM yyyy")}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted-foreground)]">Total Spent</p>
              <p className="text-2xl font-bold">&pound;{(totalSpent / 100).toFixed(2)}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{appointments.length} appointments</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}{tab.count !== null && ` (${tab.count})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "appointments" && (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No appointments</p>
            ) : (
              appointments.map((apt) => (
                <Card key={apt.id} className="!p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{apt.treatment.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {apt.practitioner.firstName} {apt.practitioner.lastName} &mdash;{" "}
                        {format(new Date(apt.startsAt), "d MMM yyyy, HH:mm")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">&pound;{(apt.treatment.priceCents / 100).toFixed(2)}</span>
                      <Badge variant={statusVariant[apt.status]}>{apt.status}</Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "medical" && (
          <MedicalHistoryTab
            history={medicalHistory}
            isPending={medicalHistoryMutation.isPending}
            onSave={(values) => medicalHistoryMutation.mutate(values)}
          />
        )}

        {activeTab === "consent" && (
          <div className="space-y-3">
            {consentForms.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No consent forms signed</p>
            ) : (
              consentForms.map((form) => (
                <Card key={form.id} className="!p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm font-medium">{form.treatmentName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Signed by {form.signedByName}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(form.signedAt), "d MMM yyyy")}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "images" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted-foreground)]">Before &amp; after photos</p>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImageMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadImageMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const label = prompt("Label (e.g. 'Before - Lip Filler')") ?? "Untitled";
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("label", label);
                  uploadImageMutation.mutate(formData);
                  e.target.value = "";
                }}
              />
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No images uploaded</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-[var(--border)]">
                    <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5">
                      <p className="text-xs text-white truncate">{img.label}</p>
                      <p className="text-xs text-white/70">{format(new Date(img.takenAt), "d MMM yyyy")}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Delete this image?")) deleteImageMutation.mutate(img.id);
                      }}
                      className="absolute top-2 right-2 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "forms" && (
          <div className="space-y-3">
            {forms.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No forms submitted</p>
            ) : (
              forms.map((form) => (
                <Card key={form.id} className="!p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Intake Form</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(form.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No payments</p>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id} className="!p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">&pound;{(payment.amountCents / 100).toFixed(2)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{payment.type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {format(new Date(payment.createdAt), "d MMM yyyy")}
                      </span>
                      <Badge variant={payment.status === "CAPTURED" ? "success" : "warning"}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function MedicalHistoryTab({
  history,
  isPending,
  onSave,
}: {
  history: { allergies: string; medications: string; conditions: string; notes: string };
  isPending: boolean;
  onSave: (values: { allergies: string; medications: string; conditions: string; notes: string }) => void;
}) {
  const [allergies, setAllergies] = useState(history.allergies);
  const [medications, setMedications] = useState(history.medications);
  const [conditions, setConditions] = useState(history.conditions);
  const [notes, setNotes] = useState(history.notes);

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Allergies</label>
          <textarea
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            placeholder="e.g. Penicillin, Latex"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Current Medications</label>
          <textarea
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            rows={2}
            placeholder="e.g. Ibuprofen 200mg daily"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Medical Conditions</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            placeholder="e.g. Diabetes, Eczema"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes..."
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onSave({ allergies, medications, conditions, notes })}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save Medical History"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
