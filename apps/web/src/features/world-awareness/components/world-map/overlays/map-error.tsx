export function MapError({ message }: { message: string }) {
  return (
    <div className="max-w-md rounded-xl border border-destructive/40 bg-card/86 px-4 py-2 text-center text-[12.5px] text-destructive backdrop-blur-md">
      {message}
    </div>
  );
}
