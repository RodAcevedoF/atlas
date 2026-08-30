import { AdminProvider } from "@/features/admin/admin-provider.tsx";
import type { AdminRepository } from "@/features/admin/repositories/admin-repository.ts";
import { HttpAdminRepository } from "@/features/admin/repositories/http-admin-repository.ts";
import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { AppErrorBoundary } from "@/features/errors";
import { InquiryRunCompletionToast } from "@/features/inquiry/components/inquiry-run-completion-toast.tsx";
import { HttpInquiryRepository } from "@/features/inquiry/repositories/http-inquiry-repository.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

export function AppProviders({ children }: PropsWithChildren) {
  const [inquiryRepository] = useState<InquiryRepository>(() => new HttpInquiryRepository());
  const [adminRepository] = useState<AdminRepository>(() => new HttpAdminRepository());
  const [store] = useState(() => makeStore({ inquiryRepository }));

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <InquiryRunCompletionToast />
        <AuthProvider>
          <AdminProvider repository={adminRepository}>
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </AdminProvider>
        </AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}
