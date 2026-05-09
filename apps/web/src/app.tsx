import { Button } from "@atlas/ui";

export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Atlas</h1>
      <p style={{ color: "#666" }}>AI Codebase Onboarding</p>
      <Button>Get Started</Button>
    </main>
  );
}
