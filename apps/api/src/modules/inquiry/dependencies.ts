import type {
  DeleteInquiryAttachment,
  DeleteInquiryRun,
  GetInquiryBudget,
  GetInquiryRun,
  InquiryAttachmentStorePort,
  InquiryJobPublisherPort,
  InquiryRunStorePort,
  InquiryRunSubscriptionsPort,
  InterpretInquiryAttachment,
  ListInquiryRuns,
  OrchestrationPort,
  RequestInquiryRun,
  StreamInquiryRun,
  TabularParserPort,
  UploadInquiryAttachment,
} from "@atlas/application";
import {
  DeleteInquiryAttachmentUseCase,
  DeleteInquiryRunUseCase,
  GetInquiryBudgetUseCase,
  GetInquiryRunUseCase,
  InterpretInquiryAttachmentUseCase,
  ListInquiryRunsUseCase,
  RequestInquiryRunUseCase,
  StreamInquiryRunUseCase,
  UploadInquiryAttachmentUseCase,
} from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";

export interface InquiryDeps {
  requestInquiryRun: RequestInquiryRun;
  getInquiryBudget: GetInquiryBudget;
  getInquiryRun: GetInquiryRun;
  streamInquiryRun: StreamInquiryRun;
  listInquiryRuns: ListInquiryRuns;
  deleteInquiryRun: DeleteInquiryRun;
  uploadInquiryAttachment: UploadInquiryAttachment;
  interpretInquiryAttachment: InterpretInquiryAttachment;
  deleteInquiryAttachment: DeleteInquiryAttachment;
}

export function makeInquiryDependencies(deps: {
  store: InquiryRunStorePort;
  subscriptions: InquiryRunSubscriptionsPort;
  attachmentStore: InquiryAttachmentStorePort;
  tabularParser: TabularParserPort;
  orchestration: OrchestrationPort;
  queue: InquiryJobPublisherPort;
  dailyCap: number;
  pinnedRunId: InquiryRunId | null;
}): InquiryDeps {
  return {
    requestInquiryRun: new RequestInquiryRunUseCase(
      deps.store,
      deps.dailyCap,
      deps.queue,
      deps.attachmentStore,
    ),
    getInquiryBudget: new GetInquiryBudgetUseCase(deps.store, deps.dailyCap),
    getInquiryRun: new GetInquiryRunUseCase(deps.store),
    streamInquiryRun: new StreamInquiryRunUseCase(deps.store, deps.subscriptions),
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
  };
}
