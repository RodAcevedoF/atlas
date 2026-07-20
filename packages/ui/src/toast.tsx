import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./button.tsx";
import { cn } from "./utils.ts";

export type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const TOAST_DURATION_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>,
    document.body,
  );
}

const VARIANT_DOT: Record<ToastVariant, string> = {
  default: "bg-muted-foreground",
  success: "bg-positive",
  error: "bg-destructive",
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <output
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-[12.5px] text-card-foreground shadow-lg transition-all duration-200",
        shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <span className={cn("h-1.5 w-1.5 flex-none rounded-full", VARIANT_DOT[item.variant])} />
      <span className="flex-1">{item.message}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="h-6 w-6 flex-none text-muted-foreground hover:text-foreground"
      >
        ✕
      </Button>
    </output>
  );
}
