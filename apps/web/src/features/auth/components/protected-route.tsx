import type { PropsWithChildren } from "react";
import { AuthRouteGuard } from "./auth-route-guard.tsx";

export function ProtectedRoute({ children }: PropsWithChildren) {
  return (
    <AuthRouteGuard allow="authenticated" redirectTo="/login">
      {children}
    </AuthRouteGuard>
  );
}
