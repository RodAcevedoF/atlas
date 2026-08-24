import { afterEach, expect, test } from "bun:test";
import { inquiryRunRequested } from "@/features/inquiry/infra/store/inquiry.commands.ts";
import { buildInquiryRunSummary } from "@/features/inquiry/testing/inquiry-builder.ts";
import { inMemoryAskInquiryRepository } from "@/features/inquiry/testing/inquiry-repository.fake.ts";
import { makeStore } from "@/store/index.ts";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { useWorldAwareness } from "./use-world-awareness.ts";

afterEach(cleanup);

test("a run picked while an ask is in flight holds — the ask's own URL write must not snap it back", async () => {
  const asked = buildInquiryRunSummary({ id: "run-asked" });
  const picked = buildInquiryRunSummary({ id: "run-picked" });
  const store = makeStore({
    inquiryRepository: inMemoryAskInquiryRepository({ runs: [asked, picked] }),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  const { result } = renderHook(() => useWorldAwareness(), { wrapper });
  await waitFor(() => expect(result.current.runs).toHaveLength(2));
  act(() => {
    store.dispatch(inquiryRunRequested(asked.id));
  });

  act(() => {
    result.current.selectRun(picked.id);
  });

  expect(result.current.awareness.run?.id).toBe(picked.id);
});
