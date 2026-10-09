"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { FEATURES } from "@/config/features";
import { Spinner } from "@/components/ui";

type AuthRole = "admin" | "teacher" | "any-logged-in" | "guest-ok";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AuthRole;
}

export function ProtectedRoute({ children, requiredRole = "guest-ok" }: ProtectedRouteProps) {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;

  const isGuest = !user;

  // Logic sesuai Spesifikasi 3.1
  if (requiredRole === "guest-ok") {
    return <>{children}</>;
  }

  if (isGuest) {
    router.push("/login");
    return null;
  }

  if (requiredRole === "admin" && user.role !== "admin") {
    router.push("/lab");
    return null;
  }

  if (requiredRole === "teacher" && user.role !== "teacher" && user.role !== "admin") {
    router.push("/lab");
    return null;
  }

  if (requiredRole === "any-logged-in" && !user) {
    router.push("/login");
    return null;
  }

  return <>{children}</>;
}
