import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import { askInquiryQuestion } from "../infra/store/inquiry.commands.ts";
import { type InquiryAskState, selectInquiryAsk } from "../infra/store/inquiry.slice.ts";

export interface UseInquiryAskResult extends InquiryAskState {
  ask: (question: string) => void;
  refresh: (question: string) => void;
}

export function useInquiryAsk(): UseInquiryAskResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInquiryAsk);

  const ask = useCallback(
    (question: string) => {
      void dispatch(askInquiryQuestion({ question, refresh: false }));
    },
    [dispatch],
  );

  const refresh = useCallback(
    (question: string) => {
      void dispatch(askInquiryQuestion({ question, refresh: true }));
    },
    [dispatch],
  );

  return { ...state, ask, refresh };
}
