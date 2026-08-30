import { afterEach, expect, test } from "bun:test";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { askInquiryQuestion, inquiryRunRequested } from "../infra/store/inquiry.commands.ts";
import { inMemoryAskInquiryRepository } from "../testing/inquiry-repository.fake.ts";
import { InquiryRunCompletionToast } from "./inquiry-run-completion-toast.tsx";

afterEach(cleanup);

test("a finished run announces completion through the shared toast surface", async () => {
  const request = { question: "Where are wildfires burning?", refresh: false };
  const requestId = "request-1";
  const store = makeStore({ inquiryRepository: inMemoryAskInquiryRepository({ runs: [] }) });
  render(
    <Provider store={store}>
      <ToastProvider>
        <InquiryRunCompletionToast />
      </ToastProvider>
    </Provider>,
  );

  act(() => {
    store.dispatch(askInquiryQuestion.pending(requestId, request));
    store.dispatch(inquiryRunRequested("run-1"));
    store.dispatch(
      askInquiryQuestion.fulfilled(
        {
          status: "succeeded",
          isStillRunning: false,
          deduped: false,
          watchError: null,
        },
        requestId,
        request,
      ),
    );
  });

  expect(await screen.findByText("Research complete — the map is ready.")).toBeDefined();
});
