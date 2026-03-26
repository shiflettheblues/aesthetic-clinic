"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const inviteSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterData = z.infer<typeof registerSchema>;
type InviteData = z.infer<typeof inviteSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");

  const inviteToken = searchParams.get("token");
  const prefillEmail = searchParams.get("email") ?? "";
  const isInviteFlow = !!inviteToken;

  // Invite flow — just set password
  const inviteForm = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
  });

  // Standard registration flow
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: prefillEmail,
    },
  });

  const onInviteSubmit = async (data: InviteData) => {
    setError("");
    try {
      const res = await api.post("/auth/complete-invite", {
        token: inviteToken,
        password: data.password,
      });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.push("/my-dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to set up account");
    }
  };

  const onRegisterSubmit = async (data: RegisterData) => {
    setError("");
    try {
      const res = await api.post("/auth/register", data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      const redirect = searchParams.get("redirect");
      router.push(redirect ?? "/my-dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--muted)]">
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-14">
          <Link href="/" className="text-lg font-bold text-[var(--primary)]">Dr Skin Central</Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-[var(--border)]">
          {isInviteFlow ? (
            <>
              <h1 className="mb-1 text-2xl font-bold text-center">Set Your Password</h1>
              <p className="mb-2 text-sm text-[var(--muted-foreground)] text-center">
                Complete your account setup for
              </p>
              <p className="mb-6 text-sm font-medium text-center text-[var(--primary)]">{prefillEmail}</p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                <Input
                  id="password"
                  label="Choose a password"
                  type="password"
                  error={inviteForm.formState.errors.password?.message}
                  {...inviteForm.register("password")}
                />
                <Button type="submit" className="w-full" disabled={inviteForm.formState.isSubmitting}>
                  {inviteForm.formState.isSubmitting ? "Setting up..." : "Create Account"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-center">Create account</h1>
              <p className="mb-6 text-sm text-[var(--muted-foreground)] text-center">Register as a new client</p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input id="firstName" label="First name" error={registerForm.formState.errors.firstName?.message} {...registerForm.register("firstName")} />
                  <Input id="lastName" label="Last name" error={registerForm.formState.errors.lastName?.message} {...registerForm.register("lastName")} />
                </div>
                <Input id="email" label="Email" type="email" error={registerForm.formState.errors.email?.message} {...registerForm.register("email")} />
                <Input id="phone" label="Phone" type="tel" error={registerForm.formState.errors.phone?.message} {...registerForm.register("phone")} />
                <Input id="password" label="Password" type="password" error={registerForm.formState.errors.password?.message} {...registerForm.register("password")} />
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--muted)]" />}>
      <RegisterForm />
    </Suspense>
  );
}
