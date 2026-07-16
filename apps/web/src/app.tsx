import { useAuth } from "@/features/auth/auth-provider.tsx";
import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { AuthPage } from "@/features/auth/components/auth-page.tsx";
import { WorldAwarenessPage } from "@/features/world-awareness/world-awareness-page.tsx";
import { AtlasLoader } from "@/shared/atlas-loader.tsx";
import { Button } from "@atlas/ui";

export function App() {
  const { status, retry } = useAuth();

  if (status === "loading") return <AtlasLoader />;

  if (status === "error") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-[13px] text-muted-foreground">
        Couldn't reach the server.
        <Button size="sm" onClick={retry}>
          Retry
        </Button>
      </main>
    );
  }

  if (status === "anonymous") return <AuthPage />;

  return (
    <>
      <WorldAwarenessPage />
      <AccountMenu />
    </>
  );
}
