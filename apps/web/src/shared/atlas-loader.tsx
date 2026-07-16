/** Full-screen brand splash shown while the session loads: the Atlas mark breathing over a soft glow. */
export function AtlasLoader() {
  return (
    <main className="flex h-screen items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className="atlas-glow absolute h-44 w-44 rounded-full bg-primary/25 blur-3xl"
        />
        <img src="/atlas_logo.svg" alt="Atlas" className="atlas-breathe relative h-28 w-auto" />
      </div>
    </main>
  );
}
