import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpInquiryRepository } from "@/features/inquiry/repositories/http-inquiry-repository.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { HttpWorldRepository } from "@/features/world-awareness/repositories/http-world-repository.ts";
import type { WorldRepository } from "@/features/world-awareness/repositories/world-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

export function AppProviders({ children }: PropsWithChildren) {
  const [worldRepository] = useState<WorldRepository>(() => new HttpWorldRepository());
  const [inquiryRepository] = useState<InquiryRepository>(() => new HttpInquiryRepository());
  const [store] = useState(() => makeStore({ worldRepository, inquiryRepository }));

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}
