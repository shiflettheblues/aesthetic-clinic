"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data as { user: Record<string, unknown> };
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: data?.user ? {
      firstName: (data.user.firstName as string) ?? "",
      lastName: (data.user.lastName as string) ?? "",
      phone: (data.user.phone as string) ?? "",
      dateOfBirth: data.user.dateOfBirth ? (data.user.dateOfBirth as string).split("T")[0] : "",
      emergencyContactName: (data.user.emergencyContactName as string) ?? "",
      emergencyContactPhone: (data.user.emergencyContactPhone as string) ?? "",
    } : undefined,
  });

  const onSubmit = async (formData: FormData) => {
    // Profile update endpoint would go here
    // For now, just show saved state
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card>
        <CardTitle>Personal Information</CardTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="firstName" label="First Name" error={errors.firstName?.message} {...register("firstName")} />
            <Input id="lastName" label="Last Name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <Input id="email" label="Email" value={user?.email ?? ""} disabled />
          <Input id="phone" label="Phone" type="tel" {...register("phone")} />
          <Input id="dateOfBirth" label="Date of Birth" type="date" {...register("dateOfBirth")} />

          <h3 className="text-sm font-semibold pt-2">Emergency Contact</h3>
          <Input id="emergencyContactName" label="Name" {...register("emergencyContactName")} />
          <Input id="emergencyContactPhone" label="Phone" type="tel" {...register("emergencyContactPhone")} />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
