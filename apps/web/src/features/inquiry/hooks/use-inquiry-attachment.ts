import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import {
  deleteInquiryAttachment,
  interpretInquiryAttachment,
  uploadInquiryAttachment,
} from "../infra/store/inquiry.commands.ts";
import {
  type InquiryAttachmentState,
  selectInquiryAttachment,
} from "../infra/store/inquiry.slice.ts";
import type { AttachmentInterpretationRecord } from "../repositories/inquiry-repository.ts";

export interface UseInquiryAttachmentResult extends InquiryAttachmentState {
  upload: (file: File) => void;
  interpret: (question: string) => Promise<AttachmentInterpretationRecord | null>;
  remove: () => void;
}

export function useInquiryAttachment(): UseInquiryAttachmentResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInquiryAttachment);

  const upload = useCallback(
    (file: File) => {
      void dispatch(uploadInquiryAttachment(file));
    },
    [dispatch],
  );

  const interpret = useCallback(
    async (question: string) => {
      if (!state.id) return null;
      try {
        return await dispatch(interpretInquiryAttachment({ id: state.id, question })).unwrap();
      } catch {
        return null;
      }
    },
    [dispatch, state.id],
  );

  const remove = useCallback(() => {
    if (state.id) void dispatch(deleteInquiryAttachment(state.id));
  }, [dispatch, state.id]);

  return { ...state, upload, interpret, remove };
}
