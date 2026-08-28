import { useAuth } from "@/features/auth/auth-provider.tsx";
import { ForbiddenView } from "@/features/errors";
import { hasAtLeastRole } from "@atlas/domain";
import type { PropsWithChildren } from "react";

export function AdminGate({ children }: PropsWithChildren) {
  const { user } = useAuth();
  if (!user || !hasAtLeastRole(user.role, "admin")) return <ForbiddenView />;
  return children;
}
