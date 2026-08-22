import { useAuth } from "@/features/auth/auth-provider.tsx";
import { AuthPage } from "@/features/auth/components/auth-page.tsx";
import { GuestRoute } from "@/features/auth/components/guest-route.tsx";
import { ProtectedRoute } from "@/features/auth/components/protected-route.tsx";
import { VerifyEmailCard } from "@/features/auth/components/verify-email-card.tsx";
import { VerifyEmailView } from "@/features/auth/components/verify-email-view.tsx";
import { IntelligencePage } from "@/features/intelligence/intelligence-page.tsx";
import { LandingPage } from "@/features/marketing/landing-page.tsx";
import { WorldAwarenessPage } from "@/features/world-awareness/world-awareness-page.tsx";
import { AtlasLoader } from "@/shared/ui";
import { useToast } from "@atlas/ui";
import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

function RootIndex() {
  const { status } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (status === "authenticated") toast("You're already signed in.");
  }, [status, toast]);

  if (status === "loading") return <AtlasLoader />;
  if (status === "authenticated") return <Navigate to="/world" replace />;
  return <LandingPage />;
}

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <VerifyEmailCard />
      <Outlet />
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootIndex />} />
      <Route path="/about" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <AuthPage mode="login" />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <AuthPage mode="register" />
          </GuestRoute>
        }
      />
      <Route path="/verify" element={<VerifyEmailView />} />
      <Route element={<ProtectedShell />}>
        <Route path="/world" element={<WorldAwarenessPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
