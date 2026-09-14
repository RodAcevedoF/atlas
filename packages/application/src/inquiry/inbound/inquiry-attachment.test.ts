import { describe, expect, test } from "bun:test";
import type { OrchestrationPort, TabularParserPort } from "@atlas/application";
import type { AttachmentInterpretation, InquiryAttachment, TableProfile } from "@atlas/domain";
import { makeInquiryAttachmentId, makeUserId } from "@atlas/domain";
import { InMemoryInquiryAttachmentStore } from "../../testing/inquiry-attachment-store.fake.ts";
import {
  INQUIRY_ATTACHMENT_DAILY_INTERPRETATION_CAP,
  INQUIRY_ATTACHMENT_DAILY_UPLOAD_CAP,
  InquiryAttachmentInterpretationCapError,
  InquiryAttachmentNotFoundError,
  InquiryAttachmentUploadCapError,
  InterpretInquiryAttachmentUseCase,
  InvalidInquiryAttachmentError,
  UploadInquiryAttachmentUseCase,
} from "./inquiry-attachment.ts";

const OWNER_ID = makeUserId("owner");
const OTHER_OWNER_ID = makeUserId("other-owner");
const PROFILE: TableProfile = {
  sheetCount: 1,
  sheetsTruncated: false,
  sheets: [
    {
      name: "CSV",
      rowCount: 1,
      columnCount: 1,
      columns: [{ name: "company", type: "string" }],
      representativeRows: [["Atlas"]],
      columnsTruncated: false,
      rowsSampled: 1,
    },
  ],
};
const INTERPRETATION: AttachmentInterpretation = {
  summary: "A company list",
  facts: ["Atlas appears in the sample"],
  entities: ["Atlas"],
  proposedQuestion: "What is Atlas announcing?",
  needsClarification: false,
  clarificationQuestion: null,
};

function parser(): TabularParserPort {
  return { parse: () => Promise.resolve(PROFILE) };
}

function orchestration(answer: AttachmentInterpretation): OrchestrationPort {
  return {
    run: () => Promise.resolve(answer as unknown as Record<string, unknown>),
    stream: () => {
      throw new Error("stream is outside the attachment interpretation path");
    },
    resume: () => Promise.reject(new Error("resume is outside the attachment interpretation path")),
  };
}

function imageOrchestration(answer: AttachmentInterpretation): OrchestrationPort {
  return {
    run: (request) => {
      if (
        request.input.kind !== "image" ||
        request.input.mediaType !== "image/png" ||
        request.input.bytesBase64 !== "iVBORw0KGgo="
      ) {
        throw new Error("the validated image did not reach the vision graph input");
      }
      return Promise.resolve(answer as unknown as Record<string, unknown>);
    },
    stream: () => {
      throw new Error("stream is outside the attachment interpretation path");
    },
    resume: () => Promise.reject(new Error("resume is outside the attachment interpretation path")),
  };
}

function attachment(overrides: Partial<InquiryAttachment> = {}): InquiryAttachment {
  return {
    id: makeInquiryAttachmentId(crypto.randomUUID()),
    ownerId: OWNER_ID,
    filename: "companies.csv",
    mediaType: "text/csv",
    profile: PROFILE,
    interpretation: null,
    interpretationCount: 0,
    runId: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe("uploading a tabular attachment", () => {
  test("stores an owned draft with a bounded deterministic profile", async () => {
    const store = new InMemoryInquiryAttachmentStore();
    const useCase = new UploadInquiryAttachmentUseCase(store, parser());

    const uploaded = await useCase.execute({
      ownerId: OWNER_ID,
      filename: "companies.csv",
      mediaType: "text/csv",
      bytes: new TextEncoder().encode("company\nAtlas"),
    });
    const stored = await store.findInquiryAttachmentById(uploaded.id);

    expect(stored).toMatchObject({
      ownerId: OWNER_ID,
      filename: "companies.csv",
      profile: PROFILE,
      runId: null,
    });
    expect(stored?.expiresAt?.getTime()).toBeGreaterThan(stored?.createdAt.getTime() ?? 0);
  });

  test("rejects legacy XLS instead of pretending the selected parser supports it", async () => {
    const useCase = new UploadInquiryAttachmentUseCase(
      new InMemoryInquiryAttachmentStore(),
      parser(),
    );

    const upload = useCase.execute({
      ownerId: OWNER_ID,
      filename: "companies.xls",
      mediaType: "application/vnd.ms-excel",
      bytes: new Uint8Array([1, 2, 3]),
    });

    await expect(upload).rejects.toBeInstanceOf(InvalidInquiryAttachmentError);
  });

  test("stores a validated image without pretending it has a table profile", async () => {
    const store = new InMemoryInquiryAttachmentStore();
    const useCase = new UploadInquiryAttachmentUseCase(store, parser());

    const uploaded = await useCase.execute({
      ownerId: OWNER_ID,
      filename: "chart.png",
      mediaType: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });

    expect((await store.findInquiryAttachmentById(uploaded.id))?.profile).toBeNull();
  });

  test("stops parsing and storage at the separate daily upload cap", async () => {
    const store = new InMemoryInquiryAttachmentStore();
    const useCase = new UploadInquiryAttachmentUseCase(store, parser());
    const input = {
      ownerId: OWNER_ID,
      filename: "companies.csv",
      mediaType: "text/csv",
      bytes: new TextEncoder().encode("company\nAtlas"),
    };
    await Promise.all(
      Array.from({ length: INQUIRY_ATTACHMENT_DAILY_UPLOAD_CAP }, () => useCase.execute(input)),
    );

    const upload = useCase.execute(input);

    await expect(upload).rejects.toBeInstanceOf(InquiryAttachmentUploadCapError);
  });
});

describe("interpreting an owned draft", () => {
  test("returns and retains the normalized interpretation", async () => {
    const draft = attachment();
    const store = new InMemoryInquiryAttachmentStore([draft]);
    const useCase = new InterpretInquiryAttachmentUseCase(store, orchestration(INTERPRETATION));

    const result = await useCase.execute({
      emailVerified: true,
      id: draft.id,
      ownerId: OWNER_ID,
      question: "",
    });
    const stored = await store.findInquiryAttachmentById(draft.id);

    expect(result).toEqual(INTERPRETATION);
    expect(stored?.interpretation).toEqual(INTERPRETATION);
    expect(stored?.interpretationCount).toBe(1);
  });

  test("does not reveal another user's attachment", async () => {
    const draft = attachment();
    const useCase = new InterpretInquiryAttachmentUseCase(
      new InMemoryInquiryAttachmentStore([draft]),
      orchestration(INTERPRETATION),
    );

    const interpretation = useCase.execute({
      id: draft.id,
      emailVerified: true,
      ownerId: OTHER_OWNER_ID,
      question: "",
    });

    await expect(interpretation).rejects.toBeInstanceOf(InquiryAttachmentNotFoundError);
  });

  test("sends owned image bytes to vision through the shared interpretation contract", async () => {
    const store = new InMemoryInquiryAttachmentStore();
    const draft = await new UploadInquiryAttachmentUseCase(store, parser()).execute({
      ownerId: OWNER_ID,
      filename: "chart.png",
      mediaType: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    const useCase = new InterpretInquiryAttachmentUseCase(
      store,
      imageOrchestration(INTERPRETATION),
    );

    const result = await useCase.execute({
      emailVerified: true,
      id: draft.id,
      ownerId: OWNER_ID,
      question: "",
    });

    expect(result).toEqual(INTERPRETATION);
  });

  test("stops draft LLM calls at their own daily cap", async () => {
    const used = Array.from({ length: INQUIRY_ATTACHMENT_DAILY_INTERPRETATION_CAP }, () =>
      attachment({ interpretation: INTERPRETATION, interpretationCount: 1 }),
    );
    const draft = attachment();
    const useCase = new InterpretInquiryAttachmentUseCase(
      new InMemoryInquiryAttachmentStore([...used, draft]),
      orchestration(INTERPRETATION),
    );

    const interpretation = useCase.execute({
      emailVerified: true,
      id: draft.id,
      ownerId: OWNER_ID,
      question: "",
    });

    await expect(interpretation).rejects.toBeInstanceOf(InquiryAttachmentInterpretationCapError);
  });
});

test("unverified owners cannot interpret an attachment", async () => {
  const draft = attachment();
  const store = new InMemoryInquiryAttachmentStore([draft]);
  const useCase = new InterpretInquiryAttachmentUseCase(store, orchestration(INTERPRETATION));

  const result = useCase.execute({
    emailVerified: false,
    id: draft.id,
    ownerId: OWNER_ID,
    question: "",
  });

  await expect(result).rejects.toThrow("Verify your email");
  expect((await store.findInquiryAttachmentById(draft.id))?.interpretation).toBeNull();
});

test("shared interpretation capacity rejects another owner before paid work", async () => {
  const draft = attachment();
  const store = new InMemoryInquiryAttachmentStore([draft]);
  const day = new Date().toISOString().slice(0, 10);
  const lease = await store.reserveSharedInterpretation(day, 100, 2, 150_000);
  if (!lease) throw new Error("Expected a lease");
  await store.reserveSharedInterpretation(day, 100, 2, 150_000);
  const useCase = new InterpretInquiryAttachmentUseCase(store, orchestration(INTERPRETATION));

  await expect(
    useCase.execute({ emailVerified: true, id: draft.id, ownerId: OWNER_ID, question: "" }),
  ).rejects.toBeInstanceOf(InquiryAttachmentInterpretationCapError);
  await store.releaseSharedInterpretation(lease.id);
  const result = await useCase.execute({
    emailVerified: true,
    id: draft.id,
    ownerId: OWNER_ID,
    question: "",
  });

  expect(result).toEqual(INTERPRETATION);
});

test("the shared daily interpretation budget survives released capacity", async () => {
  const draft = attachment();
  const store = new InMemoryInquiryAttachmentStore([draft]);
  const day = new Date().toISOString().slice(0, 10);
  for (let index = 0; index < 100; index += 1) {
    const lease = await store.reserveSharedInterpretation(day, 100, 2, 150_000);
    if (!lease) throw new Error("Expected a lease");
    await store.releaseSharedInterpretation(lease.id);
  }
  const useCase = new InterpretInquiryAttachmentUseCase(store, orchestration(INTERPRETATION));

  const result = useCase.execute({
    emailVerified: true,
    id: draft.id,
    ownerId: OWNER_ID,
    question: "",
  });

  await expect(result).rejects.toBeInstanceOf(InquiryAttachmentInterpretationCapError);
});

test("expired interpretation leases recover capacity without refunding usage or releasing a successor", async () => {
  let now = Date.now();
  const store = new InMemoryInquiryAttachmentStore([], () => now);
  const day = new Date(now).toISOString().slice(0, 10);
  const abandoned = await store.reserveSharedInterpretation(day, 2, 1, 100);
  if (!abandoned) throw new Error("Expected a lease");
  expect(await store.reserveSharedInterpretation(day, 2, 1, 100)).toBeNull();

  now += 100;
  const successor = await store.reserveSharedInterpretation(day, 2, 1, 100);
  expect(successor).not.toBeNull();
  await store.releaseSharedInterpretation(abandoned.id);
  await store.releaseSharedInterpretation(abandoned.id);

  expect(await store.reserveSharedInterpretation("next-day", 2, 1, 100)).toBeNull();
  now += 100;
  expect(await store.reserveSharedInterpretation(day, 2, 1, 100)).toBeNull();
  expect(await store.reserveSharedInterpretation("next-day", 2, 1, 100)).not.toBeNull();
});
