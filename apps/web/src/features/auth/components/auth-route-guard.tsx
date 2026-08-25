import { ErrorView } from "@/features/errors";
import { AtlasLoader } from "@/shared/ui";
import { Button } from "@atlas/ui";
import { SatelliteDish } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import type { AuthStatus } from "../auth-provider.tsx";
import { useAuth } from "../auth-provider.tsx";

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorView
      code="No connection"
      tone="negative"
      icon={SatelliteDish}
      reaching
      title="Can't reach Atlas"
      message="Your session can't be confirmed right now. Check your connection, then try again."
    >
      <Button size="sm" onClick={onRetry}>
        Retry
      </Button>
    </ErrorView>
  );
}

interface AuthRouteGuardProps extends PropsWithChildren {
  allow: AuthStatus;
  redirectTo: string;
}

export function AuthRouteGuard({ allow, redirectTo, children }: AuthRouteGuardProps) {
  const { status, retry } = useAuth();

  if (status === "loading") return <AtlasLoader />;
  if (status === "error") return <ErrorScreen onRetry={retry} />;
  if (status !== allow) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
