import type {
  ListWorldEventsInput,
  ListWorldTopicsInput,
  RegionTopicBreakdownRecord,
  Topic,
  WorldEventRecord,
  WorldRepository,
} from "../repositories/world-repository.ts";

export interface WorldDashboardData {
  worldTopics: RegionTopicBreakdownRecord[];
  worldEvents: WorldEventRecord[];
  worldSignals: number;
  activeTopics: number;
  regionsInFocus: number;
}

export interface LoadWorldDashboardInput {
  worldTopics?: ListWorldTopicsInput;
  worldEvents?: ListWorldEventsInput;
}

function countActiveTopics(worldTopics: RegionTopicBreakdownRecord[]): number {
  const topics = new Set<Topic>();
  for (const region of worldTopics) {
    for (const topic of region.topics) {
      if (topic.signalCount > 0) topics.add(topic.topic);
    }
  }
  return topics.size;
}

function countActiveRegions(worldTopics: RegionTopicBreakdownRecord[]): number {
  return worldTopics.filter((region) => region.signalCount > 0).length;
}

export interface LoadWorldDashboardDeps {
  worldRepository: WorldRepository;
}

export type LoadWorldDashboard = (input?: LoadWorldDashboardInput) => Promise<WorldDashboardData>;

export function makeLoadWorldDashboard({
  worldRepository,
}: LoadWorldDashboardDeps): LoadWorldDashboard {
  return async (input = {}) => {
    const [worldTopics, worldEvents] = await Promise.all([
      worldRepository.listWorldTopics(input.worldTopics),
      worldRepository.listWorldEvents(input.worldEvents),
    ]);

    return {
      worldTopics,
      worldEvents,
      worldSignals: worldTopics.reduce((sum, region) => sum + region.signalCount, 0),
      activeTopics: countActiveTopics(worldTopics),
      regionsInFocus: countActiveRegions(worldTopics),
    };
  };
}
