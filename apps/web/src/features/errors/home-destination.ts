import type { AuthStatus } from "@/features/auth/auth-provider.tsx";

export interface HomeDestination {
  to: string;
  label: string;
}

export function homeDestination(status: AuthStatus): HomeDestination {
  if (status === "authenticated") return { to: "/world", label: "Back to the map" };
  return { to: "/", label: "Back to Atlas" };
}
