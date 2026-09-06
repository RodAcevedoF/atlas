import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";
import type {
  InquiryRunStreamListeners,
  InquiryStreamRepository,
} from "../repositories/inquiry-stream-repository.ts";

export interface FakeStreamConnection {
  runId: string;
  isOpen: boolean;
  emit(run: InquiryRunRecord): void;
  drop(): void;
}

export interface FakeInquiryStreams {
  repository: InquiryStreamRepository;
  connections: FakeStreamConnection[];
}

export function inMemoryInquiryStreamRepository(): FakeInquiryStreams {
  const connections: FakeStreamConnection[] = [];

  const repository: InquiryStreamRepository = {
    openRunStream(runId: string, listeners: InquiryRunStreamListeners) {
      const connection: FakeStreamConnection = {
        runId,
        isOpen: true,
        emit(run) {
          if (connection.isOpen) listeners.onSnapshot(run);
        },
        drop() {
          if (!connection.isOpen) return;
          connection.isOpen = false;
          listeners.onDown();
        },
      };
      connections.push(connection);
      return {
        close() {
          connection.isOpen = false;
        },
      };
    },
  };

  return { repository, connections };
}
