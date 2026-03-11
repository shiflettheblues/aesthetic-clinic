"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"appointments" | "forms" | "payments">("appointments");

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
      };
    },
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

  const tabs = [
    { id: "appointments" as const, label: "Appointments", count: appointments.length },
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
              {tab.label} ({tab.count})
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
