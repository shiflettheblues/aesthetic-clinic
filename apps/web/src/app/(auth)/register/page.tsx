"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await api.post("/auth/register", data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.push("/my-dashboard");
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
        <h1 className="mb-1 text-2xl font-bold text-center">Create account</h1>
        <p className="mb-6 text-sm text-[var(--muted-foreground)] text-center">Register as a new client</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="firstName" label="First name" error={errors.firstName?.message} {...register("firstName")} />
            <Input id="lastName" label="Last name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <Input id="email" label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input id="phone" label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} />
          <Input id="password" label="Password" type="password" error={errors.password?.message} {...register("password")} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

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
