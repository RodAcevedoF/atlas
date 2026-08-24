import { useAppDispatch } from "@/store/hooks.ts";
import { useCallback } from "react";
import { deleteInquiryRun } from "../infra/store/inquiry.commands.ts";

export type DeleteInquiryRunHandler = (runId: string) => void;

export function useDeleteInquiryRun(): DeleteInquiryRunHandler {
  const dispatch = useAppDispatch();

  return useCallback(
    (runId: string) => {
      void dispatch(deleteInquiryRun(runId));
    },
    [dispatch],
  );
}
