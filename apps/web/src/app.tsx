import { useAuth } from "@/features/auth/auth-provider.tsx";
import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AuthPage } from "@/features/auth/components/auth-page.tsx";
import { GuestRoute } from "@/features/auth/components/guest-route.tsx";
import { ProtectedRoute } from "@/features/auth/components/protected-route.tsx";
import { VerifyBanner } from "@/features/auth/components/verify-banner.tsx";
import { VerifyEmailView } from "@/features/auth/components/verify-email-view.tsx";
import { LandingPage } from "@/features/marketing/landing-page.tsx";
import { WorldAwarenessPage } from "@/features/world-awareness/world-awareness-page.tsx";
import { AtlasLoader } from "@/shared/atlas-loader.tsx";
import { useToast } from "@atlas/ui";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function RootIndex() {
  const { status } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (status === "authenticated") toast("You're already signed in.");
  }, [status, toast]);

  if (status === "loading") return <AtlasLoader />;
  if (status === "authenticated") return <Navigate to="/app" replace />;
  return <LandingPage />;
}

function DashboardShell() {
  return (
    <>
      <VerifyBanner />
      <WorldAwarenessPage />
      <AccountMenu />
    </>
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
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
