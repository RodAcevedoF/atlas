import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import { askInquiryQuestion } from "../infra/store/inquiry.commands.ts";
import {
  type InquiryAskState,
  askErrorDismissed,
  selectInquiryAsk,
} from "../infra/store/inquiry.slice.ts";

export interface UseInquiryAskResult extends InquiryAskState {
  ask: (question: string, attachmentId?: string) => void;
  refresh: (question: string) => void;
  dismissError: () => void;
}

export function useInquiryAsk(): UseInquiryAskResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInquiryAsk);

  const ask = useCallback(
    (question: string, attachmentId?: string) => {
      void dispatch(askInquiryQuestion({ question, refresh: false, attachmentId }));
    },
    [dispatch],
  );

  const refresh = useCallback(
    (question: string) => {
      void dispatch(askInquiryQuestion({ question, refresh: true }));
    },
    [dispatch],
  );

  const dismissError = useCallback(() => {
    dispatch(askErrorDismissed());
  }, [dispatch]);

  return { ...state, ask, refresh, dismissError };
}
