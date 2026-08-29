import type {
  DeleteInquiryAttachment,
  DeleteInquiryRun,
  ExecuteInquiryRun,
  GetInquiryBudget,
  GetInquiryRun,
  InquiryAttachmentStorePort,
  InquiryRunStorePort,
  InterpretInquiryAttachment,
  ListInquiryRuns,
  OrchestrationPort,
  RequestInquiryRun,
  TabularParserPort,
  UploadInquiryAttachment,
} from "@atlas/application";
import {
  DeleteInquiryAttachmentUseCase,
  DeleteInquiryRunUseCase,
  ExecuteInquiryRunUseCase,
  GetInquiryBudgetUseCase,
  GetInquiryRunUseCase,
  InterpretInquiryAttachmentUseCase,
  ListInquiryRunsUseCase,
  RequestInquiryRunUseCase,
  UploadInquiryAttachmentUseCase,
} from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";

export interface InquiryDeps {
  executeInquiryRun: ExecuteInquiryRun;
  requestInquiryRun: RequestInquiryRun;
  getInquiryBudget: GetInquiryBudget;
  getInquiryRun: GetInquiryRun;
  listInquiryRuns: ListInquiryRuns;
  deleteInquiryRun: DeleteInquiryRun;
  uploadInquiryAttachment: UploadInquiryAttachment;
  interpretInquiryAttachment: InterpretInquiryAttachment;
  deleteInquiryAttachment: DeleteInquiryAttachment;
  pollIntervalMs: number;
}

export function makeInquiryDependencies(deps: {
  store: InquiryRunStorePort;
  attachmentStore: InquiryAttachmentStorePort;
  tabularParser: TabularParserPort;
  orchestration: OrchestrationPort;
  retryAfterMs: number;
  runTimeoutMs: number;
  pollIntervalMs: number;
  dailyCap: number;
  pinnedRunId: InquiryRunId | null;
}): InquiryDeps {
  return {
    executeInquiryRun: new ExecuteInquiryRunUseCase(
      deps.store,
      deps.orchestration,
      deps.retryAfterMs,
      deps.runTimeoutMs,
    ),
    requestInquiryRun: new RequestInquiryRunUseCase(
      deps.store,
      deps.dailyCap,
      deps.attachmentStore,
    ),
    getInquiryBudget: new GetInquiryBudgetUseCase(deps.store, deps.dailyCap),
    getInquiryRun: new GetInquiryRunUseCase(deps.store),
    listInquiryRuns: new ListInquiryRunsUseCase(deps.store, deps.pinnedRunId),
    deleteInquiryRun: new DeleteInquiryRunUseCase(
      deps.store,
      deps.pinnedRunId,
      deps.attachmentStore,
    ),
    uploadInquiryAttachment: new UploadInquiryAttachmentUseCase(
      deps.attachmentStore,
      deps.tabularParser,
    ),
    interpretInquiryAttachment: new InterpretInquiryAttachmentUseCase(
      deps.attachmentStore,
      deps.orchestration,
    ),
    deleteInquiryAttachment: new DeleteInquiryAttachmentUseCase(deps.attachmentStore),
    pollIntervalMs: deps.pollIntervalMs,
  };
}
