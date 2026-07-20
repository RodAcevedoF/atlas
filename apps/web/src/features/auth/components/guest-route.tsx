import type { PropsWithChildren } from "react";
import { AuthRouteGuard } from "./auth-route-guard.tsx";

export function GuestRoute({ children }: PropsWithChildren) {
  return (
    <AuthRouteGuard allow="anonymous" redirectTo="/app">
      {children}
    </AuthRouteGuard>
  );
}
