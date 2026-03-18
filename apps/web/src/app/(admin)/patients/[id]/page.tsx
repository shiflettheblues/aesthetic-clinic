"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, Calendar, Upload, Trash2, FileText, ImageIcon, ClipboardList, AlertCircle, MapPin, X, Plus, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useState, useRef, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"appointments" | "medical" | "consent" | "images" | "facemap" | "forms" | "payments">("appointments");
  const [consentModal, setConsentModal] = useState(false);
  const [consentForm, setConsentForm] = useState({ treatmentName: "", content: "", signedByName: "" });
  const [sendFormModal, setSendFormModal] = useState(false);

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

  const createConsentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/patients/${id}/consent-forms`, consentForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setConsentModal(false);
      setConsentForm({ treatmentName: "", content: "", signedByName: "" });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ dataUrl, label }: { dataUrl: string; label: string }) => {
      await api.post(`/patients/${id}/images`, { dataUrl, label });
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
        <div className="p-4 sm:p-6 text-[var(--muted-foreground)]">Loading...</div>
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
    { id: "facemap" as const, label: "Face Map", count: null },
    { id: "forms" as const, label: "Forms", count: forms.length },
    { id: "payments" as const, label: "Payments", count: payments.length },
  ];

  return (
    <>
      <Header title="Patient Details" />
      <div className="p-4 sm:p-6 space-y-6">
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
            <div className="text-right space-y-2">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Spent</p>
                <p className="text-2xl font-bold">&pound;{(totalSpent / 100).toFixed(2)}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{appointments.length} appointments</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setSendFormModal(true)}>
                <Send className="h-3.5 w-3.5 mr-1" /> Send Form
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
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
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setConsentModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Consent Form
              </Button>
            </div>
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
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    if (dataUrl) uploadImageMutation.mutate({ dataUrl, label });
                  };
                  reader.readAsDataURL(file);
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

        {activeTab === "facemap" && <FaceMapTab clientId={patient.id} />}

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

      {sendFormModal && (
        <SendFormModal
          clientId={patient.id}
          clientEmail={patient.email}
          clientPhone={patient.phone}
          onClose={() => setSendFormModal(false)}
        />
      )}

      {consentModal && (
        <Modal open onClose={() => setConsentModal(false)} title="Add Consent Form">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Treatment Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="e.g. Lip Filler"
                value={consentForm.treatmentName}
                onChange={(e) => setConsentForm((f) => ({ ...f, treatmentName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Signed By (Patient Name)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="Full name as signed"
                value={consentForm.signedByName}
                onChange={(e) => setConsentForm((f) => ({ ...f, signedByName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Consent Content</label>
              <textarea
                rows={6}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono"
                placeholder="Paste the signed consent text..."
                value={consentForm.content}
                onChange={(e) => setConsentForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConsentModal(false)}>Cancel</Button>
              <Button
                onClick={() => createConsentMutation.mutate()}
                disabled={!consentForm.treatmentName || !consentForm.signedByName || !consentForm.content || createConsentMutation.isPending}
              >
                {createConsentMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  view: "front" | "side";
}

const ANNOTATION_COLORS = [
  { label: "Botox", value: "#3b82f6" },
  { label: "Filler", value: "#ec4899" },
  { label: "Polynucleotide", value: "#10b981" },
  { label: "Peel", value: "#f59e0b" },
  { label: "Filler Dissolver", value: "#8b5cf6" },
];

function FaceMapTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"front" | "side">("front");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["facemap", clientId],
    queryFn: async () => {
      const res = await api.get(`/face-maps/${clientId}`);
      return res.data as { faceMap: { annotations: Annotation[] } | null };
    },
  });

  useEffect(() => {
    if (data?.faceMap) setAnnotations(data.faceMap.annotations);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/face-maps/${clientId}`, { annotations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facemap", clientId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPendingLabel({ x, y });
    setLabelInput("");
  };

  const confirmAnnotation = () => {
    if (!pendingLabel || !labelInput.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), x: pendingLabel.x, y: pendingLabel.y, label: labelInput.trim(), color: selectedColor, view },
    ]);
    setPendingLabel(null);
    setLabelInput("");
  };

  const removeAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const visibleAnnotations = annotations.filter((a) => a.view === view);

  // Simple SVG face outlines
  const FrontFace = () => (
    <g>
      {/* Head */}
      <ellipse cx="200" cy="160" rx="130" ry="155" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
      {/* Ears */}
      <ellipse cx="72" cy="175" rx="18" ry="28" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      <ellipse cx="328" cy="175" rx="18" ry="28" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      {/* Eyes */}
      <ellipse cx="155" cy="155" rx="22" ry="14" fill="white" stroke="#374151" strokeWidth="1.5" />
      <ellipse cx="245" cy="155" rx="22" ry="14" fill="white" stroke="#374151" strokeWidth="1.5" />
      <circle cx="155" cy="155" r="8" fill="#374151" />
      <circle cx="245" cy="155" r="8" fill="#374151" />
      {/* Eyebrows */}
      <path d="M133 138 Q155 128 177 138" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M223 138 Q245 128 267 138" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <path d="M200 165 L188 205 Q200 212 212 205 L200 165" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      {/* Mouth */}
      <path d="M170 230 Q200 250 230 230" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M170 230 Q200 235 230 230" stroke="#fda4af" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Chin */}
      <path d="M130 270 Q200 320 270 270" stroke="#d97706" strokeWidth="1" fill="none" />
      {/* Hair line */}
      <path d="M80 120 Q200 50 320 120" stroke="#92400e" strokeWidth="3" fill="none" />
    </g>
  );

  const SideFace = () => (
    <g>
      {/* Head profile */}
      <path d="M200 30 Q310 40 330 130 Q350 200 300 280 Q250 340 180 320 Q130 300 120 250 Q80 180 110 100 Q140 40 200 30Z" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
      {/* Ear */}
      <ellipse cx="128" cy="185" rx="20" ry="30" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
      {/* Eye */}
      <ellipse cx="240" cy="155" rx="20" ry="12" fill="white" stroke="#374151" strokeWidth="1.5" />
      <circle cx="248" cy="155" r="7" fill="#374151" />
      {/* Eyebrow */}
      <path d="M220 138 Q245 128 268 135" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Nose profile */}
      <path d="M285 175 L310 200 L295 215" stroke="#d97706" strokeWidth="2" fill="#fde68a" />
      {/* Mouth profile */}
      <path d="M280 240 Q295 248 285 255" stroke="#374151" strokeWidth="2" fill="none" />
      {/* Chin */}
      <path d="M265 290 Q240 320 200 320" stroke="#d97706" strokeWidth="1.5" fill="none" />
      {/* Hair */}
      <path d="M200 30 Q280 20 330 80" stroke="#92400e" strokeWidth="3" fill="none" />
      {/* Neck */}
      <rect x="160" y="315" width="60" height="50" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
    </g>
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {(["front", "side"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${view === v ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
              >
                {v === "front" ? "Front View" : "Side View"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">Colour:</span>
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setSelectedColor(c.value)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${selectedColor === c.value ? "border-[var(--foreground)] scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mb-3 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Click on the face diagram to add an annotation
        </p>

        <div className="relative">
          <svg
            viewBox="0 0 400 370"
            className="w-full max-w-sm mx-auto border border-[var(--border)] rounded-xl bg-white cursor-crosshair"
            onClick={handleCanvasClick}
          >
            {view === "front" ? <FrontFace /> : <SideFace />}

            {/* Annotations */}
            {visibleAnnotations.map((ann) => (
              <g key={ann.id}>
                <circle cx={ann.x * 4} cy={ann.y * 3.7} r="8" fill={ann.color} opacity="0.85" />
                <text
                  x={ann.x * 4 + 11}
                  y={ann.y * 3.7 + 4}
                  fontSize="10"
                  fill={ann.color}
                  fontWeight="600"
                  style={{ userSelect: "none" }}
                >
                  {ann.label}
                </text>
              </g>
            ))}

            {/* Pending pin */}
            {pendingLabel && (
              <circle cx={pendingLabel.x * 4} cy={pendingLabel.y * 3.7} r="8" fill={selectedColor} opacity="0.5" strokeDasharray="3" stroke={selectedColor} strokeWidth="2" />
            )}
          </svg>

          {/* Label input popup */}
          {pendingLabel && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white border border-[var(--border)] rounded-xl shadow-lg p-4 w-56">
                <p className="text-sm font-medium mb-2">Add annotation</p>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Botox 4 units"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm mb-3 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmAnnotation(); if (e.key === "Escape") setPendingLabel(null); }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmAnnotation} disabled={!labelInput.trim()}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingLabel(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Annotation list */}
        {visibleAnnotations.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">{view === "front" ? "Front" : "Side"} annotations</p>
            {visibleAnnotations.map((ann) => (
              <div key={ann.id} className="flex items-center justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                  <span>{ann.label}</span>
                </div>
                <button onClick={() => removeAnnotation(ann.id)} className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--muted-foreground)]">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""} total</span>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">Saved!</span>}
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Face Map"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
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

function SendFormModal({
  clientId,
  clientEmail,
  clientPhone,
  onClose,
}: {
  clientId: string;
  clientEmail: string;
  clientPhone?: string;
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["form-templates"],
    queryFn: async () => {
      const res = await api.get("/forms/templates");
      return res.data as { templates: { id: string; name: string; type: string }[] };
    },
  });

  const templates = data?.templates ?? [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post("/forms/request", { clientId, templateId, channel });
    },
    onSuccess: () => setSent(true),
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send");
    },
  });

  return (
    <Modal open onClose={onClose} title="Send Form to Patient">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-green-600 font-medium">Form link sent successfully!</p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Form Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Send Via</label>
            <div className="flex gap-2">
              {(["email", "sms", "both"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={clsx(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    channel === c
                      ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)]"
                  )}
                >
                  {c === "email" ? "Email" : c === "sms" ? "SMS" : "Both"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {channel !== "sms" && `Email: ${clientEmail}`}
              {channel === "both" && " · "}
              {channel !== "email" && (clientPhone ? `SMS: ${clientPhone}` : "No phone number on file")}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={!templateId || sendMutation.isPending || (channel !== "email" && !clientPhone)}
            >
              {sendMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
