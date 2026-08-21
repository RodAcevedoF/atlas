import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import { askResearchQuestion } from "../infra/store/research.commands.ts";
import { type ResearchAskState, selectResearchAsk } from "../infra/store/research.slice.ts";

export interface UseResearchAskResult extends ResearchAskState {
  ask: (question: string) => void;
}

export function useResearchAsk(): UseResearchAskResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectResearchAsk);

  const ask = useCallback(
    (question: string) => {
      void dispatch(askResearchQuestion(question));
    },
    [dispatch],
  );

  return { ...state, ask };
}
