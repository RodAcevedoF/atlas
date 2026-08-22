import type {
  RegionTopicBreakdownRecord,
  WorldEventRecord,
  WorldRepository,
} from "../repositories/world-repository.ts";

export interface WorldRepositorySeed {
  worldTopics?: RegionTopicBreakdownRecord[];
  worldEvents?: WorldEventRecord[];
}

function outsideDashboardReadPath(method: string): never {
  throw new Error(`world-repository.fake: ${method} is outside the dashboard read path`);
}

export function inMemoryWorldRepository(seed: WorldRepositorySeed = {}): WorldRepository {
  const { worldTopics = [], worldEvents = [] } = seed;

  return {
    listWorldEvents(input = {}) {
      return Promise.resolve(
        worldEvents.filter((event) => input.topic === undefined || event.topic === input.topic),
      );
    },
    listWorldTopics: () => Promise.resolve(worldTopics),
    ingestNews: () => outsideDashboardReadPath("ingestNews"),
  };
}
