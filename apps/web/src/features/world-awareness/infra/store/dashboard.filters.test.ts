import { describe, expect, test } from "bun:test";
import type { LoadMarketDashboardInput } from "../../use-cases/load-market-dashboard.ts";
import {
  type DashboardFilters,
  initialDashboardFilters,
  toLoadMarketDashboardInput,
} from "./dashboard.filters.ts";

describe("toLoadMarketDashboardInput", () => {
  describe("cleared selections", () => {
    const clearedCases = [
      {
        name: "a cleared status leaves both the market and the region read unscoped",
        filters: { ...initialDashboardFilters, status: "" },
        read: (input: LoadMarketDashboardInput) => [
          input.markets?.status,
          input.regionSummary?.status,
        ],
      },
      {
        name: "a cleared category leaves both the market and the region read unscoped",
        filters: { ...initialDashboardFilters, category: "" },
        read: (input: LoadMarketDashboardInput) => [
          input.markets?.category,
          input.regionSummary?.category,
        ],
      },
      {
        name: "a cleared topic leaves both world reads unscoped",
        filters: { ...initialDashboardFilters, topic: "" },
        read: (input: LoadMarketDashboardInput) => [
          input.worldTopics?.topic,
          input.worldEvents?.topic,
        ],
      },
    ] satisfies Array<{
      name: string;
      filters: DashboardFilters;
      read: (input: LoadMarketDashboardInput) => Array<string | undefined>;
    }>;

    for (const { name, filters, read } of clearedCases) {
      test(name, () => {
        const input = toLoadMarketDashboardInput(filters);

        expect(read(input)).toEqual([undefined, undefined]);
      });
    }
  });

  describe("chosen selections", () => {
    test("scopes the market and region reads to the chosen status and category", () => {
      const filters: DashboardFilters = { category: "crypto", status: "closed", topic: "" };

      const input = toLoadMarketDashboardInput(filters);

      expect(input.markets).toMatchObject({ status: "closed", category: "crypto" });
      expect(input.regionSummary).toMatchObject({ status: "closed", category: "crypto" });
    });

    test("scopes both world reads to the chosen topic, keeping the map and the rail in step", () => {
      const filters: DashboardFilters = { category: "", status: "", topic: "conflict" };

      const input = toLoadMarketDashboardInput(filters);

      expect(input.worldTopics?.topic).toBe("conflict");
      expect(input.worldEvents?.topic).toBe("conflict");
    });
  });

  describe("page sizes", () => {
    test("asks for far more world events than the API's own default of 12", () => {
      const input = toLoadMarketDashboardInput(initialDashboardFilters);

      expect(input.worldEvents?.limit).toBe(60);
    });

    test("bounds every read, so no filter combination can pull an unbounded page", () => {
      const input = toLoadMarketDashboardInput(initialDashboardFilters);

      expect([
        input.markets?.limit,
        input.events?.limit,
        input.regionSummary?.limit,
        input.worldTopics?.limit,
        input.worldEvents?.limit,
      ]).toEqual([100, 6, 8, 8, 60]);
    });
  });
});

describe("initialDashboardFilters", () => {
  test("starts on active markets, so the dashboard opens on live prices", () => {
    expect(initialDashboardFilters).toEqual({ category: "", status: "active", topic: "" });
  });
});
