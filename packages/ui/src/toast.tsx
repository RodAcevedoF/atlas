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

export type ToastVariant = "default" | "info" | "success" | "warning" | "error";

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
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(23rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>,
    document.body,
  );
}

const VARIANT_ORB: Record<ToastVariant, string> = {
  default: "bg-muted-foreground ring-muted-foreground/15",
  info: "bg-info ring-info/15",
  success: "bg-positive ring-positive/15",
  warning: "bg-warning ring-warning/15",
  error: "bg-destructive ring-destructive/15",
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
        "pointer-events-auto flex items-start gap-3 rounded-2xl border border-border-strong bg-popover/95 py-3 pr-2.5 pl-4 text-[12.5px] text-popover-foreground shadow-2xl backdrop-blur-md transition-all duration-300 ease-out",
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.97] opacity-0",
      )}
    >
      <span
        className={cn(
          "mt-[5px] h-2.5 w-2.5 flex-none rounded-full ring-4",
          VARIANT_ORB[item.variant],
        )}
      />
      <span className="flex-1 leading-relaxed">{item.message}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-mt-0.5 h-6 w-6 flex-none rounded-lg text-muted-foreground hover:text-foreground"
      >
        ✕
      </Button>
    </output>
  );
}
