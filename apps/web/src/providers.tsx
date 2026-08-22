import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpInquiryRepository } from "@/features/inquiry/repositories/http-inquiry-repository.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { HttpSavedReportsRepository } from "@/features/intelligence/repositories/http-saved-reports-repository.ts";
import type { SavedReportsRepository } from "@/features/intelligence/repositories/saved-reports-repository.ts";
import { HttpMarketRepository } from "@/features/world-awareness/repositories/http-market-repository.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());
  const [savedReportsRepository] = useState<SavedReportsRepository>(
    () => new HttpSavedReportsRepository(),
  );
  const [inquiryRepository] = useState<InquiryRepository>(() => new HttpInquiryRepository());
  const [store] = useState(() =>
    makeStore({ marketRepository, savedReportsRepository, inquiryRepository }),
  );

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}
