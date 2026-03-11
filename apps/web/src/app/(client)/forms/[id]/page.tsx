"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "date" | "signature";
  required?: boolean;
  options?: string[];
  conditionalOn?: string;
}

interface FormTemplate {
  id: string;
  name: string;
  formType: string;
  fields: FormField[];
  treatment?: { id: string; name: string };
}

export default function FormPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["form-template", id],
    queryFn: async () => {
      const res = await api.get(`/forms/templates/${id}`);
      return res.data as { template: FormTemplate };
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/forms/submissions", {
        templateId: id,
        appointmentId: appointmentId ?? undefined,
        responses,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return <div className="p-6 text-[var(--muted-foreground)]">Loading form...</div>;
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h2 className="text-xl font-bold">Form Submitted</h2>
        <p className="text-[var(--muted-foreground)]">Thank you for completing the form.</p>
        <Button onClick={() => router.push("/my-dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const template = data?.template;
  if (!template) return null;

  const fields = template.fields as FormField[];

  const setField = (key: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  // Check if conditional field should be visible
  const isVisible = (field: FormField) => {
    if (!field.conditionalOn) return true;
    return !!responses[field.conditionalOn];
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardTitle>{template.name}</CardTitle>
        {template.treatment && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">For: {template.treatment.name}</p>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
        >
          {fields.map((field) => {
            if (!isVisible(field)) return null;

            switch (field.type) {
              case "text":
              case "number":
              case "date":
                return (
                  <Input
                    key={field.key}
                    id={field.key}
                    label={field.label}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    required={field.required}
                    value={(responses[field.key] as string) ?? ""}
                    onChange={(e) => setField(field.key, e.target.value)}
                  />
                );
              case "textarea":
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-sm font-medium">{field.label}</label>
                    <textarea
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      rows={3}
                      required={field.required}
                      value={(responses[field.key] as string) ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                    />
                  </div>
                );
              case "boolean":
                return (
                  <label key={field.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                      checked={!!responses[field.key]}
                      onChange={(e) => setField(field.key, e.target.checked)}
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                );
              case "select":
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-sm font-medium">{field.label}</label>
                    <select
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      required={field.required}
                      value={(responses[field.key] as string) ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              default:
                return null;
            }
          })}

          {submitMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">Failed to submit form</div>
          )}

          <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? "Submitting..." : "Submit Form"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
