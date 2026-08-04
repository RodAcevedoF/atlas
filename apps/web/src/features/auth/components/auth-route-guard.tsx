import { AtlasLoader } from "@/shared/ui";
import { Button } from "@atlas/ui";
import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import type { AuthStatus } from "../auth-provider.tsx";
import { useAuth } from "../auth-provider.tsx";

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-[13px] text-muted-foreground">
      Couldn't reach the server.
      <Button size="sm" onClick={onRetry}>
        Retry
      </Button>
    </main>
  );
}

interface AuthRouteGuardProps extends PropsWithChildren {
  allow: AuthStatus;
  redirectTo: string;
}

/** Gates a route on a single required auth status, showing a loader/retry screen while status resolves. */
export function AuthRouteGuard({ allow, redirectTo, children }: AuthRouteGuardProps) {
  const { status, retry } = useAuth();

  if (status === "loading") return <AtlasLoader />;
  if (status === "error") return <ErrorScreen onRetry={retry} />;
  if (status !== allow) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
