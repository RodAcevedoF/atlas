import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadInquiryBudget } from "../infra/store/inquiry.commands.ts";
import { selectInquiryBudget } from "../infra/store/inquiry.slice.ts";
import type { InquiryBudgetRecord } from "../repositories/inquiry-repository.ts";

export function useInquiryBudget(): InquiryBudgetRecord | null {
  const dispatch = useAppDispatch();
  const budget = useAppSelector(selectInquiryBudget);

  useEffect(() => {
    void dispatch(loadInquiryBudget());
  }, [dispatch]);

  return budget;
}
