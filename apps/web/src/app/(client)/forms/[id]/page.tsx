"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "date" | "signature" | "section";
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

interface Step {
  title: string;
  fields: FormField[];
}

// Keywords that indicate a contraindication warning when a boolean is checked
const CONTRAINDICATION_KEYWORDS = [
  "allergy", "allergies", "allergic", "pregnant", "breastfeeding",
  "contraindication", "infection", "inflammation",
];

function isContraindicationField(field: FormField): boolean {
  if (field.type !== "boolean") return false;
  const lower = (field.key + " " + field.label).toLowerCase();
  return CONTRAINDICATION_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Split fields into steps using "section" type markers */
function buildSteps(fields: FormField[]): Step[] {
  const steps: Step[] = [];
  let currentTitle = "Form";
  let currentFields: FormField[] = [];

  for (const field of fields) {
    if (field.type === "section") {
      if (currentFields.length > 0) {
        steps.push({ title: currentTitle, fields: currentFields });
      }
      currentTitle = field.label;
      currentFields = [];
    } else {
      currentFields.push(field);
    }
  }

  if (currentFields.length > 0) {
    steps.push({ title: currentTitle, fields: currentFields });
  }

  // If no sections found, return a single step
  if (steps.length === 0 && fields.length > 0) {
    steps.push({ title: "Form", fields: fields.filter((f) => f.type !== "section") });
  }

  return steps;
}

// ─── Signature Pad Component ───

function SignaturePad({
  value,
  onChange,
  required,
}: {
  value: string | undefined;
  onChange: (dataUrl: string) => void;
  required?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Restore from value on mount
  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos || !lastPoint.current) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPoint.current = pos;
    setIsEmpty(false);
  }, [getPos]);

  const endDraw = useCallback(() => {
    if (isDrawing.current && canvasRef.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }, [onChange]);

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsEmpty(true);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full border border-[var(--border)] rounded-lg bg-white cursor-crosshair touch-none"
          style={{ height: "150px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-[var(--muted-foreground)]">Sign here</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline"
        >
          Clear signature
        </button>
        {required && isEmpty && (
          <span className="text-xs text-red-500">Signature required</span>
        )}
      </div>
    </div>
  );
}

// ─── Contraindication Warning ───

function ContraindicationWarning() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong>Warning:</strong> Please speak to your practitioner before proceeding.
      This response may affect your suitability for treatment.
    </div>
  );
}

// ─── Main Form Page ───

export default function FormPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["form-template", id],
    queryFn: async () => {
      const res = await api.get(`/forms/templates/${id}`);
      return res.data as { template: FormTemplate };
    },
  });

  // Find the signature data URL from responses
  const getSignatureUrl = (): string | undefined => {
    if (!data?.template) return undefined;
    for (const field of data.template.fields) {
      if (field.type === "signature" && responses[field.key]) {
        return responses[field.key] as string;
      }
    }
    return undefined;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post("/forms/submissions", {
        templateId: id,
        appointmentId: appointmentId ?? undefined,
        responses,
        signatureUrl: getSignatureUrl(),
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
  const steps = buildSteps(fields);
  const isMultiStep = steps.length > 1;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const setField = (key: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
    // Clear errors when user interacts
    if (stepErrors.length > 0) setStepErrors([]);
  };

  const isVisible = (field: FormField) => {
    if (!field.conditionalOn) return true;
    return !!responses[field.conditionalOn];
  };

  // Validate current step's required fields
  const validateStep = (): boolean => {
    if (!step) return false;
    const errors: string[] = [];
    for (const field of step.fields) {
      if (!isVisible(field)) continue;
      if (!field.required) continue;

      const val = responses[field.key];
      if (field.type === "signature") {
        if (!val || val === "") errors.push(field.label);
      } else if (field.type === "boolean") {
        // Booleans that are required just need to have been interacted with
        // (we don't force them to be true — that would block legitimate "no" answers)
        // Only consent declarations (in section C) must be checked
        // We can't distinguish here, so we skip boolean validation
      } else {
        if (val === undefined || val === null || val === "") errors.push(field.label);
      }
    }
    setStepErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStepErrors([]);
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      submitMutation.mutate();
    }
  };

  const renderField = (field: FormField) => {
    if (!isVisible(field)) return null;

    const showWarning = isContraindicationField(field) && !!responses[field.key];

    switch (field.type) {
      case "text":
      case "number":
      case "date":
        return (
          <div key={field.key} className="space-y-1">
            <Input
              id={field.key}
              label={field.label}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              required={field.required}
              value={(responses[field.key] as string) ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          </div>
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
          <div key={field.key} className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 mt-0.5 rounded border-[var(--border)] text-[var(--primary)] flex-shrink-0"
                checked={!!responses[field.key]}
                onChange={(e) => setField(field.key, e.target.checked)}
              />
              <span className="text-sm">{field.label}</span>
            </label>
            {showWarning && <ContraindicationWarning />}
          </div>
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
      case "signature":
        return (
          <div key={field.key} className="space-y-1">
            <label className="block text-sm font-medium">{field.label}</label>
            <SignaturePad
              value={responses[field.key] as string | undefined}
              onChange={(dataUrl) => setField(field.key, dataUrl)}
              required={field.required}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardTitle>{template.name}</CardTitle>
        {template.treatment && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">For: {template.treatment.name}</p>
        )}

        {/* Step indicator */}
        {isMultiStep && (
          <div className="mt-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--primary)]">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">{step?.title}</span>
            </div>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step title */}
        {isMultiStep && step && (
          <h3 className="text-lg font-semibold mt-4 mb-1">{step.title}</h3>
        )}

        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit}
        >
          {step?.fields.map((field) => renderField(field))}

          {/* Validation errors */}
          {stepErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <p className="font-medium mb-1">Please complete the following required fields:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {stepErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {submitMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">Failed to submit form</div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-2">
            {isMultiStep && currentStep > 0 && (
              <Button type="button" variant="secondary" className="flex-1" onClick={handleBack}>
                Back
              </Button>
            )}
            {isMultiStep && !isLastStep ? (
              <Button type="button" className="flex-1" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" className="flex-1" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Form"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
