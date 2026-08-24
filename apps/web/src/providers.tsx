import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpInquiryRepository } from "@/features/inquiry/repositories/http-inquiry-repository.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

export function AppProviders({ children }: PropsWithChildren) {
  const [inquiryRepository] = useState<InquiryRepository>(() => new HttpInquiryRepository());
  const [store] = useState(() => makeStore({ inquiryRepository }));

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}
